import { inngest } from "../client";
import {
  gatherSessionContext,
  type SessionContext,
} from "@/lib/ai/context";
import { generateNudges } from "@/lib/ai/service";
import { adminDb } from "@/lib/db";
import { withTenantContext } from "@/lib/db/tenant-context";
import { meetingSeries, sessions, aiNudges } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

/**
 * Inngest serializes step.run() return values as JSON, converting Date objects
 * to ISO strings. This rehydrates the SessionContext with proper Date objects.
 */
function rehydrateContext(raw: unknown): SessionContext {
  const ctx = raw as Record<string, unknown>;
  return {
    ...ctx,
    scheduledAt: new Date(ctx.scheduledAt as string),
    previousSessions: (
      ctx.previousSessions as Array<Record<string, unknown>>
    ).map((ps) => ({
      ...ps,
      scheduledAt: new Date(ps.scheduledAt as string),
      sessionNumber: ps.sessionNumber as number,
      sessionScore: ps.sessionScore as string | null,
      answers: ps.answers as SessionContext["answers"],
    })),
  } as SessionContext;
}

/**
 * Pre-session nudge refresh cron.
 *
 * Runs every 6 hours. Finds all active series with nextSessionAt within
 * the next 24 hours, then fires a "session/nudges.refresh" event for
 * each series that needs fresh nudges.
 *
 * Uses adminDb for the cross-tenant query (must scan all tenants).
 */
export const preSessionNudgeRefresh = inngest.createFunction(
  { id: "pre-session-nudge-refresh", retries: 2 },
  { cron: "0 */6 * * *" },
  async ({ step }) => {
    // Step 1: Find all series with sessions in the next 24 hours
    const seriesToRefresh = await step.run(
      "find-upcoming-sessions",
      async () => {
        const now = new Date();
        const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const upcoming = await adminDb
          .select({
            id: meetingSeries.id,
            tenantId: meetingSeries.tenantId,
            managerId: meetingSeries.managerId,
            reportId: meetingSeries.reportId,
            nextSessionAt: meetingSeries.nextSessionAt,
          })
          .from(meetingSeries)
          .where(
            and(
              eq(meetingSeries.status, "active"),
              gte(meetingSeries.nextSessionAt, now),
              lte(meetingSeries.nextSessionAt, in24h)
            )
          );

        return upcoming.map((s) => ({
          seriesId: s.id,
          tenantId: s.tenantId,
          managerId: s.managerId,
          reportId: s.reportId,
          nextSessionAt: s.nextSessionAt?.toISOString() ?? "",
        }));
      }
    );

    // Step 2: Fire refresh events for each series
    if (seriesToRefresh.length > 0) {
      await step.run("fire-refresh-events", async () => {
        await inngest.send(
          seriesToRefresh.map((s) => ({
            name: "session/nudges.refresh" as const,
            data: {
              seriesId: s.seriesId,
              tenantId: s.tenantId,
              managerId: s.managerId,
              reportId: s.reportId,
              nextSessionAt: s.nextSessionAt,
            },
          }))
        );
      });
    }

    return {
      refreshed: seriesToRefresh.length,
      timestamp: new Date().toISOString(),
    };
  }
);

/**
 * Individual nudge refresh handler.
 *
 * Triggered by "session/nudges.refresh" events (from cron or post-session).
 * Gathers context from the most recent completed session in the series,
 * generates fresh nudges, and replaces non-dismissed nudges.
 */
export const nudgeRefreshHandler = inngest.createFunction(
  { id: "nudge-refresh-single", retries: 3 },
  { event: "session/nudges.refresh" },
  async ({ event, step }) => {
    const { seriesId, tenantId, managerId, reportId, nextSessionAt } =
      event.data;

    // Step 1: Find the most recent completed session in this series
    const lastSession = await step.run(
      "find-last-completed-session",
      async () => {
        return await withTenantContext(tenantId, managerId, async (tx) => {
          const [session] = await tx
            .select({
              id: sessions.id,
              seriesId: sessions.seriesId,
            })
            .from(sessions)
            .where(
              and(
                eq(sessions.seriesId, seriesId),
                eq(sessions.status, "completed")
              )
            )
            .orderBy(desc(sessions.completedAt))
            .limit(1);

          return session ?? null;
        });
      }
    );

    // If no prior completed session exists, skip -- no data to base nudges on
    if (!lastSession) {
      return { seriesId, status: "skipped", reason: "no-completed-sessions" };
    }

    // Step 2: Gather context from the last completed session
    const rawContext = await step.run("gather-context", async () => {
      return await gatherSessionContext({
        sessionId: lastSession.id,
        seriesId,
        tenantId,
        managerId,
        reportId,
      });
    });

    // Rehydrate dates from JSON serialization
    const context = rehydrateContext(rawContext);

    // Step 3: Generate fresh nudges
    const nudges = await step.run("generate-nudges", async () => {
      return await generateNudges(context);
    });

    // Step 4: Replace non-dismissed nudges and insert fresh ones
    await step.run("store-nudges", async () => {
      await withTenantContext(tenantId, managerId, async (tx) => {
        // Delete existing non-dismissed nudges for this series
        // Preserves any nudges the manager has already dismissed
        const existing = await tx
          .select({ id: aiNudges.id })
          .from(aiNudges)
          .where(
            and(
              eq(aiNudges.seriesId, seriesId),
              eq(aiNudges.isDismissed, false)
            )
          );

        for (const nudge of existing) {
          await tx.delete(aiNudges).where(eq(aiNudges.id, nudge.id));
        }

        // Insert new nudges with refreshedAt timestamp
        const targetDate = nextSessionAt ? new Date(nextSessionAt) : null;
        for (const nudge of nudges.nudges) {
          await tx.insert(aiNudges).values({
            seriesId,
            tenantId,
            targetSessionAt: targetDate,
            content: nudge.content,
            reason: nudge.reason,
            priority: nudge.priority,
            sourceSessionId: lastSession.id,
            refreshedAt: new Date(),
          });
        }
      });
    });

    return {
      seriesId,
      status: "refreshed",
      nudgeCount: nudges.nudges.length,
    };
  }
);
