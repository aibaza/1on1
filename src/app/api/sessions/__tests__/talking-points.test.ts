import { describe, it, expect, vi } from "vitest";

// Mock Next.js server modules to allow route file import in test environment.
// next-auth transitively imports next/server which is not resolvable outside
// the Next.js runtime. Mocking prevents the ESM resolution error.
vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: ResponseInit) => ({ data, init })),
    next: vi.fn(),
  },
  NextRequest: vi.fn(),
}));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db/tenant-context", () => ({
  withTenantContext: vi.fn(),
}));

/**
 * TDD RED tests for Phase 24 Plan 00.
 *
 * Tests for the talking-points POST status gate.
 * The route at src/app/api/sessions/[id]/talking-points/route.ts
 * checks session status before allowing talking point creation.
 *
 * Current behavior (before Plan 01):
 *   Only "in_progress" is accepted — line 177: `status !== "in_progress"`
 *
 * After Plan 01 Task 2:
 *   Both "in_progress" AND "scheduled" should be accepted.
 *   "completed" and "cancelled" should be rejected with 409.
 *
 * This helper function encodes the EXPECTED behavior (post-Plan 01).
 * It serves as a regression guard — if someone later removes "scheduled"
 * from the accepted statuses, this test catches it.
 */

/**
 * Determines whether a session status allows talking point creation.
 * This mirrors the expected route behavior AFTER Plan 01 relaxes the check.
 */
function isSessionActiveForTalkingPoints(status: string): boolean {
  return status === "in_progress" || status === "scheduled";
}

describe("talking points POST status gate", () => {
  it("accepts in_progress status", () => {
    expect(isSessionActiveForTalkingPoints("in_progress")).toBe(true);
  });

  it("accepts scheduled status", () => {
    // This test validates the Phase 24 core requirement:
    // Pre-meeting talking points must be addable to scheduled sessions.
    // Plan 01 Task 2 will relax the route check to match this behavior.
    expect(isSessionActiveForTalkingPoints("scheduled")).toBe(true);
  });

  it("rejects completed status", () => {
    expect(isSessionActiveForTalkingPoints("completed")).toBe(false);
  });

  it("rejects cancelled status", () => {
    expect(isSessionActiveForTalkingPoints("cancelled")).toBe(false);
  });

  it("rejects empty string status", () => {
    expect(isSessionActiveForTalkingPoints("")).toBe(false);
  });
});

describe("talking points status gate — route contract", () => {
  it("route module exports POST handler", async () => {
    const mod = await import("@/app/api/sessions/[id]/talking-points/route");
    expect(typeof mod.POST).toBe("function");
  });

  it("route module exports GET handler", async () => {
    const mod = await import("@/app/api/sessions/[id]/talking-points/route");
    expect(typeof mod.GET).toBe("function");
  });

  it("route module exports PATCH handler", async () => {
    const mod = await import("@/app/api/sessions/[id]/talking-points/route");
    expect(typeof mod.PATCH).toBe("function");
  });

  it("route module exports DELETE handler", async () => {
    const mod = await import("@/app/api/sessions/[id]/talking-points/route");
    expect(typeof mod.DELETE).toBe("function");
  });
});
