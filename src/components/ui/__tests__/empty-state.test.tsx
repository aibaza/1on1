// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CalendarDays } from "lucide-react";
// Wave 0: This import will fail — empty-state.tsx does not exist yet.
// Wave 1 creates this file and makes the tests pass.
import { EmptyState } from "../empty-state";

describe("EmptyState (DES-04)", () => {
  it("renders heading text", () => {
    render(<EmptyState heading="No sessions yet" />);
    expect(screen.getByText("No sessions yet")).toBeTruthy();
  });

  it("renders description when provided", () => {
    render(
      <EmptyState
        heading="No sessions yet"
        description="Start by scheduling a session."
      />
    );
    expect(screen.getByText("Start by scheduling a session.")).toBeTruthy();
  });

  it("renders icon when provided", () => {
    const { container } = render(
      <EmptyState heading="No sessions yet" icon={CalendarDays} />
    );
    // Icon renders as an SVG element
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("renders action slot when provided", () => {
    render(
      <EmptyState
        heading="No sessions yet"
        action={<button>Schedule now</button>}
      />
    );
    expect(screen.getByRole("button", { name: "Schedule now" })).toBeTruthy();
  });

  it("renders without description or action without crashing", () => {
    expect(() => render(<EmptyState heading="Nothing here" />)).not.toThrow();
  });
});
