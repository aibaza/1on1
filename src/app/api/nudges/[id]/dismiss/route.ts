import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { aiNudges, meetingSeries } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/nudges/[id]/dismiss
 *
 * Marks a nudge as dismissed. Only the manager on the nudge's series
 * can dismiss it. Dismissed nudges never reappear for that session
 * (per locked decision).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: nudgeId } = await params;

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Fetch the nudge and verify it belongs to this tenant
        const [nudge] = await tx
          .select({
            id: aiNudges.id,
            seriesId: aiNudges.seriesId,
          })
          .from(aiNudges)
          .where(
            and(
              eq(aiNudges.id, nudgeId),
              eq(aiNudges.tenantId, session.user.tenantId)
            )
          )
          .limit(1);

        if (!nudge) {
          return { error: "NOT_FOUND" as const };
        }

        // Verify the user is the manager on this series
        const [series] = await tx
          .select({ managerId: meetingSeries.managerId })
          .from(meetingSeries)
          .where(eq(meetingSeries.id, nudge.seriesId))
          .limit(1);

        if (!series || series.managerId !== session.user.id) {
          return { error: "FORBIDDEN" as const };
        }

        // Mark as dismissed
        await tx
          .update(aiNudges)
          .set({ isDismissed: true })
          .where(eq(aiNudges.id, nudgeId));

        return { success: true };
      }
    );

    if ("error" in result) {
      switch (result.error) {
        case "NOT_FOUND":
          return NextResponse.json(
            { error: "Nudge not found" },
            { status: 404 }
          );
        case "FORBIDDEN":
          return NextResponse.json(
            { error: "Forbidden" },
            { status: 403 }
          );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to dismiss nudge:", error);
    return NextResponse.json(
      { error: "Failed to dismiss nudge" },
      { status: 500 }
    );
  }
}
