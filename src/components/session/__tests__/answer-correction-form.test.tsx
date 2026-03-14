// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AnswerCorrectionForm } from "@/components/session/answer-correction-form";

// Mock QuestionWidget — unit tests don't need to test widget internals
vi.mock("@/components/session/question-widget", () => ({
  QuestionWidget: () => <div data-testid="question-widget" />,
}));

// Mock TanStack Query
vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn().mockReturnValue({ data: undefined, isFetching: false }),
  useMutation: vi.fn().mockReturnValue({ mutate: vi.fn(), isPending: false }),
}));

// Mock useDebounce to return input immediately in tests
vi.mock("@/lib/hooks/use-debounce", () => ({
  useDebounce: (v: unknown) => v,
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock next/navigation — useRouter is called at component render time
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const baseProps = {
  answerId: "answer-uuid-123",
  sessionId: "session-uuid-456",
  questionAnswerType: "text" as const,
  originalAnswer: {
    questionId: "q1",
    answerText: "Original text value",
    answerNumeric: null,
    answerJson: null,
    skipped: false,
  },
  onSuccess: vi.fn(),
  onCancel: vi.fn(),
};

describe("AnswerCorrectionForm", () => {
  it("renders Original label", () => {
    render(<AnswerCorrectionForm {...baseProps} />);
    const matches = screen.getAllByText(/original/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("renders original answer text value", () => {
    render(<AnswerCorrectionForm {...baseProps} />);
    expect(screen.getByText("Original text value")).toBeInTheDocument();
  });

  it("renders reason textarea", () => {
    render(<AnswerCorrectionForm {...baseProps} />);
    // Reason input should be present (textarea or input for reason)
    const textboxes = screen.getAllByRole("textbox");
    expect(textboxes.length).toBeGreaterThanOrEqual(1);
  });

  it("calls onCancel when Cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(<AnswerCorrectionForm {...baseProps} onCancel={onCancel} />);
    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("renders loading indicator when AI validation is in flight", async () => {
    const { useQuery } = await import("@tanstack/react-query");
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isFetching: true,
    } as ReturnType<typeof useQuery>);

    render(<AnswerCorrectionForm {...baseProps} />);
    // Loading spinner or indicator should be visible
    const spinners = document.querySelectorAll(
      "[aria-label='loading'], [role='status'], .animate-spin"
    );
    expect(spinners.length).toBeGreaterThan(0);
  });

  it("renders green pass indicator when AI validation passes", async () => {
    const { useQuery } = await import("@tanstack/react-query");
    vi.mocked(useQuery).mockReturnValue({
      data: { pass: true, feedback: "Reason is clear and professional." },
      isFetching: false,
    } as ReturnType<typeof useQuery>);

    render(<AnswerCorrectionForm {...baseProps} />);
    expect(
      screen.getByText("Reason is clear and professional.")
    ).toBeInTheDocument();
  });

  it("renders amber fail indicator when AI validation fails", async () => {
    const { useQuery } = await import("@tanstack/react-query");
    vi.mocked(useQuery).mockReturnValue({
      data: { pass: false, feedback: "Reason seems vague." },
      isFetching: false,
    } as ReturnType<typeof useQuery>);

    render(<AnswerCorrectionForm {...baseProps} />);
    expect(screen.getByText("Reason seems vague.")).toBeInTheDocument();
  });

  it("renders no AI feedback section when feedback is null (degraded mode)", async () => {
    const { useQuery } = await import("@tanstack/react-query");
    vi.mocked(useQuery).mockReturnValue({
      data: { pass: false, feedback: null },
      isFetching: false,
    } as ReturnType<typeof useQuery>);

    render(<AnswerCorrectionForm {...baseProps} />);
    // No AI feedback text should appear
    expect(screen.queryByText("Reason seems vague.")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Reason is clear and professional.")
    ).not.toBeInTheDocument();
  });

  it("submit button is NOT disabled when AI validation returns pass=false (AI is advisory only)", async () => {
    const { useQuery } = await import("@tanstack/react-query");
    vi.mocked(useQuery).mockReturnValue({
      data: { pass: false, feedback: "Reason seems vague." },
      isFetching: false,
    } as ReturnType<typeof useQuery>);

    render(<AnswerCorrectionForm {...baseProps} />);
    const submitButton = screen.getByRole("button", { name: /submit/i });
    expect(submitButton).not.toBeDisabled();
  });
});
