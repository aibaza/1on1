import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { isSeriesParticipant, isAdmin } from "@/lib/auth/rbac";
import { meetingSeries, sessions } from "@/lib/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

/**
 * POST /api/series/[id]/ensure-session
 *
 * Returns an existing scheduled/in_progress session, or creates a new
 * "scheduled" session so talking points can be added before the meeting starts.
 * Both manager and report can call this (unlike /start which is manager-only).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: seriesId } = await params;

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const seriesRows = await tx
          .select({
            id: meetingSeries.id,
            managerId: meetingSeries.managerId,
            reportId: meetingSeries.reportId,
            defaultTemplateId: meetingSeries.defaultTemplateId,
            nextSessionAt: meetingSeries.nextSessionAt,
          })
          .from(meetingSeries)
          .where(
            and(
              eq(meetingSeries.id, seriesId),
              eq(meetingSeries.tenantId, session.user.tenantId)
            )
          )
          .limit(1);

        if (seriesRows.length === 0) {
          return { error: "NOT_FOUND" as const };
        }

        const series = seriesRows[0];

        if (
          !isAdmin(session.user.level) &&
          !isSeriesParticipant(session.user.id, series)
        ) {
          return { error: "FORBIDDEN" as const };
        }

        // Check for existing open session
        const openSessions = await tx
          .select({ id: sessions.id, sessionNumber: sessions.sessionNumber })
          .from(sessions)
          .where(
            and(
              eq(sessions.seriesId, seriesId),
              inArray(sessions.status, ["scheduled", "in_progress"])
            )
          )
          .limit(1);

        if (openSessions.length > 0) {
          return { sessionId: openSessions[0].id, sessionNumber: openSessions[0].sessionNumber, created: false };
        }

        // Create a scheduled session
        const countResult = await tx
          .select({ count: sql<number>`cast(count(*) as int)` })
          .from(sessions)
          .where(eq(sessions.seriesId, seriesId));

        const sessionNumber = (countResult[0]?.count ?? 0) + 1;

        const [newSession] = await tx
          .insert(sessions)
          .values({
            seriesId,
            tenantId: session.user.tenantId,
            templateId: series.defaultTemplateId,
            sessionNumber,
            scheduledAt: series.nextSessionAt ?? new Date(),
            status: "scheduled",
          })
          .returning();

        return { sessionId: newSession.id, sessionNumber: newSession.sessionNumber, created: true };
      }
    );

    if ("error" in result) {
      switch (result.error) {
        case "NOT_FOUND":
          return NextResponse.json({ error: "Series not found" }, { status: 404 });
        case "FORBIDDEN":
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    console.error("Failed to ensure session:", error);
    return NextResponse.json({ error: "Failed to ensure session" }, { status: 500 });
  }
}
