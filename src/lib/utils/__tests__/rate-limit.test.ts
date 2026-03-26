import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRateLimit, resetRateLimitStore } from "../rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useRealTimers();
    resetRateLimitStore();
  });

  it("allows requests under the limit", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("ip-1", 5, 60_000).allowed).toBe(true);
    }
  });

  it("blocks requests over the limit", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("ip-2", 5, 60_000);
    }
    const result = checkRateLimit("ip-2", 5, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("resets after the window expires", () => {
    vi.useFakeTimers();

    for (let i = 0; i < 5; i++) {
      checkRateLimit("ip-3", 5, 60_000);
    }
    expect(checkRateLimit("ip-3", 5, 60_000).allowed).toBe(false);

    vi.advanceTimersByTime(61_000);

    expect(checkRateLimit("ip-3", 5, 60_000).allowed).toBe(true);
  });

  it("tracks different keys independently", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("ip-a", 5, 60_000);
    }
    expect(checkRateLimit("ip-a", 5, 60_000).allowed).toBe(false);
    expect(checkRateLimit("ip-b", 5, 60_000).allowed).toBe(true);
  });
});
