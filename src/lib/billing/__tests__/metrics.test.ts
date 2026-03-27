import { describe, expect, it } from "vitest";
import {
  computeMRR,
  computeChurnRate,
  computeTrialConversion,
  formatCentsToEuro,
} from "../metrics";

describe("computeMRR", () => {
  it("sums MRR from active and trialing subscriptions", () => {
    const subs = [
      { mrrCents: 1000, status: "active" },
      { mrrCents: 500, status: "trialing" },
      { mrrCents: 2000, status: "canceled" },
      { mrrCents: 300, status: "past_due" },
    ];
    expect(computeMRR(subs)).toBe(1500);
  });

  it("returns 0 for empty array", () => {
    expect(computeMRR([])).toBe(0);
  });

  it("returns 0 when no active or trialing subscriptions", () => {
    const subs = [
      { mrrCents: 1000, status: "canceled" },
      { mrrCents: 500, status: "past_due" },
    ];
    expect(computeMRR(subs)).toBe(0);
  });

  it("handles all active subscriptions", () => {
    const subs = [
      { mrrCents: 1000, status: "active" },
      { mrrCents: 2000, status: "active" },
    ];
    expect(computeMRR(subs)).toBe(3000);
  });
});

describe("computeChurnRate", () => {
  it("computes ratio of canceled to total", () => {
    expect(computeChurnRate(5, 100)).toBe(0.05);
  });

  it("returns 0 when total at start is 0", () => {
    expect(computeChurnRate(0, 0)).toBe(0);
  });

  it("returns 1 when all churned", () => {
    expect(computeChurnRate(10, 10)).toBe(1);
  });

  it("handles 0 canceled", () => {
    expect(computeChurnRate(0, 50)).toBe(0);
  });
});

describe("computeTrialConversion", () => {
  it("computes ratio of converted to total trials", () => {
    expect(computeTrialConversion(3, 10)).toBe(0.3);
  });

  it("returns 0 when total trials is 0", () => {
    expect(computeTrialConversion(0, 0)).toBe(0);
  });

  it("returns 1 when all trials converted", () => {
    expect(computeTrialConversion(5, 5)).toBe(1);
  });

  it("handles 0 converted", () => {
    expect(computeTrialConversion(0, 20)).toBe(0);
  });
});

describe("formatCentsToEuro", () => {
  it("formats cents to EUR currency string", () => {
    const result = formatCentsToEuro(1234);
    // The exact format depends on locale, but should contain 12.34
    expect(result).toContain("12.34");
  });

  it("formats 0 cents", () => {
    const result = formatCentsToEuro(0);
    expect(result).toContain("0.00");
  });
});
