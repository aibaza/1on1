"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { WizardTopBar, type SaveStatus } from "./wizard-top-bar";
import { WizardNavigation } from "./wizard-navigation";
import { CategoryStep } from "./category-step";
import { RecapScreen } from "./recap-screen";
import { type AnswerValue } from "./question-widget";
import { useDebounce } from "@/lib/hooks/use-debounce";

// --- Types ---

interface TemplateQuestion {
  id: string;
  questionText: string;
  helpText: string | null;
  category: string;
  answerType: string;
  answerConfig: unknown;
  isRequired: boolean;
  sortOrder: number;
  conditionalOnQuestionId: string | null;
  conditionalOperator: string | null;
  conditionalValue: string | null;
}

interface SessionData {
  session: {
    id: string;
    seriesId: string;
    templateId: string | null;
    sessionNumber: number;
    status: string;
    scheduledAt: string;
    startedAt: string | null;
    completedAt: string | null;
    sharedNotes: Record<string, string> | null;
  };
  series: {
    id: string;
    managerId: string;
    reportId: string;
    cadence: string;
    manager: { id: string; firstName: string; lastName: string; avatarUrl: string | null } | null;
    report: { id: string; firstName: string; lastName: string; avatarUrl: string | null } | null;
  };
  template: {
    questions: TemplateQuestion[];
  };
  answers: Array<{
    id: string;
    questionId: string;
    answerText: string | null;
    answerNumeric: number | null;
    answerJson: unknown;
    skipped: boolean;
    answeredAt: string;
  }>;
  previousSessions: Array<{
    id: string;
    sessionNumber: number;
    scheduledAt: string;
    completedAt: string | null;
    sessionScore: number | null;
    sharedNotes: Record<string, string> | null;
    answers: Array<{
      questionId: string;
      answerText: string | null;
      answerNumeric: number | null;
      answerJson: unknown;
      skipped: boolean;
    }>;
  }>;
  openActionItems: Array<{
    id: string;
    title: string;
    status: string;
    dueDate: string | null;
    category: string | null;
    assigneeId: string;
    createdAt: string;
  }>;
}

interface CategoryGroup {
  name: string;
  questions: TemplateQuestion[];
}

// --- State Management ---

interface WizardState {
  currentStep: number;
  answers: Map<string, AnswerValue>;
  categories: CategoryGroup[];
  saveStatus: SaveStatus;
  pendingSaves: Set<string>;
}

type WizardAction =
  | { type: "INIT"; categories: CategoryGroup[]; answers: Map<string, AnswerValue> }
  | { type: "SET_STEP"; step: number }
  | { type: "SET_ANSWER"; questionId: string; value: AnswerValue }
  | { type: "SET_SAVE_STATUS"; status: SaveStatus }
  | { type: "ADD_PENDING"; questionId: string }
  | { type: "REMOVE_PENDING"; questionId: string };

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "INIT":
      return {
        ...state,
        categories: action.categories,
        answers: action.answers,
      };
    case "SET_STEP":
      return { ...state, currentStep: action.step };
    case "SET_ANSWER": {
      const newAnswers = new Map(state.answers);
      newAnswers.set(action.questionId, action.value);
      return { ...state, answers: newAnswers };
    }
    case "SET_SAVE_STATUS":
      return { ...state, saveStatus: action.status };
    case "ADD_PENDING": {
      const newPending = new Set(state.pendingSaves);
      newPending.add(action.questionId);
      return { ...state, pendingSaves: newPending };
    }
    case "REMOVE_PENDING": {
      const newPending = new Set(state.pendingSaves);
      newPending.delete(action.questionId);
      return { ...state, pendingSaves: newPending };
    }
    default:
      return state;
  }
}

// --- Helper Functions ---

/**
 * Groups template questions by category, preserving sort order.
 * Category order determined by first question's appearance in sortOrder.
 */
function groupQuestionsByCategory(
  questions: TemplateQuestion[]
): CategoryGroup[] {
  const groups = new Map<string, TemplateQuestion[]>();

  for (const q of questions) {
    if (!groups.has(q.category)) {
      groups.set(q.category, []);
    }
    groups.get(q.category)!.push(q);
  }

  return Array.from(groups.entries()).map(([name, qs]) => ({
    name,
    questions: qs,
  }));
}

/**
 * Evaluates whether a conditional question should be visible
 * based on the current answers across all categories.
 */
function evaluateCondition(
  question: TemplateQuestion,
  answers: Map<string, AnswerValue>
): boolean {
  if (!question.conditionalOnQuestionId || !question.conditionalOperator) {
    return true;
  }

  const parentAnswer = answers.get(question.conditionalOnQuestionId);
  if (!parentAnswer) return false;

  const parentValue =
    parentAnswer.answerNumeric ??
    (parentAnswer.answerJson
      ? JSON.stringify(parentAnswer.answerJson)
      : null) ??
    parentAnswer.answerText ??
    null;

  if (parentValue == null) return false;

  const condValue = question.conditionalValue ?? "";
  const numParent = Number(parentValue);
  const numCond = Number(condValue);
  const useNumeric = !isNaN(numParent) && !isNaN(numCond);

  switch (question.conditionalOperator) {
    case "eq":
      return String(parentValue) === condValue;
    case "neq":
      return String(parentValue) !== condValue;
    case "lt":
      return useNumeric ? numParent < numCond : String(parentValue) < condValue;
    case "gt":
      return useNumeric ? numParent > numCond : String(parentValue) > condValue;
    case "lte":
      return useNumeric
        ? numParent <= numCond
        : String(parentValue) <= condValue;
    case "gte":
      return useNumeric
        ? numParent >= numCond
        : String(parentValue) >= condValue;
    default:
      return true;
  }
}

// --- Component ---

interface WizardShellProps {
  sessionId: string;
}

export function WizardShell({ sessionId }: WizardShellProps) {
  const [state, dispatch] = useReducer(wizardReducer, {
    currentStep: 0,
    answers: new Map(),
    categories: [],
    saveStatus: "saved" as SaveStatus,
    pendingSaves: new Set<string>(),
  });

  const initializedRef = useRef(false);
  // Track the latest changed answer for debounced saving
  const lastChangedRef = useRef<{
    questionId: string;
    value: AnswerValue;
  } | null>(null);

  // Fetch session data
  const { data, isLoading, error } = useQuery<SessionData>({
    queryKey: ["session", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (!res.ok) throw new Error("Failed to load session");
      return res.json();
    },
  });

  // Initialize state from fetched data
  useEffect(() => {
    if (data && !initializedRef.current) {
      initializedRef.current = true;
      const categories = groupQuestionsByCategory(data.template.questions);

      // Build initial answers map from existing answers
      const answersMap = new Map<string, AnswerValue>();
      for (const a of data.answers) {
        answersMap.set(a.questionId, {
          answerText: a.answerText ?? undefined,
          answerNumeric: a.answerNumeric ?? undefined,
          answerJson: a.answerJson ?? undefined,
        });
      }

      dispatch({ type: "INIT", categories, answers: answersMap });
    }
  }, [data]);

  // Answer save mutation
  const saveAnswer = useMutation({
    mutationFn: async ({
      questionId,
      value,
    }: {
      questionId: string;
      value: AnswerValue;
    }) => {
      const res = await fetch(`/api/sessions/${sessionId}/answers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          answerText: value.answerText,
          answerNumeric: value.answerNumeric,
          answerJson: value.answerJson,
        }),
      });
      if (!res.ok) throw new Error("Failed to save answer");
      return res.json();
    },
    onMutate: () => {
      dispatch({ type: "SET_SAVE_STATUS", status: "saving" });
    },
    onSuccess: () => {
      dispatch({ type: "SET_SAVE_STATUS", status: "saved" });
    },
    onError: () => {
      dispatch({ type: "SET_SAVE_STATUS", status: "error" });
    },
  });

  // Debounced saving: track last changed answer
  const debouncedChange = useDebounce(lastChangedRef.current, 500);

  useEffect(() => {
    if (debouncedChange) {
      saveAnswer.mutate({
        questionId: debouncedChange.questionId,
        value: debouncedChange.value,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedChange]);

  // Handle answer changes
  const handleAnswerChange = useCallback(
    (questionId: string, value: AnswerValue) => {
      dispatch({ type: "SET_ANSWER", questionId, value });
      lastChangedRef.current = { questionId, value };
      // Force a re-render to trigger debounce
      dispatch({ type: "SET_SAVE_STATUS", status: "saving" });
    },
    []
  );

  // beforeunload: save pending changes immediately
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (lastChangedRef.current && state.saveStatus === "saving") {
        // Fire immediate save (navigator.sendBeacon would be ideal but
        // we need auth headers, so we use a sync-ish fetch)
        const { questionId, value } = lastChangedRef.current;
        const body = JSON.stringify({
          questionId,
          answerText: value.answerText,
          answerNumeric: value.answerNumeric,
          answerJson: value.answerJson,
        });
        // Use sendBeacon for reliability on page close
        navigator.sendBeacon(
          `/api/sessions/${sessionId}/answers`,
          new Blob([body], { type: "application/json" })
        );
        e.preventDefault();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [sessionId, state.saveStatus]);

  // Evaluate conditional visibility
  const isQuestionVisible = useCallback(
    (question: TemplateQuestion) => evaluateCondition(question, state.answers),
    [state.answers]
  );

  // Build step names: [Recap, ...categories, Summary]
  const stepNames = useMemo(
    () => [
      "Recap",
      ...state.categories.map((c) => {
        const labels: Record<string, string> = {
          check_in: "Check-in",
          wellbeing: "Wellbeing",
          engagement: "Engagement",
          performance: "Performance",
          career: "Career",
          feedback: "Feedback",
          recognition: "Recognition",
          goals: "Goals",
          custom: "Custom",
        };
        return labels[c.name] ?? c.name;
      }),
    ],
    [state.categories]
  );

  const totalSteps = stepNames.length;

  // Navigation handlers
  const handleStepChange = useCallback(
    (step: number) => dispatch({ type: "SET_STEP", step }),
    []
  );

  const handlePrev = useCallback(() => {
    if (state.currentStep > 0) {
      dispatch({ type: "SET_STEP", step: state.currentStep - 1 });
    }
  }, [state.currentStep]);

  const handleNext = useCallback(() => {
    if (state.currentStep < totalSteps - 1) {
      dispatch({ type: "SET_STEP", step: state.currentStep + 1 });
    }
  }, [state.currentStep, totalSteps]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="text-lg font-medium">Failed to load session</p>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </div>
    );
  }

  const reportName = data.series.report
    ? `${data.series.report.firstName} ${data.series.report.lastName}`
    : "Unknown";

  const hasUnsavedChanges = state.saveStatus === "saving";

  // Determine current step content
  const isRecapStep = state.currentStep === 0;
  const categoryIndex = state.currentStep - 1; // -1 for recap
  const currentCategory =
    categoryIndex >= 0 && categoryIndex < state.categories.length
      ? state.categories[categoryIndex]
      : null;

  return (
    <>
      <WizardTopBar
        seriesId={data.session.seriesId}
        reportName={reportName}
        sessionNumber={data.session.sessionNumber}
        date={data.session.startedAt ?? data.session.scheduledAt}
        saveStatus={state.saveStatus}
        hasUnsavedChanges={hasUnsavedChanges}
      />

      {/* Main content area */}
      {isRecapStep ? (
        <RecapScreen
          reportName={reportName}
          previousSessions={data.previousSessions}
          openActionItems={data.openActionItems}
        />
      ) : currentCategory ? (
        <CategoryStep
          categoryName={currentCategory.name}
          questions={currentCategory.questions}
          answers={state.answers}
          onAnswerChange={handleAnswerChange}
          isQuestionVisible={isQuestionVisible}
          disabled={data.session.status === "completed"}
        />
      ) : (
        // Summary step placeholder (filled in Plan 05)
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium">Summary</p>
            <p className="text-sm">
              Session summary and completion will be available in Plan 05.
            </p>
          </div>
        </div>
      )}

      <WizardNavigation
        currentStep={state.currentStep}
        totalSteps={totalSteps}
        stepNames={stepNames}
        onStepChange={handleStepChange}
        onPrev={handlePrev}
        onNext={handleNext}
      />
    </>
  );
}
