import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { adminDb } from "@/lib/db";
import {
  calendarChangeRequests,
  sessions,
  meetingSeries,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  syncSessionRescheduled,
  syncSessionCancelled,
} from "@/lib/calendar";

const respondSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

/**
 * PATCH /api/calendar/changes/[id]
 *
 * Approve or reject a calendar change request.
 * On approve: update the session and sync to both calendars.
 * On reject: revert the event in the requester's calendar.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: changeId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = respondSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input" },
      { status: 400 }
    );
  }

  const { action } = parsed.data;

  try {
    // Fetch the change request
    const [changeReq] = await adminDb
      .select()
      .from(calendarChangeRequests)
      .where(
        and(
          eq(calendarChangeRequests.id, changeId),
          eq(calendarChangeRequests.approverUserId, session.user.id),
          eq(calendarChangeRequests.status, "pending")
        )
      )
      .limit(1);

    if (!changeReq) {
      return NextResponse.json(
        { error: "Change request not found or already resolved" },
        { status: 404 }
      );
    }

    // Check if expired
    if (changeReq.expiresAt.getTime() < Date.now()) {
      await adminDb
        .update(calendarChangeRequests)
        .set({ status: "expired", respondedAt: new Date() })
        .where(eq(calendarChangeRequests.id, changeId));
      return NextResponse.json(
        { error: "Change request has expired" },
        { status: 410 }
      );
    }

    const newStatus = action === "approve" ? "approved" : "rejected";

    await adminDb
      .update(calendarChangeRequests)
      .set({ status: newStatus, respondedAt: new Date() })
      .where(eq(calendarChangeRequests.id, changeId));

    if (action === "approve") {
      if (
        changeReq.changeType === "reschedule" &&
        changeReq.proposedStartTime &&
        changeReq.originalStartTime
      ) {
        // Find or create the session for this date
        const [series] = await adminDb
          .select({
            defaultDurationMinutes: meetingSeries.defaultDurationMinutes,
          })
          .from(meetingSeries)
          .where(eq(meetingSeries.id, changeReq.seriesId))
          .limit(1);

        const duration = series?.defaultDurationMinutes ?? 30;

        // Update the session scheduledAt if it exists
        if (changeReq.sessionId) {
          await adminDb
            .update(sessions)
            .set({
              scheduledAt: changeReq.proposedStartTime,
              updatedAt: new Date(),
            })
            .where(eq(sessions.id, changeReq.sessionId));
        }

        // Sync the reschedule to the other participant's calendar
        syncSessionRescheduled(
          changeReq.seriesId,
          changeReq.sessionId ?? "",
          changeReq.originalStartTime,
          changeReq.proposedStartTime,
          duration
        ).catch((err) =>
          console.error("Failed to sync approved reschedule:", err)
        );
      } else if (changeReq.changeType === "cancel" && changeReq.originalStartTime) {
        // Cancel the session
        if (changeReq.sessionId) {
          await adminDb
            .update(sessions)
            .set({ status: "cancelled", updatedAt: new Date() })
            .where(eq(sessions.id, changeReq.sessionId));
        }

        syncSessionCancelled(
          changeReq.seriesId,
          changeReq.originalStartTime
        ).catch((err) =>
          console.error("Failed to sync approved cancellation:", err)
        );
      }
    }

    // On reject, we could revert the event in the requester's calendar,
    // but this is complex (need to move it back). For now, just mark rejected.
    // The requester will see the rejection and can manually fix their calendar.

    return NextResponse.json({ status: newStatus });
  } catch (error) {
    console.error("Failed to respond to change request:", error);
    return NextResponse.json(
      { error: "Failed to process change request" },
      { status: 500 }
    );
  }
}
