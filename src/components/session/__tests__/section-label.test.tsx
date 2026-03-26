// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
// Wave 0: categoryStepTestHelpers does not exist yet — export added in Wave 1.
// The import failure causes this test file to go RED as required.
import { categoryStepTestHelpers } from "../category-step";

describe("SectionLabel casing (DES-03)", () => {
  it("SectionLabel className contains 'uppercase'", () => {
    const className = categoryStepTestHelpers.getSectionLabelClassName();
    expect(className.includes("uppercase")).toBe(true);
  });

  it("SectionLabel className contains 'tracking-widest'", () => {
    const className = categoryStepTestHelpers.getSectionLabelClassName();
    expect(className.includes("tracking-widest")).toBe(true);
  });
});
