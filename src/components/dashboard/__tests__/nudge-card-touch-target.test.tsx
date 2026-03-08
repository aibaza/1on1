// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NudgeCard } from "../nudge-card";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useMutation: () => ({ mutate: vi.fn(), isPending: false }),
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  };
});

const nudge = {
  id: "n1",
  content: "Test nudge",
  reason: null,
  priority: "medium",
  seriesId: "s1",
  reportName: "Alice",
  targetSessionAt: null,
};

describe("NudgeCard dismiss button touch target (MOB-03)", () => {
  it("dismiss button does not yet have size-11 touch target class", () => {
    render(<NudgeCard nudge={nudge} />);
    const btn = screen.getByTitle("dismiss");
    expect(btn).not.toHaveClass("size-11"); // This passes pre-fix (size-7 is current)
  });

  it("dismiss button has size-11 minimum touch target for mobile (MOB-03)", () => {
    render(<NudgeCard nudge={nudge} />);
    const btn = screen.getByTitle("dismiss");
    expect(btn).toHaveClass("size-11"); // FAILS pre-fix (current is size-7)
  });
});
