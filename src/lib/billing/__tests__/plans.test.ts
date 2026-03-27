import { describe, it, expect } from "vitest";
import {
  getPlanFeatures,
  hasFeature,
  getLimit,
  PLAN_FEATURES,
} from "../plans";

describe("getPlanFeatures", () => {
  it("returns correct features for free plan", () => {
    const f = getPlanFeatures("free");
    expect(f.seats).toBe(4);
    expect(f.managers).toBe(1);
    expect(f.templates).toBe(3);
    expect(f.ai).toBe(false);
    expect(f.analytics).toBe("basic");
  });

  it("returns correct features for starter plan", () => {
    const f = getPlanFeatures("starter");
    expect(f.seats).toBe(10);
    expect(f.managers).toBe(3);
    expect(f.templates).toBe(10);
    expect(f.ai).toBe(false);
    expect(f.analytics).toBe("full");
  });

  it("returns correct features for pro plan", () => {
    const f = getPlanFeatures("pro");
    expect(f.seats).toBe(50);
    expect(f.managers).toBe(-1);
    expect(f.templates).toBe(-1);
    expect(f.ai).toBe(false);
    expect(f.analytics).toBe("full");
  });

  it("returns correct features for enterprise plan", () => {
    const f = getPlanFeatures("enterprise");
    expect(f.seats).toBe(-1);
    expect(f.managers).toBe(-1);
    expect(f.templates).toBe(-1);
    expect(f.ai).toBe(true);
    expect(f.analytics).toBe("full");
    expect(f.branding).toBe(true);
    expect(f.api).toBe(true);
  });

  it("defaults to free for unknown plan", () => {
    expect(getPlanFeatures("nonexistent")).toEqual(PLAN_FEATURES.free);
  });

  it("defaults to free for empty string", () => {
    expect(getPlanFeatures("")).toEqual(PLAN_FEATURES.free);
  });
});

describe("hasFeature", () => {
  it("returns false for boolean feature that is off (free + ai)", () => {
    expect(hasFeature("free", "ai")).toBe(false);
  });

  it("returns false for boolean feature that is off (pro + ai)", () => {
    expect(hasFeature("pro", "ai")).toBe(false);
  });

  it("returns true for boolean feature that is on (enterprise + ai)", () => {
    expect(hasFeature("enterprise", "ai")).toBe(true);
  });

  it("returns true for numeric feature with positive value (free + seats)", () => {
    expect(hasFeature("free", "seats")).toBe(true);
  });

  it("returns true for numeric feature with -1 unlimited (pro + managers)", () => {
    expect(hasFeature("pro", "managers")).toBe(true);
  });

  it("returns true for string feature (free + analytics = basic)", () => {
    expect(hasFeature("free", "analytics")).toBe(true);
  });

  it("returns true for enterprise branding", () => {
    expect(hasFeature("enterprise", "branding")).toBe(true);
  });

  it("returns false for optional feature not present (free + branding)", () => {
    expect(hasFeature("free", "branding")).toBe(false);
  });

  it("returns false for optional feature not present (free + api)", () => {
    expect(hasFeature("free", "api")).toBe(false);
  });
});

describe("getLimit", () => {
  it("returns seat limit for free plan", () => {
    expect(getLimit("free", "seats")).toBe(4);
  });

  it("returns manager limit for starter plan", () => {
    expect(getLimit("starter", "managers")).toBe(3);
  });

  it("returns template limit for starter plan", () => {
    expect(getLimit("starter", "templates")).toBe(10);
  });

  it("returns -1 (unlimited) for pro managers", () => {
    expect(getLimit("pro", "managers")).toBe(-1);
  });

  it("returns -1 (unlimited) for enterprise seats", () => {
    expect(getLimit("enterprise", "seats")).toBe(-1);
  });

  it("defaults to free limits for unknown plan", () => {
    expect(getLimit("unknown", "seats")).toBe(4);
    expect(getLimit("unknown", "managers")).toBe(1);
    expect(getLimit("unknown", "templates")).toBe(3);
  });
});
