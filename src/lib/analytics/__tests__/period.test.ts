import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { periodToDateRange } from "../period";

describe("periodToDateRange", () => {
  beforeEach(() => {
    // Fix "now" to 2026-03-15T12:00:00Z for deterministic tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns Date objects for startDate and endDate", () => {
    const result = periodToDateRange("30d");
    expect(result.startDate).toBeInstanceOf(Date);
    expect(result.endDate).toBeInstanceOf(Date);
  });

  it("endDate is now", () => {
    const result = periodToDateRange("30d");
    expect(result.endDate.getTime()).toBe(
      new Date("2026-03-15T12:00:00Z").getTime(),
    );
  });

  // --- 30d ---
  describe("30d preset", () => {
    it("startDate is 30 days before now", () => {
      const { startDate } = periodToDateRange("30d");
      expect(startDate.toISOString()).toBe("2026-02-13T12:00:00.000Z");
    });
  });

  // --- 3mo ---
  describe("3mo preset", () => {
    it("startDate is 3 months before now", () => {
      const { startDate } = periodToDateRange("3mo");
      expect(startDate.toISOString()).toBe("2025-12-15T12:00:00.000Z");
    });
  });

  // --- 6mo ---
  describe("6mo preset", () => {
    it("startDate is 6 months before now", () => {
      const { startDate } = periodToDateRange("6mo");
      expect(startDate.toISOString()).toBe("2025-09-15T12:00:00.000Z");
    });
  });

  // --- 1yr ---
  describe("1yr preset", () => {
    it("startDate is 1 year before now", () => {
      const { startDate } = periodToDateRange("1yr");
      expect(startDate.toISOString()).toBe("2025-03-15T12:00:00.000Z");
    });
  });

  // --- default (unknown) ---
  describe("unknown preset", () => {
    it("defaults to 3 months", () => {
      const { startDate } = periodToDateRange("unknown");
      expect(startDate.toISOString()).toBe("2025-12-15T12:00:00.000Z");
    });

    it("empty string defaults to 3 months", () => {
      const { startDate } = periodToDateRange("");
      expect(startDate.toISOString()).toBe("2025-12-15T12:00:00.000Z");
    });
  });

  // --- invariant: start < end ---
  it("startDate is always before endDate", () => {
    for (const preset of ["30d", "3mo", "6mo", "1yr", "anything"]) {
      const { startDate, endDate } = periodToDateRange(preset);
      expect(startDate.getTime()).toBeLessThan(endDate.getTime());
    }
  });
});
