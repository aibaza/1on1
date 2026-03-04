import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { inngest } from "@/inngest/client";
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

        // Verify AI status is "failed"
        if (sessionRecord.aiStatus !== "failed") {
          return { error: "INVALID_STATUS" as const };
        }

        // Fetch the series to verify the user is the manager
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

        if (session.user.id !== series.managerId) {
          return { error: "FORBIDDEN" as const };
        }

        // Reset AI status to pending
        await tx
          .update(sessions)
          .set({ aiStatus: "pending", updatedAt: new Date() })
          .where(eq(sessions.id, sessionId));

        return { success: true as const };
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

    // Fire-and-forget: trigger AI retry via Inngest
    inngest
      .send({
        name: "session/ai.retry",
        data: {
          sessionId,
          tenantId: session.user.tenantId,
          managerId: session.user.id,
        },
      })
      .catch((err) =>
        console.error("Failed to send Inngest ai.retry event:", err)
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
