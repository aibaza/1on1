"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { WizardTopBar, type SaveStatus } from "./wizard-top-bar";
import { WizardNavigation } from "./wizard-navigation";
import { CategoryStep } from "./category-step";
import { RecapScreen } from "./recap-screen";
import { SummaryScreen } from "./summary-screen";
import { ContextPanel, type OpenActionItem } from "./context-panel";
import { QuestionHistoryDialog, type PreviousSession } from "./question-history-dialog";
import { type AnswerValue } from "./question-widget";
import { type TalkingPoint } from "./talking-point-list";
import { type ActionItemData } from "./action-item-inline";
import { useDebounce } from "@/lib/hooks/use-debounce";

// --- Types ---

interface TemplateSection {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
}

interface TemplateQuestion {
  id: string;
  questionText: string;
  helpText: string | null;
  sectionId: string;
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
    sections: TemplateSection[];
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

interface SectionGroup {
  id: string;
  name: string;
  questions: TemplateQuestion[];
}

// --- State Management ---

interface WizardState {
  currentStep: number;
  answers: Map<string, AnswerValue>;
  sections: SectionGroup[];
  saveStatus: SaveStatus;
  pendingSaves: Set<string>;
  /** Track number of active saving operations (notes, talking points, action items) */
  activeSavingCount: number;
}

type WizardAction =
  | { type: "INIT"; sections: SectionGroup[]; answers: Map<string, AnswerValue> }
  | { type: "SET_STEP"; step: number }
  | { type: "SET_ANSWER"; questionId: string; value: AnswerValue }
  | { type: "SET_SAVE_STATUS"; status: SaveStatus }
  | { type: "ADD_PENDING"; questionId: string }
  | { type: "REMOVE_PENDING"; questionId: string }
  | { type: "INC_SAVING" }
  | { type: "DEC_SAVING" };

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "INIT":
      return {
        ...state,
        sections: action.sections,
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
    case "INC_SAVING":
      return { ...state, activeSavingCount: state.activeSavingCount + 1 };
    case "DEC_SAVING":
      return {
        ...state,
        activeSavingCount: Math.max(0, state.activeSavingCount - 1),
      };
    default:
      return state;
  }
}

// --- Helper Functions ---

/**
 * Groups template questions into sections, preserving section sort order.
 */
function groupQuestionsBySections(
  sections: TemplateSection[],
  questions: TemplateQuestion[]
): SectionGroup[] {
  const questionsBySection = new Map<string, TemplateQuestion[]>();

  for (const q of questions) {
    if (!questionsBySection.has(q.sectionId)) {
      questionsBySection.set(q.sectionId, []);
    }
    questionsBySection.get(q.sectionId)!.push(q);
  }

  return sections.map((section) => ({
    id: section.id,
    name: section.name,
    questions: questionsBySection.get(section.id) ?? [],
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
  const { data: authSession } = useSession();
  const [state, dispatch] = useReducer(wizardReducer, {
    currentStep: 0,
    answers: new Map(),
    sections: [],
    saveStatus: "saved" as SaveStatus,
    pendingSaves: new Set<string>(),
    activeSavingCount: 0,
  });

  const initializedRef = useRef(false);
  // Track the latest changed answer for debounced saving
  const lastChangedRef = useRef<{
    questionId: string;
    value: AnswerValue;
  } | null>(null);

  // --- Private notes state ---
  const [privateNotes, setPrivateNotes] = useState<Record<string, string>>({});

  // --- Talking points state keyed by category ---
  const [talkingPointsByCategory, setTalkingPointsByCategory] = useState<
    Record<string, TalkingPoint[]>
  >({});

  // --- Action items state keyed by category ---
  const [actionItemsByCategory, setActionItemsByCategory] = useState<
    Record<string, ActionItemData[]>
  >({});

  // --- Question history dialog ---
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyQuestionId, setHistoryQuestionId] = useState<string>("");

  // Fetch session data
  const { data, isLoading, error } = useQuery<SessionData>({
    queryKey: ["session", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (!res.ok) throw new Error("Failed to load session");
      return res.json();
    },
  });

  // Fetch private notes
  const { data: privateNotesData } = useQuery<{ notes: Record<string, string> }>({
    queryKey: ["session", sessionId, "private-notes"],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}/notes/private`);
      if (!res.ok) throw new Error("Failed to load private notes");
      return res.json();
    },
    enabled: !!data,
  });

  // Fetch talking points
  const { data: talkingPointsData } = useQuery<{
    talkingPoints: TalkingPoint[];
  }>({
    queryKey: ["session", sessionId, "talking-points"],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}/talking-points`);
      if (!res.ok) throw new Error("Failed to load talking points");
      return res.json();
    },
    enabled: !!data,
  });

  // Fetch action items
  const { data: actionItemsData } = useQuery<{
    actionItems: ActionItemData[];
  }>({
    queryKey: ["session", sessionId, "action-items"],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}/action-items`);
      if (!res.ok) throw new Error("Failed to load action items");
      return res.json();
    },
    enabled: !!data,
  });

  // Populate private notes from fetch
  useEffect(() => {
    if (privateNotesData?.notes) {
      setPrivateNotes(privateNotesData.notes);
    }
  }, [privateNotesData]);

  // Populate talking points keyed by category
  useEffect(() => {
    if (talkingPointsData?.talkingPoints) {
      const byCategory: Record<string, TalkingPoint[]> = {};
      for (const tp of talkingPointsData.talkingPoints) {
        const cat = tp.category ?? "general";
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(tp);
      }
      setTalkingPointsByCategory(byCategory);
    }
  }, [talkingPointsData]);

  // Populate action items keyed by category
  useEffect(() => {
    if (actionItemsData?.actionItems) {
      const byCategory: Record<string, ActionItemData[]> = {};
      for (const ai of actionItemsData.actionItems) {
        const cat = ai.category ?? "general";
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(ai);
      }
      setActionItemsByCategory(byCategory);
    }
  }, [actionItemsData]);

  // Initialize state from fetched data
  useEffect(() => {
    if (data && !initializedRef.current) {
      initializedRef.current = true;
      const sections = groupQuestionsBySections(
        data.template.sections,
        data.template.questions
      );

      // Build initial answers map from existing answers
      const answersMap = new Map<string, AnswerValue>();
      for (const a of data.answers) {
        answersMap.set(a.questionId, {
          answerText: a.answerText ?? undefined,
          answerNumeric: a.answerNumeric ?? undefined,
          answerJson: a.answerJson ?? undefined,
        });
      }

      dispatch({ type: "INIT", sections, answers: answersMap });
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

  // Handle saving state from child components (notes, talking points, action items)
  const handleSavingChange = useCallback(
    (saving: boolean) => {
      dispatch({ type: saving ? "INC_SAVING" : "DEC_SAVING" });
    },
    []
  );

  // Aggregate save status: if any component is saving, show "saving"
  const aggregatedSaveStatus: SaveStatus = useMemo(() => {
    if (state.saveStatus === "error") return "error";
    if (state.saveStatus === "saving" || state.activeSavingCount > 0) return "saving";
    return "saved";
  }, [state.saveStatus, state.activeSavingCount]);

  // beforeunload: save pending changes immediately
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (lastChangedRef.current && state.saveStatus === "saving") {
        const { questionId, value } = lastChangedRef.current;
        const body = JSON.stringify({
          questionId,
          answerText: value.answerText,
          answerNumeric: value.answerNumeric,
          answerJson: value.answerJson,
        });
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

  // visibilitychange: flush all pending debounced saves
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        // Flush pending answer save
        if (lastChangedRef.current) {
          const { questionId, value } = lastChangedRef.current;
          navigator.sendBeacon(
            `/api/sessions/${sessionId}/answers`,
            new Blob(
              [
                JSON.stringify({
                  questionId,
                  answerText: value.answerText,
                  answerNumeric: value.answerNumeric,
                  answerJson: value.answerJson,
                }),
              ],
              { type: "application/json" }
            )
          );
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [sessionId]);

  // Evaluate conditional visibility
  const isQuestionVisible = useCallback(
    (question: TemplateQuestion) => evaluateCondition(question, state.answers),
    [state.answers]
  );

  // Build step names: [Recap, ...sections, Summary]
  const stepNames = useMemo(
    () => [
      "Recap",
      ...state.sections.map((s) => s.name),
      "Summary",
    ],
    [state.sections]
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

  // Question history dialog handler
  const handleQuestionHistoryOpen = useCallback((questionId: string) => {
    setHistoryQuestionId(questionId);
    setHistoryDialogOpen(true);
  }, []);

  // Build participants list for action item assignee picker
  const seriesParticipants = useMemo(() => {
    if (!data) return [];
    const participants: Array<{ id: string; firstName: string; lastName: string }> = [];
    if (data.series.manager) {
      participants.push({
        id: data.series.manager.id,
        firstName: data.series.manager.firstName,
        lastName: data.series.manager.lastName,
      });
    }
    if (data.series.report) {
      participants.push({
        id: data.series.report.id,
        firstName: data.series.report.firstName,
        lastName: data.series.report.lastName,
      });
    }
    return participants;
  }, [data]);

  // Build session number map for "carried from" badges
  const sessionNumberMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!data) return map;
    for (const ps of data.previousSessions) {
      map.set(ps.id, ps.sessionNumber);
    }
    return map;
  }, [data]);

  // Build previous sessions for context panel (with question text enrichment)
  const previousSessionsForContext: PreviousSession[] = useMemo(() => {
    if (!data) return [];
    // Build a section name lookup for question -> section name mapping
    const sectionNameMap = new Map<string, string>();
    for (const s of data.template.sections) {
      sectionNameMap.set(s.id, s.name);
    }

    const questionMap = new Map<string, { text: string; type: string; sectionName: string }>();
    for (const q of data.template.questions) {
      questionMap.set(q.id, {
        text: q.questionText,
        type: q.answerType,
        sectionName: sectionNameMap.get(q.sectionId) ?? "General",
      });
    }

    return data.previousSessions.map((ps) => ({
      id: ps.id,
      sessionNumber: ps.sessionNumber,
      completedAt: ps.completedAt ?? ps.scheduledAt,
      sessionScore: ps.sessionScore !== null ? String(ps.sessionScore) : null,
      sharedNotes: ps.sharedNotes,
      answers: ps.answers.map((a) => {
        const q = questionMap.get(a.questionId);
        return {
          questionId: a.questionId,
          questionText: q?.text ?? "Unknown question",
          answerType: q?.type ?? "text",
          answerText: a.answerText,
          answerNumeric: a.answerNumeric !== null ? String(a.answerNumeric) : null,
          answerJson: a.answerJson,
          category: q?.sectionName ?? "General",
        };
      }),
    }));
  }, [data]);

  // Build open action items for context panel
  const openActionItemsForContext: OpenActionItem[] = useMemo(() => {
    if (!data) return [];
    return data.openActionItems.map((ai) => {
      const assignee = seriesParticipants.find((p) => p.id === ai.assigneeId);
      const sessionNum = sessionNumberMap.get(ai.createdAt) ?? 0;
      return {
        id: ai.id,
        title: ai.title,
        assignee: assignee ?? { firstName: "Unknown", lastName: "" },
        dueDate: ai.dueDate,
        status: ai.status,
        category: ai.category,
        sessionNumber: sessionNum,
        createdAt: ai.createdAt,
      };
    });
  }, [data, seriesParticipants, sessionNumberMap]);

  // Session scores for sparkline
  const sessionScores = useMemo(() => {
    if (!data) return [];
    return data.previousSessions
      .filter((ps) => ps.sessionScore !== null)
      .map((ps) => ps.sessionScore as number)
      .reverse(); // oldest first for sparkline
  }, [data]);

  // Find the question for history dialog
  const historyQuestion = useMemo(() => {
    if (!historyQuestionId || !data) return null;
    return data.template.questions.find((q) => q.id === historyQuestionId) ?? null;
  }, [historyQuestionId, data]);

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

  // Determine current step content
  const isRecapStep = state.currentStep === 0;
  const isSummaryStep = state.currentStep === totalSteps - 1 && totalSteps > 1;
  const sectionIndex = state.currentStep - 1; // -1 for recap
  const currentSection =
    sectionIndex >= 0 && sectionIndex < state.sections.length
      ? state.sections[sectionIndex]
      : null;

  // Determine if current user is the manager on this series
  const isManager = authSession?.user?.id === data.series.managerId;

  return (
    <>
      <WizardTopBar
        seriesId={data.session.seriesId}
        reportName={reportName}
        sessionNumber={data.session.sessionNumber}
        date={data.session.startedAt ?? data.session.scheduledAt}
        saveStatus={aggregatedSaveStatus}
        hasUnsavedChanges={aggregatedSaveStatus === "saving"}
      />

      {/* Main content area with context panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: main wizard content */}
        {isRecapStep ? (
          <RecapScreen
            reportName={reportName}
            previousSessions={data.previousSessions}
            openActionItems={data.openActionItems}
          />
        ) : isSummaryStep ? (
          <SummaryScreen
            sessionId={sessionId}
            seriesId={data.session.seriesId}
            categories={state.sections}
            answers={state.answers}
            sharedNotes={data.session.sharedNotes ?? {}}
            talkingPoints={talkingPointsByCategory}
            actionItems={actionItemsByCategory}
            onGoBack={handleStepChange}
            isManager={isManager}
          />
        ) : currentSection ? (
          <CategoryStep
            sessionId={sessionId}
            categoryName={currentSection.name}
            questions={currentSection.questions}
            answers={state.answers}
            onAnswerChange={handleAnswerChange}
            isQuestionVisible={isQuestionVisible}
            disabled={data.session.status === "completed"}
            sharedNotesContent={
              data.session.sharedNotes?.[currentSection.name] ?? ""
            }
            privateNotesContent={privateNotes[currentSection.name] ?? ""}
            talkingPoints={talkingPointsByCategory[currentSection.name] ?? []}
            actionItems={actionItemsByCategory[currentSection.name] ?? []}
            seriesParticipants={seriesParticipants}
            sessionNumberMap={sessionNumberMap}
            onSavingChange={handleSavingChange}
          />
        ) : null}

        {/* Right: context panel */}
        <ContextPanel
          currentStep={state.currentStep}
          currentCategory={currentSection?.name ?? null}
          previousSessions={previousSessionsForContext}
          openActionItems={openActionItemsForContext}
          sessionScores={sessionScores}
          onQuestionHistoryOpen={handleQuestionHistoryOpen}
        />
      </div>

      <WizardNavigation
        currentStep={state.currentStep}
        totalSteps={totalSteps}
        stepNames={stepNames}
        onStepChange={handleStepChange}
        onPrev={handlePrev}
        onNext={handleNext}
      />

      {/* Question history dialog */}
      {historyQuestion && (
        <QuestionHistoryDialog
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
          questionId={historyQuestion.id}
          questionText={historyQuestion.questionText}
          answerType={historyQuestion.answerType}
          previousSessions={previousSessionsForContext}
        />
      )}
    </>
  );
}
