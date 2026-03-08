import { describe, it, expect } from "vitest";
// Wave 0: statusVariant is not exported from session-timeline.tsx yet.
// Wave 1 adds the named export and makes these tests pass (GREEN).
import { statusVariant } from "../session-timeline";

describe("statusVariant badge mapping (DES-02)", () => {
  it("in_progress maps to 'default' variant (active, high-weight)", () => {
    expect(statusVariant["in_progress"]).toBe("default");
  });

  it("completed maps to 'outline' variant (low-weight, receded)", () => {
    expect(statusVariant["completed"]).toBe("outline");
  });

  it("scheduled maps to 'outline' variant (low-weight, not yet active)", () => {
    expect(statusVariant["scheduled"]).toBe("outline");
  });

  it("cancelled maps to 'destructive' variant", () => {
    expect(statusVariant["cancelled"]).toBe("destructive");
  });
});
