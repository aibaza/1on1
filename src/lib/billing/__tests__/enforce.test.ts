import { describe, it, expect } from "vitest";
import { needsPayment, canAccessFeature } from "../subscription";
import { getLimit } from "../plans";

/**
 * The enforce module functions (requireActivePlan, checkSeatLimit, requireFeature)
 * make real DB calls via adminDb, so full integration tests require a database.
 *
 * These tests verify the underlying pure decision logic that enforce relies on.
 * The enforce functions are thin wrappers around these pure functions + DB queries.
 *
 * For plan feature tests, see plans.test.ts.
 * For subscription state tests, see subscription.test.ts.
 */

describe("enforce decision logic: needsPayment", () => {
  it("returns false for free plan (no payment needed)", () => {
    expect(
      needsPayment({
        plan: "free",
        isFounder: false,
        founderDiscountPct: 0,
        trialEndsAt: null,
      })
    ).toBe(false);
  });

  it("returns true for expired trial on paid plan", () => {
    const pastDate = new Date(Date.now() - 86_400_000);
    expect(
      needsPayment({
        plan: "pro",
        isFounder: false,
        founderDiscountPct: 0,
        trialEndsAt: pastDate,
      })
    ).toBe(true);
  });

  it("returns false for active trial on paid plan", () => {
    const futureDate = new Date(Date.now() + 86_400_000 * 7);
    expect(
      needsPayment({
        plan: "pro",
        isFounder: false,
        founderDiscountPct: 0,
        trialEndsAt: futureDate,
      })
    ).toBe(false);
  });

  it("returns false for founder with 100% discount even if trial expired", () => {
    const pastDate = new Date(Date.now() - 86_400_000);
    expect(
      needsPayment({
        plan: "pro",
        isFounder: true,
        founderDiscountPct: 100,
        trialEndsAt: pastDate,
      })
    ).toBe(false);
  });
});

describe("enforce decision logic: canAccessFeature", () => {
  it("returns false for free plan AI", () => {
    expect(
      canAccessFeature(
        {
          plan: "free",
          isFounder: false,
          founderDiscountPct: 0,
          trialEndsAt: null,
        },
        "ai"
      )
    ).toBe(false);
  });

  it("returns true for starter plan AI", () => {
    expect(
      canAccessFeature(
        {
          plan: "starter",
          isFounder: false,
          founderDiscountPct: 0,
          trialEndsAt: null,
        },
        "ai"
      )
    ).toBe(true);
  });

  it("returns true for pro plan AI", () => {
    expect(
      canAccessFeature(
        {
          plan: "pro",
          isFounder: false,
          founderDiscountPct: 0,
          trialEndsAt: null,
        },
        "ai"
      )
    ).toBe(true);
  });

  it("returns false for free plan branding", () => {
    expect(
      canAccessFeature(
        {
          plan: "free",
          isFounder: false,
          founderDiscountPct: 0,
          trialEndsAt: null,
        },
        "branding"
      )
    ).toBe(false);
  });

  it("returns true for enterprise branding", () => {
    expect(
      canAccessFeature(
        {
          plan: "enterprise",
          isFounder: false,
          founderDiscountPct: 0,
          trialEndsAt: null,
        },
        "branding"
      )
    ).toBe(true);
  });
});

describe("enforce decision logic: seat limits", () => {
  it("returns 4 seats for free plan", () => {
    expect(getLimit("free", "seats")).toBe(4);
  });

  it("returns 10 seats for starter plan", () => {
    expect(getLimit("starter", "seats")).toBe(10);
  });

  it("returns -1 (unlimited) for enterprise seats", () => {
    expect(getLimit("enterprise", "seats")).toBe(-1);
  });

  it("returns 50 seats for pro plan", () => {
    expect(getLimit("pro", "seats")).toBe(50);
  });
});
