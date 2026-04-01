"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { WizardTopBar, type SaveStatus } from "./wizard-top-bar";
import { WizardStepSidebar } from "./wizard-step-sidebar";
import { WizardMobileCarousel } from "./wizard-mobile-carousel";
import { CategoryStep } from "./category-step";
import { RecapScreen } from "./recap-screen";
import { SummaryScreen } from "./summary-screen";
import { FloatingContextWidgets } from "./floating-context-widgets";
import { QuestionHistoryDialog, type PreviousSession } from "./question-history-dialog";
import { ActionItemsHistoryDialog } from "./action-items-history-dialog";
import { TalkingPointsHistoryDialog } from "./talking-points-history-dialog";
import { type AnswerValue } from "./question-widget";
import { type TalkingPoint } from "./talking-point-list";
import { type ActionItemData } from "./action-item-inline";
import { type OpenActionItem } from "./context-panel";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { evaluateCondition } from "@/lib/utils/evaluate-condition";

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
    name: string | null;
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

// evaluateCondition is imported from @/lib/utils/evaluate-condition

// --- Component ---

interface WizardShellProps {
  sessionId: string;
}

export function WizardShell({ sessionId }: WizardShellProps) {
  const t = useTranslations("sessions");
  const { data: authSession } = useSession();
  const [state, dispatch] = useReducer(wizardReducer, {
    currentStep: 0,
    answers: new Map(),
    sections: [],
    saveStatus: "saved" as SaveStatus,
    pendingSaves: new Set<string>(),
    activeSavingCount: 0,
  });

  // Track slide direction for CSS transitions
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevStepRef = useRef(0);

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

  // --- Series history dialogs ---
  const [actionItemsHistoryOpen, setActionItemsHistoryOpen] = useState(false);
  const [talkingPointsHistoryOpen, setTalkingPointsHistoryOpen] = useState(false);

  // Fetch session data
  const { data, isLoading, error } = useQuery<SessionData>({
    queryKey: ["session", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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

  // Fetch series history (lazy — only when a history dialog is opened)
  const { data: seriesHistoryData } = useQuery<{
    managerId: string;
    reportId: string;
    actionItems: Array<{
      id: string;
      title: string;
      status: string;
      dueDate: string | null;
      category: string | null;
      assigneeId: string;
      assignee: { firstName: string; lastName: string } | null;
      sessionNumber: number;
      sessionDate: string | null;
      completedAt: string | null;
      createdAt: string;
    }>;
    talkingPoints: Array<{
      id: string;
      content: string;
      category: string | null;
      isDiscussed: boolean;
      discussedAt: string | null;
      authorId: string;
      author: { firstName: string; lastName: string } | null;
      sessionNumber: number;
      sessionDate: string | null;
      carriedFromSessionId: string | null;
      createdAt: string;
    }>;
  }>({
    queryKey: ["session", sessionId, "series-history"],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}/series-history`);
      if (!res.ok) throw new Error("Failed to load series history");
      return res.json();
    },
    enabled: !!data && (actionItemsHistoryOpen || talkingPointsHistoryOpen),
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

  // Toggle action item status (works across all sessions in the series)
  const queryClient = useQueryClient();
  const toggleActionItem = useMutation({
    mutationFn: async ({
      actionItemId,
      status,
    }: {
      actionItemId: string;
      status: string;
    }) => {
      const res = await fetch(`/api/sessions/${sessionId}/series-history`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionItemId, status }),
      });
      if (!res.ok) throw new Error("Failed to toggle action item");
      return res.json();
    },
    onSuccess: () => {
      // Invalidate all relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
      queryClient.invalidateQueries({
        queryKey: ["session", sessionId, "series-history"],
      });
      queryClient.invalidateQueries({
        queryKey: ["session", sessionId, "action-items"],
      });
    },
  });

  const handleToggleActionItem = useCallback(
    (actionItemId: string, currentStatus: string) => {
      const newStatus = currentStatus === "completed" ? "open" : "completed";
      toggleActionItem.mutate({ actionItemId, status: newStatus });
    },
    // Safe: toggleActionItem is a stable mutation object from useMutation
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Debounced saving: track last changed answer
  const debouncedChange = useDebounce(lastChangedRef.current, 500);

  useEffect(() => {
    if (debouncedChange) {
      saveAnswer.mutate({
        questionId: debouncedChange.questionId,
        value: debouncedChange.value,
      });
    }
    // Safe: saveAnswer is a stable mutation object from useMutation
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

  // Build step info for sidebar (with completion tracking)
  const stepInfos = useMemo(() => {
    return stepNames.map((name, index) => {
      // Recap and Summary steps have no questions
      if (index === 0 || index === stepNames.length - 1) {
        return { name, answered: 0, total: 0, isComplete: index === 0 };
      }
      // Category step
      const sectionIndex = index - 1;
      const section = state.sections[sectionIndex];
      if (!section) return { name, answered: 0, total: 0, isComplete: false };

      const visibleQuestions = section.questions.filter((q) =>
        evaluateCondition(q, state.answers)
      );
      const answeredCount = visibleQuestions.filter((q) => {
        const answer = state.answers.get(q.id);
        if (!answer) return false;
        return (
          answer.answerText !== undefined ||
          answer.answerNumeric !== undefined ||
          answer.answerJson !== undefined
        );
      }).length;

      return {
        name,
        answered: answeredCount,
        total: visibleQuestions.length,
        isComplete: visibleQuestions.length > 0 && answeredCount === visibleQuestions.length,
      };
    });
  }, [stepNames, state.sections, state.answers]);

  // Navigation with slide transition
  const navigateToStep = useCallback(
    (step: number) => {
      if (step === state.currentStep) return;
      const direction = step > state.currentStep ? "left" : "right";
      setSlideDirection(direction);
      setIsTransitioning(true);

      // After brief exit animation, update step and start enter animation
      requestAnimationFrame(() => {
        dispatch({ type: "SET_STEP", step });
        prevStepRef.current = step;
        // Clear transition after enter animation completes
        setTimeout(() => {
          setIsTransitioning(false);
          setSlideDirection(null);
        }, 300);
      });
    },
    [state.currentStep]
  );

  // Validate required questions for a category step
  const validateCurrentStep = useCallback((): boolean => {
    const stepIndex = state.currentStep;
    // Recap (0) and Summary (last) don't need validation
    if (stepIndex === 0 || stepIndex === totalSteps - 1) return true;

    const sectionIndex = stepIndex - 1;
    const section = state.sections[sectionIndex];
    if (!section) return true;

    const visibleQuestions = section.questions.filter((q) =>
      evaluateCondition(q, state.answers)
    );
    const unansweredRequired = visibleQuestions.filter((q) => {
      if (!q.isRequired) return false;
      const answer = state.answers.get(q.id);
      if (!answer) return true;
      return (
        answer.answerText === undefined &&
        answer.answerNumeric === undefined &&
        answer.answerJson === undefined
      );
    });

    if (unansweredRequired.length > 0) {
      toast.error(
        t("wizard.requiredUnanswered", { count: unansweredRequired.length }),
        { description: unansweredRequired.map((q) => q.questionText).slice(0, 3).join(", ") }
      );
      return false;
    }
    return true;
  }, [state.currentStep, state.sections, state.answers, totalSteps, t]);

  const handleStepChange = useCallback(
    (step: number) => {
      // Allow going backwards freely, validate when going forward
      if (step > state.currentStep && !validateCurrentStep()) return;
      navigateToStep(step);
    },
    [navigateToStep, state.currentStep, validateCurrentStep]
  );

  const handlePrev = useCallback(() => {
    if (state.currentStep > 0) {
      navigateToStep(state.currentStep - 1);
    }
  }, [state.currentStep, navigateToStep]);

  const handleNext = useCallback(() => {
    if (state.currentStep < totalSteps - 1) {
      if (!validateCurrentStep()) return;
      navigateToStep(state.currentStep + 1);
    }
  }, [state.currentStep, totalSteps, navigateToStep, validateCurrentStep]);

  // Keyboard shortcuts: Left/Right arrow keys for navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      if (isInput) return;

      const isSummaryStep = state.currentStep === totalSteps - 1;

      if (e.key === "ArrowLeft" && state.currentStep > 0) {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight" && !isSummaryStep) {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.currentStep, totalSteps, handlePrev, handleNext]);

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
        assigneeId: ai.assigneeId,
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
        <p className="text-lg font-medium">{t("wizard.loadError")}</p>
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
  const isLastCategoryStep = state.currentStep === totalSteps - 2;
  const sectionIndex = state.currentStep - 1; // -1 for recap
  const currentSection =
    sectionIndex >= 0 && sectionIndex < state.sections.length
      ? state.sections[sectionIndex]
      : null;

  // Determine if current user is the manager on this series
  const isManager = authSession?.user?.id === data.series.managerId;

  // Slide transition classes
  const slideClass = isTransitioning
    ? slideDirection === "left"
      ? "translate-x-[-8px] opacity-90"
      : "translate-x-[8px] opacity-90"
    : "translate-x-0 opacity-100";

  // Step content renderer (shared between desktop and mobile carousel)
  const stepContent = (
    <>
      {isRecapStep ? (
        <RecapScreen
          reportName={reportName}
          managerName={data.series.manager ? `${data.series.manager.firstName} ${data.series.manager.lastName}` : ""}
          managerId={data.series.managerId}
          reportId={data.series.reportId}
          previousSessions={data.previousSessions}
          openActionItems={openActionItemsForContext}
          currentUserId={authSession?.user?.id ?? ""}
          onToggleActionItem={handleToggleActionItem}
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
        <div className="max-w-3xl mx-auto py-6 px-4">
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
        </div>
      ) : null}
    </>
  );

  return (
    <div className="flex flex-col h-full">
      <WizardTopBar
        seriesId={data.session.seriesId}
        sessionId={data.session.id}
        reportName={reportName}
        sessionNumber={data.session.sessionNumber}
        date={data.session.startedAt ?? data.session.scheduledAt}
        templateName={data.template.name}
        saveStatus={aggregatedSaveStatus}
        hasUnsavedChanges={aggregatedSaveStatus === "saving"}
        hasAnswers={data.answers.length > 0}
      />

      {/* Mobile: full-height card carousel */}
      <div className="flex md:hidden flex-1 min-h-0 overflow-hidden">
        <WizardMobileCarousel
          steps={stepInfos}
          currentStep={state.currentStep}
          onStepChange={handleStepChange}
        >
          {stepContent}
        </WizardMobileCarousel>
      </div>

      {/* Desktop: step sidebar | content | context widgets */}
      <div className="hidden md:flex flex-1 min-h-0 overflow-hidden">
        {/* Left: step sidebar */}
        <WizardStepSidebar
          steps={stepInfos}
          currentStep={state.currentStep}
          onStepChange={handleStepChange}
        />

        {/* Center: form content area — only this scrolls */}
        <div className="flex-1 overflow-y-auto relative">
          <div
            className={cn(
              "transition-all duration-300 ease-in-out",
              slideClass
            )}
          >
            {stepContent}
          </div>
        </div>

        {/* Right: context sidebar — scrolls independently */}
        <div className="hidden lg:block w-80 shrink-0 overflow-y-auto p-8 border-l border-border/10 bg-[var(--editorial-surface-container-low,var(--muted))]/30 space-y-8">
          <FloatingContextWidgets
            currentStep={state.currentStep}
            currentCategory={currentSection?.name ?? null}
            previousSessions={previousSessionsForContext}
            openActionItems={openActionItemsForContext}
            sessionScores={sessionScores}
            onQuestionHistoryOpen={handleQuestionHistoryOpen}
            onActionItemsHistoryOpen={() => setActionItemsHistoryOpen(true)}
            onTalkingPointsHistoryOpen={() => setTalkingPointsHistoryOpen(true)}
            hasTalkingPoints={Object.values(talkingPointsByCategory).some((arr) => arr.length > 0)}
            currentUserId={authSession?.user?.id ?? ""}
            onToggleActionItem={handleToggleActionItem}
          />
        </div>
      </div>

      {/* Tablet + Mobile: floating context widgets rendered outside the flex container */}
      <div className="lg:hidden">
        <FloatingContextWidgets
          currentStep={state.currentStep}
          currentCategory={currentSection?.name ?? null}
          previousSessions={previousSessionsForContext}
          openActionItems={openActionItemsForContext}
          sessionScores={sessionScores}
          onQuestionHistoryOpen={handleQuestionHistoryOpen}
        />
      </div>

      {/* Bottom action bar — in-flow, pinned to bottom of flex layout */}
      {!isSummaryStep && (
        <footer className="hidden md:flex shrink-0 bg-[var(--background)]/80 backdrop-blur-xl border-t border-border/20 z-40">
          <div className="max-w-4xl mx-auto w-full px-10 py-5 flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrev}
              disabled={state.currentStep === 0}
              className="flex items-center gap-2 text-muted-foreground font-bold hover:text-primary transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
              {t("wizard.previous")}
            </button>

            <div className="flex items-center gap-4">
              <div className="flex gap-1.5">
                {stepInfos.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-full transition-all",
                      i === state.currentStep ? "w-5 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-border"
                    )}
                  />
                ))}
              </div>
              <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                {t("wizard.stepOf", { current: state.currentStep + 1, total: totalSteps })}
              </span>
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--editorial-primary-container, var(--primary)) 100%)", boxShadow: "0 10px 25px -5px rgba(41, 64, 125, 0.25)" }}
            >
              {isLastCategoryStep ? t("wizard.review") : t("wizard.next")}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </footer>
      )}

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

      {/* Action items history dialog */}
      <ActionItemsHistoryDialog
        open={actionItemsHistoryOpen}
        onOpenChange={setActionItemsHistoryOpen}
        actionItems={seriesHistoryData?.actionItems ?? []}
        managerId={data?.series.managerId ?? ""}
        reportId={data?.series.reportId ?? ""}
        managerName={
          data?.series.manager
            ? `${data.series.manager.firstName} ${data.series.manager.lastName}`
            : ""
        }
        reportName={
          data?.series.report
            ? `${data.series.report.firstName} ${data.series.report.lastName}`
            : ""
        }
        currentUserId={authSession?.user?.id ?? ""}
        onToggleActionItem={handleToggleActionItem}
      />

      {/* Talking points history dialog */}
      <TalkingPointsHistoryDialog
        open={talkingPointsHistoryOpen}
        onOpenChange={setTalkingPointsHistoryOpen}
        talkingPoints={seriesHistoryData?.talkingPoints ?? []}
      />
    </div>
  );
}
