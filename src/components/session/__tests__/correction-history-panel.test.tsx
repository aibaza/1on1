// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { CorrectionHistoryPanel } from "@/components/session/correction-history-panel";
import type { CorrectionEntry } from "@/components/session/correction-history-panel";

// Hoist mock ref so it's available inside vi.mock factory
const { mockRefresh } = vi.hoisted(() => ({ mockRefresh: vi.fn() }));

// Mock next/navigation — useRouter is called at component render time
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

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
  questionText: "How are you feeling?",
  answerType: "text",
  afterAnswerText: "Updated answer text",
  afterAnswerNumeric: null,
  afterAnswerJson: null,
  afterSkipped: false,
};

afterEach(() => {
  vi.restoreAllMocks();
  mockRefresh.mockReset();
});

describe("CorrectionHistoryPanel", () => {
  it("renders panel trigger when corrections is empty array", () => {
    const { container } = render(
      <CorrectionHistoryPanel
        corrections={[]}
        isManager={false}
        isAdmin={false}
        sessionId="s1"
      />
    );
    // Panel trigger should exist but content should not be expanded (empty state)
    expect(container.firstChild).not.toBeNull();
    expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
  });

  it("renders corrector full name when corrections has entries", () => {
    render(
      <CorrectionHistoryPanel
        corrections={[mockEntry]}
        isManager={false}
        isAdmin={false}
        sessionId="s1"
      />
    );
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  it("renders correction reason text when isManager is true", () => {
    render(
      <CorrectionHistoryPanel
        corrections={[mockEntry]}
        isManager={true}
        isAdmin={false}
        sessionId="s1"
      />
    );
    expect(
      screen.getByText("Corrected because the meeting notes were inaccurate")
    ).toBeInTheDocument();
  });

  it("does NOT render correction reason text when isManager is false", () => {
    render(
      <CorrectionHistoryPanel
        corrections={[mockEntry]}
        isManager={false}
        isAdmin={false}
        sessionId="s1"
      />
    );
    expect(
      screen.queryByText("Corrected because the meeting notes were inaccurate")
    ).not.toBeInTheDocument();
  });

  it("renders entry count badge showing number of corrections", () => {
    render(
      <CorrectionHistoryPanel
        corrections={[mockEntry]}
        isManager={false}
        isAdmin={false}
        sessionId="s1"
      />
    );
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows before and after values", () => {
    render(
      <CorrectionHistoryPanel
        corrections={[mockEntry]}
        isManager={false}
        isAdmin={false}
        sessionId="s1"
      />
    );
    expect(screen.getByText("Original answer text")).toBeInTheDocument();
    expect(screen.getByText("Updated answer text")).toBeInTheDocument();
  });

  it("shows Revert button only for admin", () => {
    const { rerender } = render(
      <CorrectionHistoryPanel
        corrections={[mockEntry]}
        isManager={false}
        isAdmin={false}
        sessionId="s1"
      />
    );
    expect(screen.queryByText("Revert")).not.toBeInTheDocument();

    rerender(
      <CorrectionHistoryPanel
        corrections={[mockEntry]}
        isManager={false}
        isAdmin={true}
        sessionId="s1"
      />
    );
    expect(screen.getByText("Revert")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Revert interaction tests
  // -------------------------------------------------------------------------

  it("clicking Revert shows confirmation with 'Restore answer to this before-value?' text", () => {
    render(
      <CorrectionHistoryPanel
        corrections={[mockEntry]}
        isManager={false}
        isAdmin={true}
        sessionId="s1"
      />
    );
    fireEvent.click(screen.getByText("Revert"));
    expect(
      screen.getByText("Restore answer to this before-value?")
    ).toBeInTheDocument();
  });

  it("clicking Cancel in confirmation hides it and shows Revert button again", () => {
    render(
      <CorrectionHistoryPanel
        corrections={[mockEntry]}
        isManager={false}
        isAdmin={true}
        sessionId="s1"
      />
    );
    fireEvent.click(screen.getByText("Revert"));
    expect(
      screen.getByText("Restore answer to this before-value?")
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText("Cancel"));
    expect(
      screen.queryByText("Restore answer to this before-value?")
    ).not.toBeInTheDocument();
    expect(screen.getByText("Revert")).toBeInTheDocument();
  });

  it("clicking Confirm calls fetch POST to revert endpoint with historyId", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: vi.fn() });
    global.fetch = fetchMock;

    render(
      <CorrectionHistoryPanel
        corrections={[mockEntry]}
        isManager={false}
        isAdmin={true}
        sessionId="s1"
      />
    );
    fireEvent.click(screen.getByText("Revert"));
    await act(async () => {
      fireEvent.click(screen.getByText("Confirm"));
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/sessions/s1/corrections/revert",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ historyId: "h1" }),
      })
    );
  });

  it("while fetch is pending shows 'Reverting…' text", async () => {
    let resolveRequest!: () => void;
    const pending = new Promise<Response>((res) => {
      resolveRequest = () =>
        res({ ok: true, json: async () => ({}) } as Response);
    });
    global.fetch = vi.fn().mockReturnValue(pending);

    render(
      <CorrectionHistoryPanel
        corrections={[mockEntry]}
        isManager={false}
        isAdmin={true}
        sessionId="s1"
      />
    );
    fireEvent.click(screen.getByText("Revert"));
    act(() => {
      fireEvent.click(screen.getByText("Confirm"));
    });

    await waitFor(() =>
      expect(screen.getByText("Reverting…")).toBeInTheDocument()
    );

    // Clean up
    await act(async () => resolveRequest());
  });

  it("on fetch success (200) calls router.refresh()", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: vi.fn() });

    render(
      <CorrectionHistoryPanel
        corrections={[mockEntry]}
        isManager={false}
        isAdmin={true}
        sessionId="s1"
      />
    );
    fireEvent.click(screen.getByText("Revert"));
    await act(async () => {
      fireEvent.click(screen.getByText("Confirm"));
    });

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("on fetch error response (500) shows error message and Dismiss button", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Revert failed due to server error" }),
    });

    render(
      <CorrectionHistoryPanel
        corrections={[mockEntry]}
        isManager={false}
        isAdmin={true}
        sessionId="s1"
      />
    );
    fireEvent.click(screen.getByText("Revert"));
    await act(async () => {
      fireEvent.click(screen.getByText("Confirm"));
    });

    await waitFor(() =>
      expect(
        screen.getByText("Revert failed due to server error")
      ).toBeInTheDocument()
    );
    expect(screen.getByText("Dismiss")).toBeInTheDocument();
  });

  it("clicking Dismiss hides error and shows Revert button again", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Revert failed" }),
    });

    render(
      <CorrectionHistoryPanel
        corrections={[mockEntry]}
        isManager={false}
        isAdmin={true}
        sessionId="s1"
      />
    );
    fireEvent.click(screen.getByText("Revert"));
    await act(async () => {
      fireEvent.click(screen.getByText("Confirm"));
    });

    await waitFor(() =>
      expect(screen.getByText("Dismiss")).toBeInTheDocument()
    );
    fireEvent.click(screen.getByText("Dismiss"));

    expect(screen.queryByText("Dismiss")).not.toBeInTheDocument();
    expect(screen.getByText("Revert")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // formatAnswerValue logic tests (via render)
  // -------------------------------------------------------------------------

  it("yes_no with numeric=1 shows 'Yes' in before/after pills", () => {
    const entry: CorrectionEntry = {
      ...mockEntry,
      answerType: "yes_no",
      originalAnswerText: null,
      originalAnswerNumeric: 1,
      afterAnswerText: null,
      afterAnswerNumeric: 0,
    };
    render(
      <CorrectionHistoryPanel
        corrections={[entry]}
        isManager={false}
        isAdmin={false}
        sessionId="s1"
      />
    );
    expect(screen.getByText("Yes")).toBeInTheDocument();
  });

  it("yes_no with numeric=0 shows 'No' in before/after pills", () => {
    const entry: CorrectionEntry = {
      ...mockEntry,
      answerType: "yes_no",
      originalAnswerText: null,
      originalAnswerNumeric: 0,
      afterAnswerText: null,
      afterAnswerNumeric: 1,
    };
    render(
      <CorrectionHistoryPanel
        corrections={[entry]}
        isManager={false}
        isAdmin={false}
        sessionId="s1"
      />
    );
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("mood with numeric=3 shows '3' in before/after pills", () => {
    const entry: CorrectionEntry = {
      ...mockEntry,
      answerType: "mood",
      originalAnswerText: null,
      originalAnswerNumeric: 3,
      afterAnswerText: null,
      afterAnswerNumeric: 5,
    };
    render(
      <CorrectionHistoryPanel
        corrections={[entry]}
        isManager={false}
        isAdmin={false}
        sessionId="s1"
      />
    );
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("originalSkipped=true shows 'Skipped' in before pill", () => {
    const entry: CorrectionEntry = {
      ...mockEntry,
      originalSkipped: true,
      originalAnswerText: null,
      originalAnswerNumeric: null,
      afterAnswerText: "Now answered",
      afterSkipped: false,
    };
    render(
      <CorrectionHistoryPanel
        corrections={[entry]}
        isManager={false}
        isAdmin={false}
        sessionId="s1"
      />
    );
    expect(screen.getByText("Skipped")).toBeInTheDocument();
  });
});
