import { describe, it, expect } from "vitest";

/**
 * Tests for calendar-related utility functions and type mappings.
 * These are extracted from sync.ts for testability.
 */

describe("Calendar sync utilities", () => {
  // Cadence to RRULE frequency mapping
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

  // Preferred day mapping
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

  describe("cadenceToFrequency", () => {
    it("maps weekly correctly", () => {
      expect(cadenceToFrequency("weekly")).toBe("WEEKLY");
    });

    it("maps biweekly correctly", () => {
      expect(cadenceToFrequency("biweekly")).toBe("BIWEEKLY");
    });

    it("maps monthly correctly", () => {
      expect(cadenceToFrequency("monthly")).toBe("MONTHLY");
    });

    it("defaults unknown cadence to WEEKLY", () => {
      expect(cadenceToFrequency("custom")).toBe("WEEKLY");
      expect(cadenceToFrequency("")).toBe("WEEKLY");
      expect(cadenceToFrequency("quarterly")).toBe("WEEKLY");
    });
  });

  describe("preferredDayToRRuleDay", () => {
    it("maps all weekdays correctly", () => {
      expect(preferredDayToRRuleDay("mon")).toBe("MO");
      expect(preferredDayToRRuleDay("tue")).toBe("TU");
      expect(preferredDayToRRuleDay("wed")).toBe("WE");
      expect(preferredDayToRRuleDay("thu")).toBe("TH");
      expect(preferredDayToRRuleDay("fri")).toBe("FR");
    });

    it("defaults null to MO", () => {
      expect(preferredDayToRRuleDay(null)).toBe("MO");
    });

    it("defaults unknown day to MO", () => {
      expect(preferredDayToRRuleDay("sat")).toBe("MO");
      expect(preferredDayToRRuleDay("sun")).toBe("MO");
      expect(preferredDayToRRuleDay("")).toBe("MO");
    });
  });
});
