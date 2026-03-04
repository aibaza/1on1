import { inngest } from "../client";
import { gatherSessionContext, type SessionContext } from "@/lib/ai/context";
import {
  generateSummary,
  generateManagerAddendum,
  generateNudges,
  generateActionSuggestions,
} from "@/lib/ai/service";
import { withTenantContext } from "@/lib/db/tenant-context";
import { logAuditEvent } from "@/lib/audit/log";
import { sessions, meetingSeries, aiNudges } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

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
 * Post-session AI pipeline.
 *
 * After a session is completed, this multi-step Inngest function:
 * 1. Sets AI status to "generating"
 * 2. Gathers session context (answers, notes, talking points, history)
 * 3. Generates AI summary (shared with both manager and report)
 * 4. Generates manager-only addendum (sentiment analysis, coaching suggestions)
 * 5. Stores summary + addendum on session
 * 6. Generates action item suggestions
 * 7. Stores suggestions on session
 * 8. Generates base nudges for next session
 * 9. Finalizes: sets AI status to "completed"
 *
 * Each step is independently retryable via Inngest step.run().
 */
export const postSessionPipeline = inngest.createFunction(
  {
    id: "post-session-ai-pipeline",
    retries: 3,
    concurrency: [{ scope: "fn", limit: 5 }],
    onFailure: async ({ event, error }) => {
      // If all retries exhausted, mark session AI status as "failed"
      const { sessionId, tenantId, managerId } = event.data.event.data;
      try {
        await withTenantContext(tenantId, managerId, async (tx) => {
          await tx
            .update(sessions)
            .set({ aiStatus: "failed", updatedAt: new Date() })
            .where(eq(sessions.id, sessionId));
        });
      } catch (err) {
        console.error("[AI Pipeline] Failed to set failed status:", err);
      }
      console.error(
        `[AI Pipeline] Pipeline failed for session ${sessionId}:`,
        error
      );
    },
  },
  { event: "session/completed" },
  async ({ event, step }) => {
    const { sessionId, seriesId, tenantId, managerId, reportId } = event.data;

    // Step 1: Set AI status to "generating"
    await step.run("set-ai-status", async () => {
      await withTenantContext(tenantId, managerId, async (tx) => {
        await tx
          .update(sessions)
          .set({ aiStatus: "generating", updatedAt: new Date() })
          .where(eq(sessions.id, sessionId));
      });
    });

    // Step 2: Gather session context
    const rawContext = await step.run("gather-context", async () => {
      return await gatherSessionContext({
        sessionId,
        seriesId,
        tenantId,
        managerId,
        reportId,
      });
    });

    // Rehydrate dates from JSON serialization
    const context = rehydrateContext(rawContext);

    // Step 3: Generate AI summary
    const summary = await step.run("generate-summary", async () => {
      return await generateSummary(context);
    });

    // Step 4: Generate manager addendum
    const addendum = await step.run("generate-addendum", async () => {
      return await generateManagerAddendum(context);
    });

    // Step 5: Store summary + addendum on session
    await step.run("store-summary", async () => {
      await withTenantContext(tenantId, managerId, async (tx) => {
        await tx
          .update(sessions)
          .set({
            aiSummary: summary,
            aiManagerAddendum: addendum,
            updatedAt: new Date(),
          })
          .where(eq(sessions.id, sessionId));
      });
    });

    // Step 6: Generate action suggestions
    const suggestions = await step.run("generate-suggestions", async () => {
      return await generateActionSuggestions(context, summary);
    });

    // Step 7: Store suggestions on session
    await step.run("store-suggestions", async () => {
      await withTenantContext(tenantId, managerId, async (tx) => {
        await tx
          .update(sessions)
          .set({
            aiSuggestions: suggestions,
            updatedAt: new Date(),
          })
          .where(eq(sessions.id, sessionId));
      });
    });

    // Step 8: Generate base nudges for next session
    await step.run("generate-base-nudges", async () => {
      const nudges = await generateNudges(context);

      // Fetch series to get nextSessionAt
      const seriesData = await withTenantContext(
        tenantId,
        managerId,
        async (tx) => {
          const [series] = await tx
            .select({ nextSessionAt: meetingSeries.nextSessionAt })
            .from(meetingSeries)
            .where(eq(meetingSeries.id, seriesId))
            .limit(1);
          return series;
        }
      );

      // Insert nudges into ai_nudge table
      await withTenantContext(tenantId, managerId, async (tx) => {
        for (const nudge of nudges.nudges) {
          await tx.insert(aiNudges).values({
            seriesId,
            tenantId,
            targetSessionAt: seriesData?.nextSessionAt ?? null,
            content: nudge.content,
            reason: nudge.reason,
            priority: nudge.priority,
            sourceSessionId: sessionId,
          });
        }
      });
    });

    // Step 9: Finalize -- set status to completed and audit log
    await step.run("finalize", async () => {
      const now = new Date();
      await withTenantContext(tenantId, managerId, async (tx) => {
        await tx
          .update(sessions)
          .set({
            aiStatus: "completed",
            aiCompletedAt: now,
            updatedAt: now,
          })
          .where(eq(sessions.id, sessionId));

        await logAuditEvent(tx, {
          tenantId,
          actorId: managerId,
          action: "ai_pipeline_completed",
          resourceType: "session",
          resourceId: sessionId,
          metadata: {
            summaryKeyTakeaways: summary.keyTakeaways.length,
            suggestionsCount: suggestions.suggestions.length,
          },
        });
      });
    });

    return { sessionId, status: "completed" };
  }
);

/**
 * AI retry handler.
 *
 * Re-runs the full AI pipeline for a session that previously failed.
 * Fetches the session to reconstruct the data needed for context gathering,
 * then runs the same steps as the main pipeline.
 */
export const aiRetryHandler = inngest.createFunction(
  {
    id: "ai-retry-handler",
    retries: 3,
    onFailure: async ({ event, error }) => {
      const { sessionId, tenantId, managerId } = event.data.event.data;
      try {
        await withTenantContext(tenantId, managerId, async (tx) => {
          await tx
            .update(sessions)
            .set({ aiStatus: "failed", updatedAt: new Date() })
            .where(eq(sessions.id, sessionId));
        });
      } catch (err) {
        console.error("[AI Retry] Failed to set failed status:", err);
      }
      console.error(
        `[AI Retry] Retry pipeline failed for session ${sessionId}:`,
        error
      );
    },
  },
  { event: "session/ai.retry" },
  async ({ event, step }) => {
    const { sessionId, tenantId, managerId } = event.data;

    // Fetch the session to get seriesId and reportId
    const sessionData = await step.run("fetch-session", async () => {
      return await withTenantContext(tenantId, managerId, async (tx) => {
        const [session] = await tx
          .select({
            seriesId: sessions.seriesId,
          })
          .from(sessions)
          .where(
            and(eq(sessions.id, sessionId), eq(sessions.tenantId, tenantId))
          )
          .limit(1);

        if (!session) {
          throw new Error(`Session ${sessionId} not found for retry`);
        }

        // Fetch the series for reportId
        const [series] = await tx
          .select({
            reportId: meetingSeries.reportId,
          })
          .from(meetingSeries)
          .where(eq(meetingSeries.id, session.seriesId))
          .limit(1);

        if (!series) {
          throw new Error(
            `Series not found for session ${sessionId} during retry`
          );
        }

        return {
          seriesId: session.seriesId,
          reportId: series.reportId,
        };
      });
    });

    const { seriesId, reportId } = sessionData;

    // Set status to generating
    await step.run("set-ai-status", async () => {
      await withTenantContext(tenantId, managerId, async (tx) => {
        await tx
          .update(sessions)
          .set({ aiStatus: "generating", updatedAt: new Date() })
          .where(eq(sessions.id, sessionId));
      });
    });

    // Gather context
    const rawContext = await step.run("gather-context", async () => {
      return await gatherSessionContext({
        sessionId,
        seriesId,
        tenantId,
        managerId,
        reportId,
      });
    });

    // Rehydrate dates from JSON serialization
    const context = rehydrateContext(rawContext);

    // Generate summary
    const summary = await step.run("generate-summary", async () => {
      return await generateSummary(context);
    });

    // Generate addendum
    const addendum = await step.run("generate-addendum", async () => {
      return await generateManagerAddendum(context);
    });

    // Store summary + addendum
    await step.run("store-summary", async () => {
      await withTenantContext(tenantId, managerId, async (tx) => {
        await tx
          .update(sessions)
          .set({
            aiSummary: summary,
            aiManagerAddendum: addendum,
            updatedAt: new Date(),
          })
          .where(eq(sessions.id, sessionId));
      });
    });

    // Generate suggestions
    const suggestions = await step.run("generate-suggestions", async () => {
      return await generateActionSuggestions(context, summary);
    });

    // Store suggestions
    await step.run("store-suggestions", async () => {
      await withTenantContext(tenantId, managerId, async (tx) => {
        await tx
          .update(sessions)
          .set({
            aiSuggestions: suggestions,
            updatedAt: new Date(),
          })
          .where(eq(sessions.id, sessionId));
      });
    });

    // Generate base nudges
    await step.run("generate-base-nudges", async () => {
      const nudges = await generateNudges(context);

      const seriesData = await withTenantContext(
        tenantId,
        managerId,
        async (tx) => {
          const [series] = await tx
            .select({ nextSessionAt: meetingSeries.nextSessionAt })
            .from(meetingSeries)
            .where(eq(meetingSeries.id, seriesId))
            .limit(1);
          return series;
        }
      );

      await withTenantContext(tenantId, managerId, async (tx) => {
        for (const nudge of nudges.nudges) {
          await tx.insert(aiNudges).values({
            seriesId,
            tenantId,
            targetSessionAt: seriesData?.nextSessionAt ?? null,
            content: nudge.content,
            reason: nudge.reason,
            priority: nudge.priority,
            sourceSessionId: sessionId,
          });
        }
      });
    });

    // Finalize
    await step.run("finalize", async () => {
      const now = new Date();
      await withTenantContext(tenantId, managerId, async (tx) => {
        await tx
          .update(sessions)
          .set({
            aiStatus: "completed",
            aiCompletedAt: now,
            updatedAt: now,
          })
          .where(eq(sessions.id, sessionId));

        await logAuditEvent(tx, {
          tenantId,
          actorId: managerId,
          action: "ai_pipeline_retried",
          resourceType: "session",
          resourceId: sessionId,
          metadata: {
            summaryKeyTakeaways: summary.keyTakeaways.length,
            suggestionsCount: suggestions.suggestions.length,
          },
        });
      });
    });

    return { sessionId, status: "completed" };
  }
);
