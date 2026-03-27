/**
 * Calendar provider abstraction.
 * Allows swapping Google ↔ Microsoft (or other) calendar backends.
 */

export interface CalendarRecurringEvent {
  summary: string;
  description?: string;
  /** IANA timezone, e.g. "Europe/Bucharest" */
  timeZone: string;
  /** ISO weekday: MO, TU, WE, TH, FR */
  dayOfWeek: string;
  /** HH:MM in 24h format */
  startTime: string;
  /** Duration in minutes */
  durationMinutes: number;
  /** RRULE frequency: WEEKLY, BIWEEKLY (INTERVAL=2), MONTHLY */
  frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  /** For custom cadence — interval in days */
  intervalDays?: number;
  /** When the first event should occur */
  startDate: Date;
  /** Attendee emails */
  attendees?: string[];
  /** Link back to the app */
  appUrl?: string;
}

export interface CalendarEventUpdate {
  summary?: string;
  description?: string;
  /** New start time for rescheduling */
  startTime?: Date;
  durationMinutes?: number;
  /** Update recurrence rule */
  recurrence?: CalendarRecurringEvent;
}

export interface CalendarEventInstance {
  /** New start time for this specific instance */
  startTime: Date;
  durationMinutes: number;
  summary?: string;
  description?: string;
}

export interface CreatedEvent {
  eventId: string;
  htmlLink?: string;
}

export interface CalendarProvider {
  /**
   * Create a recurring calendar event.
   * Returns the event ID from the external calendar.
   */
  createRecurringEvent(
    accessToken: string,
    calendarId: string,
    event: CalendarRecurringEvent
  ): Promise<CreatedEvent>;

  /**
   * Update an existing recurring event (all future instances).
   */
  updateRecurringEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    update: CalendarEventUpdate
  ): Promise<void>;

  /**
   * Update a single instance of a recurring event (exception).
   * Used when a specific session is rescheduled.
   */
  updateEventInstance(
    accessToken: string,
    calendarId: string,
    eventId: string,
    instanceDate: Date,
    update: CalendarEventInstance
  ): Promise<CreatedEvent>;

  /**
   * Cancel a single instance of a recurring event.
   */
  cancelEventInstance(
    accessToken: string,
    calendarId: string,
    eventId: string,
    instanceDate: Date
  ): Promise<void>;

  /**
   * Delete an entire recurring event (used when series is archived).
   */
  deleteEvent(
    accessToken: string,
    calendarId: string,
    eventId: string
  ): Promise<void>;
}
