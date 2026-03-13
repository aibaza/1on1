// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CorrectionHistoryPanel } from "@/components/session/correction-history-panel";

type CorrectionEntry = {
  id: string;
  sessionAnswerId: string;
  correctedById: string;
  correctorFirstName: string;
  correctorLastName: string;
  originalAnswerText: string | null;
  originalAnswerNumeric: number | null;
  originalAnswerJson: unknown;
  originalSkipped: boolean;
  correctionReason: string;
  createdAt: string; // ISO string
};

const mockEntry: CorrectionEntry = {
  id: "h1",
  sessionAnswerId: "a1",
  correctedById: "u1",
  correctorFirstName: "Jane",
  correctorLastName: "Smith",
  originalAnswerText: "Original answer text",
  originalAnswerNumeric: null,
  originalAnswerJson: null,
  originalSkipped: false,
  correctionReason: "Corrected because the meeting notes were inaccurate",
  createdAt: new Date().toISOString(),
};

describe("CorrectionHistoryPanel", () => {
  it("renders panel trigger when corrections is empty array", () => {
    const { container } = render(
      <CorrectionHistoryPanel corrections={[]} isManager={false} />
    );
    // Panel trigger should exist but content should not be expanded (empty state)
    expect(container.firstChild).not.toBeNull();
    expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
  });

  it("renders corrector full name when corrections has entries", () => {
    render(
      <CorrectionHistoryPanel corrections={[mockEntry]} isManager={false} />
    );
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  it("renders correction reason text when isManager is true", () => {
    render(
      <CorrectionHistoryPanel corrections={[mockEntry]} isManager={true} />
    );
    expect(
      screen.getByText("Corrected because the meeting notes were inaccurate")
    ).toBeInTheDocument();
  });

  it("does NOT render correction reason text when isManager is false", () => {
    render(
      <CorrectionHistoryPanel corrections={[mockEntry]} isManager={false} />
    );
    expect(
      screen.queryByText("Corrected because the meeting notes were inaccurate")
    ).not.toBeInTheDocument();
  });

  it("renders entry count badge showing number of corrections", () => {
    render(
      <CorrectionHistoryPanel corrections={[mockEntry]} isManager={false} />
    );
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
