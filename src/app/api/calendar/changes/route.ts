import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { adminDb } from "@/lib/db";
import {
  calendarChangeRequests,
  users,
  meetingSeries,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/calendar/changes
 *
 * Returns pending calendar change requests for the current user.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const requests = await adminDb
    .select({
      id: calendarChangeRequests.id,
      seriesId: calendarChangeRequests.seriesId,
      changeType: calendarChangeRequests.changeType,
      status: calendarChangeRequests.status,
      originalStartTime: calendarChangeRequests.originalStartTime,
      proposedStartTime: calendarChangeRequests.proposedStartTime,
      createdAt: calendarChangeRequests.createdAt,
      expiresAt: calendarChangeRequests.expiresAt,
      requestedByFirstName: users.firstName,
      requestedByLastName: users.lastName,
    })
    .from(calendarChangeRequests)
    .innerJoin(
      users,
      eq(calendarChangeRequests.requestedByUserId, users.id)
    )
    .where(
      and(
        eq(calendarChangeRequests.approverUserId, session.user.id),
        eq(calendarChangeRequests.status, "pending")
      )
    );

  // Filter out expired
  const now = new Date();
  const pending = requests
    .filter((r) => r.expiresAt.getTime() > now.getTime())
    .map((r) => ({
      id: r.id,
      seriesId: r.seriesId,
      changeType: r.changeType,
      originalStartTime: r.originalStartTime?.toISOString() ?? null,
      proposedStartTime: r.proposedStartTime?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
      requestedBy: `${r.requestedByFirstName} ${r.requestedByLastName}`,
    }));

  return NextResponse.json({ changes: pending });
}
