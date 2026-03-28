import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { adminDb } from "@/lib/db";
import { calendarEvents, calendarConnections } from "@/lib/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

/**
 * GET /api/calendar/series-status
 *
 * Returns calendar sync status for all series the current user
 * is connected to. Used by the dashboard to show sync badges.
 *
 * Response: { [seriesId]: { synced: boolean, hasError: boolean } }
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Check if user has a calendar connection at all
  const [conn] = await adminDb
    .select({ id: calendarConnections.id })
    .from(calendarConnections)
    .where(
      and(
        eq(calendarConnections.userId, session.user.id),
        eq(calendarConnections.enabled, true)
      )
    )
    .limit(1);

  if (!conn) {
    return NextResponse.json({ statuses: {} });
  }

  // Get all calendar events for this user (recurring only)
  const events = await adminDb
    .select({
      seriesId: calendarEvents.seriesId,
      syncStatus: calendarEvents.syncStatus,
    })
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.userId, session.user.id),
        isNull(calendarEvents.sessionId)
      )
    );

  const statuses: Record<
    string,
    { synced: boolean; hasError: boolean }
  > = {};

  for (const event of events) {
    statuses[event.seriesId] = {
      synced: event.syncStatus === "synced",
      hasError: event.syncStatus === "error",
    };
  }

  return NextResponse.json({ statuses });
}
