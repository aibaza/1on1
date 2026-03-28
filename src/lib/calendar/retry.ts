/**
 * Retry logic for failed calendar syncs.
 * Scans calendar_events with sync_status = 'error' and retries them.
 * Should be called by a cron job (e.g., every 15 minutes).
 */

import { eq } from "drizzle-orm";
import { adminDb } from "@/lib/db";
import { calendarEvents, calendarConnections } from "@/lib/db/schema";
import { getValidAccessToken } from "./token";
import { GoogleCalendarProvider } from "./google";

const google = new GoogleCalendarProvider();

const MAX_RETRIES = 3;

/**
 * Retry failed calendar event syncs.
 * Returns the number of events successfully retried.
 */
export async function retryFailedSyncs(): Promise<number> {
  const failedEvents = await adminDb
    .select()
    .from(calendarEvents)
    .where(eq(calendarEvents.syncStatus, "error"));

  let retried = 0;

  for (const event of failedEvents) {
    // Skip events that never had an external ID (creation failed)
    // These need a full re-create, handled separately
    if (!event.externalEventId) continue;

    const [conn] = await adminDb
      .select()
      .from(calendarConnections)
      .where(eq(calendarConnections.userId, event.userId))
      .limit(1);

    if (!conn || !conn.enabled) continue;

    try {
      const accessToken = await getValidAccessToken(conn.id);

      // Try to fetch the event to verify it still exists
      const { google: gapi } = await import("googleapis");
      const auth = new gapi.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });
      const calendar = gapi.calendar({ version: "v3", auth });

      await calendar.events.get({
        calendarId: conn.calendarId,
        eventId: event.externalEventId,
      });

      // Event exists — mark as synced
      await adminDb
        .update(calendarEvents)
        .set({
          syncStatus: "synced",
          lastSyncedAt: new Date(),
          lastSyncError: null,
        })
        .where(eq(calendarEvents.id, event.id));

      retried++;
    } catch (err) {
      // Still failing — update error message
      await adminDb
        .update(calendarEvents)
        .set({
          lastSyncError:
            err instanceof Error ? err.message : "Retry failed",
        })
        .where(eq(calendarEvents.id, event.id));
    }
  }

  return retried;
}
