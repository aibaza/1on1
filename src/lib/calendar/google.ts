import { google } from "googleapis";
import type {
  CalendarProvider,
  CalendarRecurringEvent,
  CalendarEventUpdate,
  CalendarEventInstance,
  CreatedEvent,
} from "./types";

const RRULE_DAY_MAP: Record<string, string> = {
  MO: "MO",
  TU: "TU",
  WE: "WE",
  TH: "TH",
  FR: "FR",
  SA: "SA",
  SU: "SU",
};

function buildRRule(event: CalendarRecurringEvent): string {
  const day = RRULE_DAY_MAP[event.dayOfWeek] ?? "MO";

  if (event.frequency === "WEEKLY") {
    return `RRULE:FREQ=WEEKLY;BYDAY=${day}`;
  }
  if (event.frequency === "BIWEEKLY") {
    return `RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=${day}`;
  }
  if (event.frequency === "MONTHLY") {
    // Monthly on the same weekday occurrence (e.g. 2nd Tuesday)
    return `RRULE:FREQ=MONTHLY;BYDAY=${day}`;
  }
  // Custom — use daily interval
  if (event.intervalDays) {
    return `RRULE:FREQ=DAILY;INTERVAL=${event.intervalDays}`;
  }
  return `RRULE:FREQ=WEEKLY;BYDAY=${day}`;
}

function getCalendarClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.calendar({ version: "v3", auth });
}

/**
 * Format a Date + time string into Google Calendar dateTime format.
 * startDate provides the date, startTime provides HH:MM.
 */
function toDateTime(
  date: Date,
  time: string,
  durationMinutes: number,
  timeZone: string
): { start: { dateTime: string; timeZone: string }; end: { dateTime: string; timeZone: string } } {
  const [hours, minutes] = time.split(":").map(Number);
  const start = new Date(date);
  start.setHours(hours, minutes, 0, 0);

  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  return {
    start: { dateTime: start.toISOString(), timeZone },
    end: { dateTime: end.toISOString(), timeZone },
  };
}

export class GoogleCalendarProvider implements CalendarProvider {
  async createRecurringEvent(
    accessToken: string,
    calendarId: string,
    event: CalendarRecurringEvent
  ): Promise<CreatedEvent> {
    const calendar = getCalendarClient(accessToken);
    const { start, end } = toDateTime(
      event.startDate,
      event.startTime,
      event.durationMinutes,
      event.timeZone
    );

    const description = [
      event.description,
      event.appUrl ? `\n---\nOpen in 1on1: ${event.appUrl}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const res = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: event.summary,
        description: description || undefined,
        start,
        end,
        recurrence: [buildRRule(event)],
        attendees: event.attendees?.map((email) => ({ email })),
        reminders: {
          useDefault: true,
        },
        transparency: "opaque",
      },
    });

    return {
      eventId: res.data.id!,
      htmlLink: res.data.htmlLink ?? undefined,
    };
  }

  async updateRecurringEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    update: CalendarEventUpdate
  ): Promise<void> {
    const calendar = getCalendarClient(accessToken);

    const patch: Record<string, unknown> = {};
    if (update.summary) patch.summary = update.summary;
    if (update.description !== undefined) patch.description = update.description;

    if (update.recurrence) {
      const { start, end } = toDateTime(
        update.recurrence.startDate,
        update.recurrence.startTime,
        update.recurrence.durationMinutes,
        update.recurrence.timeZone
      );
      patch.start = start;
      patch.end = end;
      patch.recurrence = [buildRRule(update.recurrence)];
    } else if (update.startTime && update.durationMinutes) {
      const endTime = new Date(
        update.startTime.getTime() + update.durationMinutes * 60 * 1000
      );
      patch.start = { dateTime: update.startTime.toISOString() };
      patch.end = { dateTime: endTime.toISOString() };
    }

    await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: patch,
    });
  }

  async updateEventInstance(
    accessToken: string,
    calendarId: string,
    eventId: string,
    instanceDate: Date,
    update: CalendarEventInstance
  ): Promise<CreatedEvent> {
    const calendar = getCalendarClient(accessToken);

    // Find the specific instance by listing instances around the target date
    const timeMin = new Date(instanceDate);
    timeMin.setHours(0, 0, 0, 0);
    const timeMax = new Date(instanceDate);
    timeMax.setHours(23, 59, 59, 999);

    const instances = await calendar.events.instances({
      calendarId,
      eventId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults: 1,
    });

    const instance = instances.data.items?.[0];
    if (!instance?.id) {
      throw new Error(
        `No calendar instance found for event ${eventId} on ${instanceDate.toISOString()}`
      );
    }

    const endTime = new Date(
      update.startTime.getTime() + update.durationMinutes * 60 * 1000
    );

    const res = await calendar.events.patch({
      calendarId,
      eventId: instance.id,
      requestBody: {
        summary: update.summary,
        description: update.description,
        start: { dateTime: update.startTime.toISOString() },
        end: { dateTime: endTime.toISOString() },
      },
    });

    return {
      eventId: res.data.id!,
      htmlLink: res.data.htmlLink ?? undefined,
    };
  }

  async cancelEventInstance(
    accessToken: string,
    calendarId: string,
    eventId: string,
    instanceDate: Date
  ): Promise<void> {
    const calendar = getCalendarClient(accessToken);

    const timeMin = new Date(instanceDate);
    timeMin.setHours(0, 0, 0, 0);
    const timeMax = new Date(instanceDate);
    timeMax.setHours(23, 59, 59, 999);

    const instances = await calendar.events.instances({
      calendarId,
      eventId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults: 1,
    });

    const instance = instances.data.items?.[0];
    if (!instance?.id) return; // Instance doesn't exist, nothing to cancel

    await calendar.events.patch({
      calendarId,
      eventId: instance.id,
      requestBody: { status: "cancelled" },
    });
  }

  async deleteEvent(
    accessToken: string,
    calendarId: string,
    eventId: string
  ): Promise<void> {
    const calendar = getCalendarClient(accessToken);
    await calendar.events.delete({ calendarId, eventId });
  }
}
