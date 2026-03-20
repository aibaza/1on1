import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { isSeriesParticipant, isAdmin } from "@/lib/auth/rbac";
import { sessions, meetingSeries, sessionAnswers } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/sessions/[id]/revert
 *
 * Revert an in_progress session with 0 answers back to "scheduled".
 * Used when a user opens a wizard but exits without answering anything.
 */
export async function POST(request: Request, { params }: RouteContext) {
  void request;
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
        // Fetch session
        const [sessionRecord] = await tx
          .select({
            id: sessions.id,
            seriesId: sessions.seriesId,
            status: sessions.status,
          })
          .from(sessions)
          .where(
            and(
              eq(sessions.id, sessionId),
              eq(sessions.tenantId, session.user.tenantId)
            )
          );

        if (!sessionRecord) return { error: "Session not found", status: 404 };
        if (sessionRecord.status !== "in_progress") {
          return { error: "Session is not in progress", status: 400 };
        }

        // Check authorization
        const [series] = await tx
          .select({
            managerId: meetingSeries.managerId,
            reportId: meetingSeries.reportId,
          })
          .from(meetingSeries)
          .where(eq(meetingSeries.id, sessionRecord.seriesId));

        if (
          !isAdmin(session.user.role) &&
          !isSeriesParticipant(session.user.id, series)
        ) {
          return { error: "Forbidden", status: 403 };
        }

        // Check answer count
        const [{ count }] = await tx
          .select({ count: sql<number>`cast(count(*) as int)` })
          .from(sessionAnswers)
          .where(eq(sessionAnswers.sessionId, sessionId));

        if (count > 0) {
          return { error: "Session has answers, cannot revert", status: 400 };
        }

        // Revert to scheduled
        await tx
          .update(sessions)
          .set({
            status: "scheduled",
            startedAt: null,
          })
          .where(eq(sessions.id, sessionId));

        return { data: { reverted: true } };
      }
    );

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Failed to revert session:", error);
    return NextResponse.json(
      { error: "Failed to revert session" },
      { status: 500 }
    );
  }
}
