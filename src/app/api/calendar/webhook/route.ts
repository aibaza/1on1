import { NextResponse } from "next/server";
import { google } from "googleapis";
import { eq, and, isNull } from "drizzle-orm";
import { adminDb } from "@/lib/db";
import {
  calendarConnections,
  calendarEvents,
  calendarChangeRequests,
  meetingSeries,
} from "@/lib/db/schema";
import { getValidAccessToken } from "@/lib/calendar/token";

/**
 * POST /api/calendar/webhook
 *
 * Google Calendar push notification endpoint.
 * Google calls this when events change on a watched calendar.
 * We detect if a 1on1 event was rescheduled/cancelled and create
 * a change request for the other participant to approve.
 *
 * Headers from Google:
 * - X-Goog-Channel-ID: our channel ID
 * - X-Goog-Resource-ID: Google's resource ID
 * - X-Goog-Resource-State: "sync" | "exists" | "not_exists"
 */
export async function POST(request: Request) {
  const channelId = request.headers.get("x-goog-channel-id");
  const resourceState = request.headers.get("x-goog-resource-state");

  // Sync notifications are just confirmations — ignore
  if (resourceState === "sync") {
    return NextResponse.json({ ok: true });
  }

  if (!channelId) {
    return NextResponse.json({ error: "Missing channel ID" }, { status: 400 });
  }

  // Find the calendar connection by webhook channel ID
  const [conn] = await adminDb
    .select()
    .from(calendarConnections)
    .where(eq(calendarConnections.webhookChannelId, channelId))
    .limit(1);

  if (!conn) {
    // Channel no longer tracked — tell Google to stop
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  try {
    const accessToken = await getValidAccessToken(conn.id);

    // Get recent changes using the Calendar API's events.list with updatedMin
    const oauth2 = new google.auth.OAuth2();
    oauth2.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: "v3", auth: oauth2 });

    // Check our tracked events for changes
    const trackedEvents = await adminDb
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.userId, conn.userId),
          isNull(calendarEvents.sessionId) // Only recurring event parents
        )
      );

    for (const tracked of trackedEvents) {
      if (!tracked.externalEventId) continue;

      try {
        // Get the event from Google to see if it changed
        const event = await calendar.events.get({
          calendarId: conn.calendarId,
          eventId: tracked.externalEventId,
        });

        // Check for single-instance modifications (exceptions)
        const now = new Date();
        const twoWeeksFromNow = new Date(
          now.getTime() + 14 * 24 * 60 * 60 * 1000
        );

        const instances = await calendar.events.instances({
          calendarId: conn.calendarId,
          eventId: tracked.externalEventId,
          timeMin: now.toISOString(),
          timeMax: twoWeeksFromNow.toISOString(),
          maxResults: 10,
        });

        if (!instances.data.items) continue;

        for (const instance of instances.data.items) {
          // Skip unmodified instances
          if (instance.status === "confirmed" && !instance.originalStartTime) {
            continue;
          }

          // Detect cancellation
          if (instance.status === "cancelled") {
            await createChangeRequest(
              tracked.seriesId,
              conn.userId,
              "cancel",
              instance.originalStartTime?.dateTime
                ? new Date(instance.originalStartTime.dateTime)
                : null,
              null
            );
            continue;
          }

          // Detect reschedule (modified start time)
          if (
            instance.originalStartTime?.dateTime &&
            instance.start?.dateTime
          ) {
            const originalStart = new Date(
              instance.originalStartTime.dateTime
            );
            const newStart = new Date(instance.start.dateTime);

            // Only create change request if time actually changed
            if (originalStart.getTime() !== newStart.getTime()) {
              await createChangeRequest(
                tracked.seriesId,
                conn.userId,
                "reschedule",
                originalStart,
                newStart
              );
            }
          }
        }
      } catch (err) {
        // Event might have been deleted — skip
        console.error(
          `Failed to check event ${tracked.externalEventId}:`,
          err
        );
      }
    }
  } catch (err) {
    console.error("Calendar webhook processing failed:", err);
  }

  return NextResponse.json({ ok: true });
}

/**
 * Create a change request for the other participant to approve.
 */
async function createChangeRequest(
  seriesId: string,
  requestedByUserId: string,
  changeType: "reschedule" | "cancel",
  originalStartTime: Date | null,
  proposedStartTime: Date | null
) {
  // Find the other participant
  const [series] = await adminDb
    .select({
      managerId: meetingSeries.managerId,
      reportId: meetingSeries.reportId,
    })
    .from(meetingSeries)
    .where(eq(meetingSeries.id, seriesId))
    .limit(1);

  if (!series) return;

  const approverUserId =
    requestedByUserId === series.managerId
      ? series.reportId
      : series.managerId;

  // Expire after 48 hours
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await adminDb
    .insert(calendarChangeRequests)
    .values({
      seriesId,
      requestedByUserId,
      approverUserId,
      changeType,
      originalStartTime,
      proposedStartTime,
      expiresAt,
    })
    .onConflictDoNothing();
}
