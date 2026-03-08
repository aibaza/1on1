// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
// Wave 0: categoryStepTestHelpers does not exist yet — export added in Wave 1.
// The import failure causes this test file to go RED as required.
import { categoryStepTestHelpers } from "../category-step";

describe("SectionLabel casing (DES-03)", () => {
  it("SectionLabel className does NOT contain 'uppercase'", () => {
    // Wave 1 exports getSectionLabelClassName() from category-step.tsx.
    // We call it here to get the class string and assert the DES-03 fix.
    const className = categoryStepTestHelpers.getSectionLabelClassName();
    expect(className.includes("uppercase")).toBe(false);
  });

  it("SectionLabel className does NOT contain 'tracking-wide'", () => {
    const className = categoryStepTestHelpers.getSectionLabelClassName();
    expect(className.includes("tracking-wide")).toBe(false);
  });
});
