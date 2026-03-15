// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
// @ts-expect-error — date-picker.tsx does not exist yet (TDD RED, plan 22-02 creates it)
import { DatePicker } from "@/components/ui/date-picker";

// DatePicker behavioral contract (INP-01):
// - Accepts value: string (YYYY-MM-DD or "")
// - Calls onChange(value: string) with YYYY-MM-DD when date selected
// - Calls onChange("") when date cleared
// - Renders a trigger button (role="button"), not a native date input
// - Does NOT render <input type="date">

describe("DatePicker", () => {
  it("renders a button trigger element, not a native date input", () => {
    const onChange = vi.fn();
    render(<DatePicker value="" onChange={onChange} placeholder="Pick a date" />);

    // Should have a button trigger
    const button = screen.getByRole("button");
    expect(button).toBeDefined();

    // Should NOT have a native date input
    const nativeInput = document.querySelector('input[type="date"]');
    expect(nativeInput).toBeNull();
  });

  it("shows placeholder text when value is empty string", () => {
    const onChange = vi.fn();
    const { container } = render(
      <DatePicker value="" onChange={onChange} placeholder="Select a date" />
    );

    // Trigger button should show the placeholder text
    expect(container.textContent).toContain("Select a date");
  });

  it("shows a formatted date string (not raw YYYY-MM-DD) when value is provided", () => {
    const onChange = vi.fn();
    const { container } = render(
      <DatePicker value="2026-03-15" onChange={onChange} placeholder="Pick a date" />
    );

    // date-fns format(parseISO("2026-03-15"), "PPP") produces e.g. "March 15th, 2026"
    // The raw string "2026-03-15" must NOT be what's displayed
    expect(container.textContent).not.toContain("2026-03-15");
    // It should contain something date-like (year at minimum)
    expect(container.textContent).toContain("2026");
  });

  it("calls onChange with YYYY-MM-DD string format when a date is selected", async () => {
    const onChange = vi.fn();
    render(
      <DatePicker value="" onChange={onChange} placeholder="Pick a date" />
    );

    // Click the trigger to open the popover
    const button = screen.getByRole("button");
    fireEvent.click(button);

    // The calendar grid should appear — find a day button
    // DayPicker renders day cells; click the 15th day
    const dayButtons = screen.getAllByRole("button");
    const day15 = dayButtons.find(
      (btn) => btn.textContent?.trim() === "15"
    );
    expect(day15).toBeDefined();

    if (day15) {
      fireEvent.click(day15);
      // onChange should be called with a YYYY-MM-DD string
      expect(onChange).toHaveBeenCalledOnce();
      const calledWith = onChange.mock.calls[0][0];
      expect(calledWith).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
