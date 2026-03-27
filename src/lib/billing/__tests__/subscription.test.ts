import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getEffectivePlan,
  isTrialExpired,
  isInTrial,
  trialDaysRemaining,
  needsPayment,
  canAccessFeature,
  type Tenant,
} from "../subscription";

// Fixed reference time: 2026-03-15T12:00:00Z
const NOW = new Date("2026-03-15T12:00:00Z");

function makeTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    plan: overrides.plan ?? "free",
    isFounder: overrides.isFounder ?? false,
    founderDiscountPct: overrides.founderDiscountPct ?? 0,
    trialEndsAt: overrides.trialEndsAt ?? null,
  };
}

describe("subscription", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getEffectivePlan", () => {
    it("returns the plan for a normal tenant", () => {
      expect(getEffectivePlan(makeTenant({ plan: "starter" }))).toBe(
        "starter"
      );
    });

    it("returns the plan for a founder tenant", () => {
      expect(
        getEffectivePlan(
          makeTenant({ plan: "pro", isFounder: true, founderDiscountPct: 50 })
        )
      ).toBe("pro");
    });

    it("returns free for default tenant", () => {
      expect(getEffectivePlan(makeTenant())).toBe("free");
    });
  });

  describe("isTrialExpired", () => {
    it("returns false when no trial is set", () => {
      expect(isTrialExpired(makeTenant({ plan: "starter" }))).toBe(false);
    });

    it("returns false when trial is in the future", () => {
      const future = new Date("2026-03-22T12:00:00Z");
      expect(
        isTrialExpired(makeTenant({ plan: "starter", trialEndsAt: future }))
      ).toBe(false);
    });

    it("returns true when trial is in the past", () => {
      const past = new Date("2026-03-10T12:00:00Z");
      expect(
        isTrialExpired(makeTenant({ plan: "starter", trialEndsAt: past }))
      ).toBe(true);
    });

    it("returns false for founder regardless of trial date", () => {
      const past = new Date("2026-03-10T12:00:00Z");
      expect(
        isTrialExpired(
          makeTenant({ plan: "pro", isFounder: true, trialEndsAt: past })
        )
      ).toBe(false);
    });
  });

  describe("isInTrial", () => {
    it("returns true when within trial period", () => {
      const future = new Date("2026-03-22T12:00:00Z");
      expect(
        isInTrial(makeTenant({ plan: "starter", trialEndsAt: future }))
      ).toBe(true);
    });

    it("returns false when trial expired", () => {
      const past = new Date("2026-03-10T12:00:00Z");
      expect(
        isInTrial(makeTenant({ plan: "starter", trialEndsAt: past }))
      ).toBe(false);
    });

    it("returns false when no trial is set", () => {
      expect(isInTrial(makeTenant({ plan: "starter" }))).toBe(false);
    });

    it("returns false for founder even with active trial", () => {
      const future = new Date("2026-03-22T12:00:00Z");
      expect(
        isInTrial(
          makeTenant({ plan: "pro", isFounder: true, trialEndsAt: future })
        )
      ).toBe(false);
    });
  });

  describe("trialDaysRemaining", () => {
    it("returns correct days when trial is 7 days away", () => {
      const future = new Date("2026-03-22T12:00:00Z");
      expect(
        trialDaysRemaining(
          makeTenant({ plan: "starter", trialEndsAt: future })
        )
      ).toBe(7);
    });

    it("returns 0 when trial is expired", () => {
      const past = new Date("2026-03-10T12:00:00Z");
      expect(
        trialDaysRemaining(
          makeTenant({ plan: "starter", trialEndsAt: past })
        )
      ).toBe(0);
    });

    it("returns 0 when no trial is set", () => {
      expect(trialDaysRemaining(makeTenant())).toBe(0);
    });

    it("returns 0 for founder", () => {
      const future = new Date("2026-03-22T12:00:00Z");
      expect(
        trialDaysRemaining(
          makeTenant({ plan: "pro", isFounder: true, trialEndsAt: future })
        )
      ).toBe(0);
    });

    it("rounds up partial days", () => {
      // 6 days + 6 hours = should round up to 7
      const future = new Date("2026-03-21T18:00:00Z");
      expect(
        trialDaysRemaining(
          makeTenant({ plan: "starter", trialEndsAt: future })
        )
      ).toBe(7);
    });
  });

  describe("needsPayment", () => {
    it("returns false for free plan", () => {
      expect(needsPayment(makeTenant({ plan: "free" }))).toBe(false);
    });

    it("returns false for founder with 100% discount", () => {
      expect(
        needsPayment(
          makeTenant({
            plan: "pro",
            isFounder: true,
            founderDiscountPct: 100,
          })
        )
      ).toBe(false);
    });

    it("returns true for expired trial on pro plan", () => {
      const past = new Date("2026-03-10T12:00:00Z");
      expect(
        needsPayment(makeTenant({ plan: "pro", trialEndsAt: past }))
      ).toBe(true);
    });

    it("returns false while in active trial", () => {
      const future = new Date("2026-03-22T12:00:00Z");
      expect(
        needsPayment(makeTenant({ plan: "pro", trialEndsAt: future }))
      ).toBe(false);
    });

    it("returns false for founder with partial discount (no expired trial)", () => {
      // Founder with 50% discount, no trial set = isTrialExpired returns false
      expect(
        needsPayment(
          makeTenant({
            plan: "pro",
            isFounder: true,
            founderDiscountPct: 50,
          })
        )
      ).toBe(false);
    });
  });

  describe("canAccessFeature", () => {
    it("returns false for free plan + ai", () => {
      expect(canAccessFeature(makeTenant({ plan: "free" }), "ai")).toBe(false);
    });

    it("returns false for pro plan + ai (AI only on enterprise)", () => {
      expect(canAccessFeature(makeTenant({ plan: "pro" }), "ai")).toBe(false);
    });

    it("returns true for enterprise + branding", () => {
      expect(
        canAccessFeature(makeTenant({ plan: "enterprise" }), "branding")
      ).toBe(true);
    });

    it("returns false for unknown feature", () => {
      expect(
        canAccessFeature(makeTenant({ plan: "pro" }), "nonexistent")
      ).toBe(false);
    });

    it("returns true for free plan + analytics (basic is truthy)", () => {
      expect(
        canAccessFeature(makeTenant({ plan: "free" }), "analytics")
      ).toBe(true);
    });
  });
});
