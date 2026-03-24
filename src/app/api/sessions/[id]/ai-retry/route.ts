import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { runAIPipelineDirect } from "@/lib/ai/pipeline";
import { sessions, meetingSeries } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/sessions/[id]/ai-retry
 *
 * Re-triggers the AI pipeline for a session that failed AI generation.
 * Only the manager on the series can retry.
 */
export async function POST(
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
        // Fetch the session
        const [sessionRecord] = await tx
          .select({
            id: sessions.id,
            seriesId: sessions.seriesId,
            aiStatus: sessions.aiStatus,
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

        // Fetch the series to verify the user is the manager or admin
        const [series] = await tx
          .select({
            managerId: meetingSeries.managerId,
          })
          .from(meetingSeries)
          .where(eq(meetingSeries.id, sessionRecord.seriesId))
          .limit(1);

        if (!series) {
          return { error: "NOT_FOUND" as const };
        }

        const isManagerOnSeries = session.user.id === series.managerId;
        const isAdmin = session.user.level === "admin";

        if (!isManagerOnSeries && !isAdmin) {
          return { error: "FORBIDDEN" as const };
        }

        // Admins can re-generate from any status; managers only from failed/pending
        const validStatuses = isAdmin
          ? ["failed", "pending", "completed"]
          : ["failed", "pending"];
        if (!validStatuses.includes(sessionRecord.aiStatus ?? "")) {
          return { error: "INVALID_STATUS" as const };
        }

        // Reset AI status to pending
        await tx
          .update(sessions)
          .set({ aiStatus: "pending", updatedAt: new Date() })
          .where(eq(sessions.id, sessionId));

        // Fetch reportId for pipeline
        const [seriesFull] = await tx
          .select({
            reportId: meetingSeries.reportId,
          })
          .from(meetingSeries)
          .where(eq(meetingSeries.id, sessionRecord.seriesId))
          .limit(1);

        return {
          success: true as const,
          seriesId: sessionRecord.seriesId,
          managerId: series.managerId,
          reportId: seriesFull?.reportId ?? "",
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
        case "INVALID_STATUS":
          return NextResponse.json(
            { error: "AI pipeline is not in a failed state" },
            { status: 400 }
          );
        case "FORBIDDEN":
          return NextResponse.json(
            { error: "Only the manager can retry AI generation" },
            { status: 403 }
          );
      }
    }

    waitUntil(
      runAIPipelineDirect({
        sessionId,
        seriesId: result.seriesId,
        tenantId: session.user.tenantId,
        managerId: result.managerId,
        reportId: result.reportId,
      }).catch((err) =>
        console.error("Failed to run AI retry pipeline:", err)
      )
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to retry AI pipeline:", error);
    return NextResponse.json(
      { error: "Failed to retry AI pipeline" },
      { status: 500 }
    );
  }
}
