/**
 * Calendar Sync Service
 *
 * Orchestrates outbound sync (App → Calendar) for meeting series and sessions.
 * Called from API routes after series/session mutations.
 *
 * Design:
 * - Each participant (manager + report) gets their own calendar event
 * - Series → recurring event, session exception → single instance override
 * - All operations are best-effort (never fail the parent mutation)
 * - Token refresh handled transparently by getValidAccessToken()
 */

import { eq, and, isNull } from "drizzle-orm";
import { adminDb } from "@/lib/db";
import {
  calendarConnections,
  calendarEvents,
  users,
  meetingSeries,
} from "@/lib/db/schema";
import { GoogleCalendarProvider } from "./google";
import { getValidAccessToken } from "./token";
import type { CalendarRecurringEvent } from "./types";

const google = new GoogleCalendarProvider();

/** Map app cadence to RRULE frequency */
function cadenceToFrequency(
  cadence: string
): "WEEKLY" | "BIWEEKLY" | "MONTHLY" {
  switch (cadence) {
    case "weekly":
      return "WEEKLY";
    case "biweekly":
      return "BIWEEKLY";
    case "monthly":
      return "MONTHLY";
    default:
      return "WEEKLY";
  }
}

/** Map app preferred day (mon/tue/..) to RRULE day (MO/TU/..) */
function preferredDayToRRuleDay(day: string | null): string {
  const map: Record<string, string> = {
    mon: "MO",
    tue: "TU",
    wed: "WE",
    thu: "TH",
    fri: "FR",
  };
  return map[day ?? ""] ?? "MO";
}

/** Get participant names and emails for a series */
async function getSeriesParticipants(seriesId: string) {
  const [series] = await adminDb
    .select({
      managerId: meetingSeries.managerId,
      reportId: meetingSeries.reportId,
      cadence: meetingSeries.cadence,
      cadenceCustomDays: meetingSeries.cadenceCustomDays,
      preferredDay: meetingSeries.preferredDay,
      preferredTime: meetingSeries.preferredTime,
      defaultDurationMinutes: meetingSeries.defaultDurationMinutes,
      nextSessionAt: meetingSeries.nextSessionAt,
    })
    .from(meetingSeries)
    .where(eq(meetingSeries.id, seriesId))
    .limit(1);

  if (!series) return null;

  const participantIds = [series.managerId, series.reportId];
  const participantRows = await adminDb
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
    })
    .from(users)
    .where(
      eq(users.id, participantIds[0])
    );

  // Fetch second participant
  const participantRows2 = await adminDb
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, participantIds[1]));

  const allParticipants = [...participantRows, ...participantRows2];
  const manager = allParticipants.find((p) => p.id === series.managerId);
  const report = allParticipants.find((p) => p.id === series.reportId);

  return { series, manager, report, allParticipants };
}

/** Get connected calendar for a user (if any) */
async function getUserConnection(userId: string) {
  const [conn] = await adminDb
    .select()
    .from(calendarConnections)
    .where(
      and(
        eq(calendarConnections.userId, userId),
        eq(calendarConnections.enabled, true)
      )
    )
    .limit(1);
  return conn ?? null;
}

/**
 * Create recurring calendar events for all connected participants of a series.
 * Called when a new series is created.
 */
export async function syncSeriesCreated(
  seriesId: string,
  appUrl: string
): Promise<void> {
  const data = await getSeriesParticipants(seriesId);
  if (!data) return;

  const { series, manager, report, allParticipants } = data;
  if (!manager || !report) return;

  const reportName = `${report.firstName} ${report.lastName}`;
  const attendeeEmails = allParticipants.map((p) => p.email);

  for (const participant of allParticipants) {
    const conn = await getUserConnection(participant.id);
    if (!conn) continue;

    try {
      const accessToken = await getValidAccessToken(conn.id);

      const eventData: CalendarRecurringEvent = {
        summary: `1on1 ${reportName}`,
        description: `1on1 meeting between ${manager.firstName} ${manager.lastName} and ${reportName}`,
        timeZone: "Europe/Bucharest", // TODO: use user timezone from settings
        dayOfWeek: preferredDayToRRuleDay(series.preferredDay),
        startTime: series.preferredTime ?? "10:00",
        durationMinutes: series.defaultDurationMinutes,
        frequency: cadenceToFrequency(series.cadence),
        intervalDays:
          series.cadence === "custom"
            ? (series.cadenceCustomDays ?? 14)
            : undefined,
        startDate: series.nextSessionAt ?? new Date(),
        attendees: attendeeEmails,
        appUrl: `${appUrl}/series/${seriesId}`,
      };

      const created = await google.createRecurringEvent(
        accessToken,
        conn.calendarId,
        eventData
      );

      // Store the mapping
      await adminDb.insert(calendarEvents).values({
        userId: participant.id,
        seriesId,
        provider: conn.provider,
        externalEventId: created.eventId,
        calendarId: conn.calendarId,
        syncStatus: "synced",
      });
    } catch (err) {
      console.error(
        `Failed to create calendar event for user ${participant.id}:`,
        err
      );
      // Store error state
      await adminDb
        .insert(calendarEvents)
        .values({
          userId: participant.id,
          seriesId,
          provider: conn.provider,
          externalEventId: "",
          calendarId: conn.calendarId,
          syncStatus: "error",
          lastSyncError:
            err instanceof Error ? err.message : "Unknown error",
        })
        .onConflictDoNothing();
    }
  }
}

/**
 * Update recurring calendar events when series settings change.
 * Called when cadence, preferred day/time, or duration changes.
 */
export async function syncSeriesUpdated(
  seriesId: string,
  appUrl: string
): Promise<void> {
  const data = await getSeriesParticipants(seriesId);
  if (!data) return;

  const { series, manager, report } = data;
  if (!manager || !report) return;

  const reportName = `${report.firstName} ${report.lastName}`;

  // Find all existing calendar events for this series
  const events = await adminDb
    .select()
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.seriesId, seriesId),
        isNull(calendarEvents.sessionId) // Only recurring events, not instance overrides
      )
    );

  for (const event of events) {
    if (!event.externalEventId) continue;

    const conn = await getUserConnection(event.userId);
    if (!conn) continue;

    try {
      const accessToken = await getValidAccessToken(conn.id);

      const eventData: CalendarRecurringEvent = {
        summary: `1on1 ${reportName}`,
        description: `1on1 meeting between ${manager.firstName} ${manager.lastName} and ${reportName}\n\nOpen in 1on1: ${appUrl}/series/${seriesId}`,
        timeZone: "Europe/Bucharest",
        dayOfWeek: preferredDayToRRuleDay(series.preferredDay),
        startTime: series.preferredTime ?? "10:00",
        durationMinutes: series.defaultDurationMinutes,
        frequency: cadenceToFrequency(series.cadence),
        intervalDays:
          series.cadence === "custom"
            ? (series.cadenceCustomDays ?? 14)
            : undefined,
        startDate: series.nextSessionAt ?? new Date(),
      };

      await google.updateRecurringEvent(
        accessToken,
        conn.calendarId,
        event.externalEventId,
        { recurrence: eventData }
      );

      await adminDb
        .update(calendarEvents)
        .set({
          syncStatus: "synced",
          lastSyncedAt: new Date(),
          lastSyncError: null,
        })
        .where(eq(calendarEvents.id, event.id));
    } catch (err) {
      console.error(
        `Failed to update calendar event ${event.id}:`,
        err
      );
      await adminDb
        .update(calendarEvents)
        .set({
          syncStatus: "error",
          lastSyncError:
            err instanceof Error ? err.message : "Unknown error",
        })
        .where(eq(calendarEvents.id, event.id));
    }
  }
}

/**
 * Cancel a specific session instance in all participants' calendars.
 * Called when a session is cancelled.
 */
export async function syncSessionCancelled(
  seriesId: string,
  scheduledAt: Date
): Promise<void> {
  const events = await adminDb
    .select()
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.seriesId, seriesId),
        isNull(calendarEvents.sessionId)
      )
    );

  for (const event of events) {
    if (!event.externalEventId) continue;

    const conn = await getUserConnection(event.userId);
    if (!conn) continue;

    try {
      const accessToken = await getValidAccessToken(conn.id);
      await google.cancelEventInstance(
        accessToken,
        conn.calendarId,
        event.externalEventId,
        scheduledAt
      );
    } catch (err) {
      console.error(
        `Failed to cancel calendar instance for event ${event.id}:`,
        err
      );
    }
  }
}

/**
 * Reschedule a specific session instance in all participants' calendars.
 * Called when a session's scheduledAt is changed.
 */
export async function syncSessionRescheduled(
  seriesId: string,
  sessionId: string,
  originalDate: Date,
  newDate: Date,
  durationMinutes: number
): Promise<void> {
  const events = await adminDb
    .select()
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.seriesId, seriesId),
        isNull(calendarEvents.sessionId)
      )
    );

  for (const event of events) {
    if (!event.externalEventId) continue;

    const conn = await getUserConnection(event.userId);
    if (!conn) continue;

    try {
      const accessToken = await getValidAccessToken(conn.id);
      const result = await google.updateEventInstance(
        accessToken,
        conn.calendarId,
        event.externalEventId,
        originalDate,
        {
          startTime: newDate,
          durationMinutes,
        }
      );

      // Store the instance override mapping
      await adminDb
        .insert(calendarEvents)
        .values({
          userId: event.userId,
          seriesId,
          sessionId,
          provider: conn.provider,
          externalEventId: result.eventId,
          calendarId: conn.calendarId,
          syncStatus: "synced",
        })
        .onConflictDoNothing();
    } catch (err) {
      console.error(
        `Failed to reschedule calendar instance for event ${event.id}:`,
        err
      );
    }
  }
}

/**
 * Delete all calendar events for a series (used when series is archived).
 */
export async function syncSeriesArchived(seriesId: string): Promise<void> {
  const events = await adminDb
    .select()
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.seriesId, seriesId),
        isNull(calendarEvents.sessionId)
      )
    );

  for (const event of events) {
    if (!event.externalEventId) continue;

    const conn = await getUserConnection(event.userId);
    if (!conn) continue;

    try {
      const accessToken = await getValidAccessToken(conn.id);
      await google.deleteEvent(
        accessToken,
        conn.calendarId,
        event.externalEventId
      );
    } catch (err) {
      console.error(
        `Failed to delete calendar event ${event.id}:`,
        err
      );
    }
  }

  // Clean up all event records for this series
  await adminDb
    .delete(calendarEvents)
    .where(eq(calendarEvents.seriesId, seriesId));
}

/**
 * Update the description of calendar events to include talking points.
 * Called when talking points are added/updated.
 */
export async function syncEventDescription(
  seriesId: string,
  description: string
): Promise<void> {
  const events = await adminDb
    .select()
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.seriesId, seriesId),
        isNull(calendarEvents.sessionId)
      )
    );

  for (const event of events) {
    if (!event.externalEventId) continue;

    const conn = await getUserConnection(event.userId);
    if (!conn) continue;

    try {
      const accessToken = await getValidAccessToken(conn.id);
      await google.updateRecurringEvent(
        accessToken,
        conn.calendarId,
        event.externalEventId,
        { description }
      );
    } catch (err) {
      console.error(
        `Failed to update event description for ${event.id}:`,
        err
      );
    }
  }
}
