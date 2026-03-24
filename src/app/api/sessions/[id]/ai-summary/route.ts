import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { isSeriesParticipant, isAdmin } from "@/lib/auth/rbac";
import { sessions, meetingSeries } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/** If a session has been in "generating" or "pending" status for longer than this, it's stuck. */
const STUCK_MS = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/sessions/[id]/ai-summary
 *
 * Returns the AI summary status and content for a session.
 * Used for polling from the client while AI is generating.
 *
 * The manager-only addendum is ONLY returned if the current user
 * is the manager on the series.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: sessionId } = await params;

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Fetch the session AI columns
        const [sessionRecord] = await tx
          .select({
            id: sessions.id,
            seriesId: sessions.seriesId,
            aiSummary: sessions.aiSummary,
            aiManagerAddendum: sessions.aiManagerAddendum,
            aiStatus: sessions.aiStatus,
            aiCompletedAt: sessions.aiCompletedAt,
            updatedAt: sessions.updatedAt,
          })
          .from(sessions)
          .where(
            and(
              eq(sessions.id, sessionId),
              eq(sessions.tenantId, session.user.tenantId)
            )
          )
          .limit(1);

        if (!sessionRecord) {
          return { error: "NOT_FOUND" as const };
        }

        // Fetch the series for RBAC check
        const [series] = await tx
          .select({
            managerId: meetingSeries.managerId,
            reportId: meetingSeries.reportId,
          })
          .from(meetingSeries)
          .where(eq(meetingSeries.id, sessionRecord.seriesId))
          .limit(1);

        if (!series) {
          return { error: "NOT_FOUND" as const };
        }

        // Authorization: participant or admin
        if (
          !isAdmin(session.user.level) &&
          !isSeriesParticipant(session.user.id, series)
        ) {
          return { error: "FORBIDDEN" as const };
        }

        const isManager = session.user.id === series.managerId;
        const userIsAdmin = isAdmin(session.user.level);

        // Detect stuck sessions and auto-reset to "failed" so the UI shows the retry button.
        // Covers both "generating" (pipeline started but died) and "pending" (pipeline never started,
        // e.g. waitUntil was killed or the background task crashed before setting status).
        let effectiveStatus = sessionRecord.aiStatus;
        if (effectiveStatus === "generating" || effectiveStatus === "pending") {
          const elapsed = Date.now() - sessionRecord.updatedAt.getTime();
          if (elapsed > STUCK_MS) {
            await tx
              .update(sessions)
              .set({ aiStatus: "failed", updatedAt: new Date() })
              .where(eq(sessions.id, sessionId));
            effectiveStatus = "failed";
          }
        }

        return {
          status: effectiveStatus,
          summary: sessionRecord.aiSummary ?? null,
          addendum: (isManager || userIsAdmin) ? (sessionRecord.aiManagerAddendum ?? null) : null,
          completedAt: sessionRecord.aiCompletedAt?.toISOString() ?? null,
        };
      }
    );

    if ("error" in result) {
      switch (result.error) {
        case "NOT_FOUND":
          return NextResponse.json(
            { error: "Session not found" },
            { status: 404 }
          );
        case "FORBIDDEN":
          return NextResponse.json(
            { error: "Forbidden" },
            { status: 403 }
          );
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch AI summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI summary" },
      { status: 500 }
    );
  }
}
