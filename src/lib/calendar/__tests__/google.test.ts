import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoist mock functions so they're available in vi.mock factory
const mockInsert = vi.hoisted(() => vi.fn());
const mockPatch = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());
const mockInstances = vi.hoisted(() => vi.fn());

vi.mock("googleapis", () => {
  class MockOAuth2 {
    setCredentials = vi.fn();
  }
  return {
    google: {
      auth: { OAuth2: MockOAuth2 },
      calendar: vi.fn().mockReturnValue({
        events: {
          insert: mockInsert,
          patch: mockPatch,
          delete: mockDelete,
          instances: mockInstances,
        },
      }),
    },
  };
});

import { GoogleCalendarProvider } from "../google";
import type { CalendarRecurringEvent } from "../types";

describe("GoogleCalendarProvider", () => {
  let provider: GoogleCalendarProvider;

  beforeEach(() => {
    provider = new GoogleCalendarProvider();
    mockInsert.mockReset();
    mockPatch.mockReset();
    mockDelete.mockReset();
    mockInstances.mockReset();
  });

  describe("createRecurringEvent", () => {
    const baseEvent: CalendarRecurringEvent = {
      summary: "1on1 John Doe",
      description: "Test meeting",
      timeZone: "Europe/Bucharest",
      dayOfWeek: "TU",
      startTime: "10:00",
      durationMinutes: 30,
      frequency: "WEEKLY",
      startDate: new Date("2026-03-03T00:00:00Z"),
      attendees: ["manager@example.com", "report@example.com"],
      appUrl: "https://app.example.com/series/123",
    };

    it("creates a weekly recurring event with correct RRULE", async () => {
      mockInsert.mockResolvedValue({
        data: { id: "event-123", htmlLink: "https://calendar.google.com/..." },
      });

      const result = await provider.createRecurringEvent(
        "access-token",
        "primary",
        baseEvent
      );

      expect(result.eventId).toBe("event-123");
      expect(result.htmlLink).toBe("https://calendar.google.com/...");

      const call = mockInsert.mock.calls[0][0];
      expect(call.calendarId).toBe("primary");
      expect(call.requestBody.summary).toBe("1on1 John Doe");
      expect(call.requestBody.recurrence).toEqual([
        "RRULE:FREQ=WEEKLY;BYDAY=TU",
      ]);
      expect(call.requestBody.attendees).toEqual([
        { email: "manager@example.com" },
        { email: "report@example.com" },
      ]);
    });

    it("creates biweekly RRULE with INTERVAL=2", async () => {
      mockInsert.mockResolvedValue({ data: { id: "event-456" } });

      await provider.createRecurringEvent("token", "primary", {
        ...baseEvent,
        frequency: "BIWEEKLY",
        dayOfWeek: "TH",
      });

      const call = mockInsert.mock.calls[0][0];
      expect(call.requestBody.recurrence).toEqual([
        "RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=TH",
      ]);
    });

    it("creates monthly RRULE", async () => {
      mockInsert.mockResolvedValue({ data: { id: "event-789" } });

      await provider.createRecurringEvent("token", "primary", {
        ...baseEvent,
        frequency: "MONTHLY",
        dayOfWeek: "MO",
      });

      const call = mockInsert.mock.calls[0][0];
      expect(call.requestBody.recurrence).toEqual([
        "RRULE:FREQ=MONTHLY;BYDAY=MO",
      ]);
    });

    it("includes app URL in description", async () => {
      mockInsert.mockResolvedValue({ data: { id: "e" } });

      await provider.createRecurringEvent("token", "primary", baseEvent);

      const call = mockInsert.mock.calls[0][0];
      expect(call.requestBody.description).toContain(
        "Open in 1on1: https://app.example.com/series/123"
      );
    });

    it("calculates correct duration between start and end", async () => {
      mockInsert.mockResolvedValue({ data: { id: "e" } });

      await provider.createRecurringEvent("token", "primary", {
        ...baseEvent,
        startTime: "14:30",
        durationMinutes: 45,
      });

      const call = mockInsert.mock.calls[0][0];
      const startDate = new Date(call.requestBody.start.dateTime);
      const endDate = new Date(call.requestBody.end.dateTime);

      expect(endDate.getTime() - startDate.getTime()).toBe(45 * 60 * 1000);
      expect(call.requestBody.start.timeZone).toBe("Europe/Bucharest");
    });
  });

  describe("updateRecurringEvent", () => {
    it("patches event with new summary", async () => {
      mockPatch.mockResolvedValue({ data: {} });

      await provider.updateRecurringEvent("token", "primary", "event-123", {
        summary: "1on1 Jane Smith",
      });

      const call = mockPatch.mock.calls[0][0];
      expect(call.eventId).toBe("event-123");
      expect(call.requestBody.summary).toBe("1on1 Jane Smith");
    });

    it("patches event with new description", async () => {
      mockPatch.mockResolvedValue({ data: {} });

      await provider.updateRecurringEvent("token", "primary", "event-123", {
        description: "Updated agenda",
      });

      const call = mockPatch.mock.calls[0][0];
      expect(call.requestBody.description).toBe("Updated agenda");
    });
  });

  describe("updateEventInstance", () => {
    it("finds and patches specific instance", async () => {
      mockInstances.mockResolvedValue({
        data: { items: [{ id: "instance-1", status: "confirmed" }] },
      });
      mockPatch.mockResolvedValue({
        data: { id: "instance-1", htmlLink: "https://..." },
      });

      const result = await provider.updateEventInstance(
        "token",
        "primary",
        "event-123",
        new Date("2026-03-10T10:00:00Z"),
        {
          startTime: new Date("2026-03-11T14:00:00Z"),
          durationMinutes: 30,
        }
      );

      expect(result.eventId).toBe("instance-1");
      expect(mockInstances).toHaveBeenCalledOnce();
      expect(mockPatch).toHaveBeenCalledOnce();
    });

    it("throws when no instance found", async () => {
      mockInstances.mockResolvedValue({ data: { items: [] } });

      await expect(
        provider.updateEventInstance(
          "token",
          "primary",
          "event-123",
          new Date("2026-03-10T10:00:00Z"),
          {
            startTime: new Date("2026-03-11T14:00:00Z"),
            durationMinutes: 30,
          }
        )
      ).rejects.toThrow("No calendar instance found");
    });
  });

  describe("cancelEventInstance", () => {
    it("cancels specific instance by setting status", async () => {
      mockInstances.mockResolvedValue({
        data: { items: [{ id: "instance-1" }] },
      });
      mockPatch.mockResolvedValue({ data: {} });

      await provider.cancelEventInstance(
        "token",
        "primary",
        "event-123",
        new Date("2026-03-10T10:00:00Z")
      );

      const call = mockPatch.mock.calls[0][0];
      expect(call.requestBody.status).toBe("cancelled");
    });

    it("does nothing when instance not found", async () => {
      mockInstances.mockResolvedValue({ data: { items: [] } });

      await provider.cancelEventInstance(
        "token",
        "primary",
        "event-123",
        new Date("2026-03-10T10:00:00Z")
      );

      expect(mockPatch).not.toHaveBeenCalled();
    });
  });

  describe("deleteEvent", () => {
    it("deletes the event", async () => {
      mockDelete.mockResolvedValue({ data: {} });

      await provider.deleteEvent("token", "primary", "event-123");

      expect(mockDelete).toHaveBeenCalledWith({
        calendarId: "primary",
        eventId: "event-123",
      });
    });
  });
});
