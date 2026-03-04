import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { isSeriesParticipant, isAdmin } from "@/lib/auth/rbac";
import { sessions, meetingSeries } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

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
          !isAdmin(session.user.role) &&
          !isSeriesParticipant(session.user.id, series)
        ) {
          return { error: "FORBIDDEN" as const };
        }

        const isManager = session.user.id === series.managerId;

        return {
          status: sessionRecord.aiStatus,
          summary: sessionRecord.aiSummary ?? null,
          addendum: isManager ? (sessionRecord.aiManagerAddendum ?? null) : null,
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
