"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  History,
  ListChecks,
  PanelRightClose,
  PanelRightOpen,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScoreSparkline } from "./score-sparkline";
import type { PreviousSession } from "./question-history-dialog";

export interface OpenActionItem {
  id: string;
  title: string;
  assignee: { firstName: string; lastName: string };
  dueDate: string | null;
  status: string;
  category: string | null;
  sessionNumber: number;
}

export interface ContextPanelProps {
  currentStep: number;
  currentCategory: string | null;
  previousSessions: PreviousSession[];
  openActionItems: OpenActionItem[];
  sessionScores: number[];
  onQuestionHistoryOpen: (questionId: string) => void;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function SectionHeader({
  icon: Icon,
  title,
  count,
  isOpen,
  onToggle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count?: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <CollapsibleTrigger
      onClick={onToggle}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-muted/50 transition-colors"
    >
      {isOpen ? (
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      ) : (
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
      )}
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="flex-1 text-left">{title}</span>
      {count !== undefined && count > 0 && (
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-normal">
          {count}
        </Badge>
      )}
    </CollapsibleTrigger>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="px-2 py-3 text-xs text-muted-foreground italic">{message}</p>
  );
}

function RecapContent({
  previousSessions,
  openActionItems,
  sessionScores,
}: {
  previousSessions: PreviousSession[];
  openActionItems: OpenActionItem[];
  sessionScores: number[];
}) {
  const [scoreTrendOpen, setScoreTrendOpen] = useState(true);
  const [actionItemsOpen, setActionItemsOpen] = useState(true);
  const [statsOpen, setStatsOpen] = useState(true);

  const stats = useMemo(() => {
    const totalSessions = previousSessions.length;
    const avgScore =
      sessionScores.length > 0
        ? sessionScores.reduce((s, v) => s + v, 0) / sessionScores.length
        : null;
    return { totalSessions, avgScore };
  }, [previousSessions, sessionScores]);

  const groupedActions = useMemo(() => {
    const groups = new Map<number, OpenActionItem[]>();
    for (const item of openActionItems) {
      if (!groups.has(item.sessionNumber)) {
        groups.set(item.sessionNumber, []);
      }
      groups.get(item.sessionNumber)!.push(item);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => b - a);
  }, [openActionItems]);

  return (
    <div className="space-y-1">
      <Collapsible open={scoreTrendOpen} onOpenChange={setScoreTrendOpen}>
        <SectionHeader
          icon={TrendingUp}
          title="Score Trend"
          isOpen={scoreTrendOpen}
          onToggle={() => setScoreTrendOpen(!scoreTrendOpen)}
        />
        <CollapsibleContent>
          <div className="px-2 py-2">
            {sessionScores.length >= 2 ? (
              <ScoreSparkline data={sessionScores} height={48} />
            ) : (
              <EmptyState message="Need at least 2 sessions for a trend" />
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={actionItemsOpen} onOpenChange={setActionItemsOpen}>
        <SectionHeader
          icon={ListChecks}
          title="Open Action Items"
          count={openActionItems.length}
          isOpen={actionItemsOpen}
          onToggle={() => setActionItemsOpen(!actionItemsOpen)}
        />
        <CollapsibleContent>
          <div className="px-2 py-1">
            {groupedActions.length === 0 ? (
              <EmptyState message="No open action items from previous sessions" />
            ) : (
              <div className="space-y-3">
                {groupedActions.map(([sessionNum, items]) => (
                  <div key={sessionNum}>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Session #{sessionNum}
                    </p>
                    <ul className="space-y-1">
                      {items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-start gap-2 rounded-md border px-2 py-1.5 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium leading-tight">{item.title}</p>
                            <p className="text-muted-foreground">
                              {item.assignee.firstName} {item.assignee.lastName}
                              {item.dueDate && (
                                <span className="ml-1">
                                  &middot; due {formatDate(item.dueDate)}
                                </span>
                              )}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={statsOpen} onOpenChange={setStatsOpen}>
        <SectionHeader
          icon={Clock}
          title="Summary"
          isOpen={statsOpen}
          onToggle={() => setStatsOpen(!statsOpen)}
        />
        <CollapsibleContent>
          <div className="px-2 py-2 grid grid-cols-2 gap-3">
            <div className="rounded-md border p-2 text-center">
              <p className="text-lg font-semibold tabular-nums">
                {stats.totalSessions}
              </p>
              <p className="text-[10px] text-muted-foreground">Past Sessions</p>
            </div>
            <div className="rounded-md border p-2 text-center">
              <p className="text-lg font-semibold tabular-nums">
                {stats.avgScore !== null ? stats.avgScore.toFixed(1) : "--"}
              </p>
              <p className="text-[10px] text-muted-foreground">Avg Score</p>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function CategoryContent({
  currentCategory,
  previousSessions,
  openActionItems,
  onQuestionHistoryOpen,
}: {
  currentCategory: string;
  previousSessions: PreviousSession[];
  openActionItems: OpenActionItem[];
  onQuestionHistoryOpen: (questionId: string) => void;
}) {
  const [notesOpen, setNotesOpen] = useState(true);
  const [answersOpen, setAnswersOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(true);

  const lastSession = previousSessions[0] ?? null;

  const previousNotes = useMemo(() => {
    if (!lastSession?.sharedNotes) return null;
    return lastSession.sharedNotes[currentCategory] ?? null;
  }, [lastSession, currentCategory]);

  const previousAnswers = useMemo(() => {
    if (!lastSession) return [];
    return lastSession.answers.filter(
      (a) => a.category === currentCategory
    );
  }, [lastSession, currentCategory]);

  const categoryActions = useMemo(() => {
    return openActionItems.filter(
      (item) => item.category === currentCategory
    );
  }, [openActionItems, currentCategory]);

  return (
    <div className="space-y-1">
      <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
        <SectionHeader
          icon={FileText}
          title="Previous Notes"
          isOpen={notesOpen}
          onToggle={() => setNotesOpen(!notesOpen)}
        />
        <CollapsibleContent>
          <div className="px-2 py-2">
            {previousNotes ? (
              <div
                className="prose prose-sm prose-neutral dark:prose-invert max-w-none text-xs leading-relaxed [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1"
                dangerouslySetInnerHTML={{ __html: previousNotes }}
              />
            ) : (
              <EmptyState message="No previous notes for this section" />
            )}
            {lastSession && previousNotes && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                From session #{lastSession.sessionNumber} &middot;{" "}
                {formatDate(lastSession.completedAt)}
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={answersOpen} onOpenChange={setAnswersOpen}>
        <SectionHeader
          icon={History}
          title="Previous Answers"
          count={previousAnswers.length}
          isOpen={answersOpen}
          onToggle={() => setAnswersOpen(!answersOpen)}
        />
        <CollapsibleContent>
          <div className="px-2 py-1">
            {previousAnswers.length === 0 ? (
              <EmptyState message="No previous answers for this section" />
            ) : (
              <ul className="space-y-2">
                {previousAnswers.map((answer) => (
                  <li
                    key={answer.questionId}
                    className="rounded-md border px-2 py-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="font-medium leading-tight text-foreground">
                        {answer.questionText}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 shrink-0"
                        onClick={() => onQuestionHistoryOpen(answer.questionId)}
                        title="View history"
                      >
                        <History className="size-3" />
                      </Button>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {formatAnswerPreview(
                        answer.answerType,
                        answer.answerText,
                        answer.answerNumeric
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={actionsOpen} onOpenChange={setActionsOpen}>
        <SectionHeader
          icon={ListChecks}
          title="Open Action Items"
          count={categoryActions.length}
          isOpen={actionsOpen}
          onToggle={() => setActionsOpen(!actionsOpen)}
        />
        <CollapsibleContent>
          <div className="px-2 py-1">
            {categoryActions.length === 0 ? (
              <EmptyState message="No open action items for this section" />
            ) : (
              <ul className="space-y-1">
                {categoryActions.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-2 rounded-md border px-2 py-1.5 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-tight">{item.title}</p>
                      <p className="text-muted-foreground">
                        {item.assignee.firstName} {item.assignee.lastName}
                        {item.dueDate && (
                          <span className="ml-1">
                            &middot; due {formatDate(item.dueDate)}
                          </span>
                        )}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="shrink-0 text-[10px]"
                    >
                      #{item.sessionNumber}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function formatAnswerPreview(
  answerType: string,
  answerText: string | null,
  answerNumeric: string | null
): string {
  switch (answerType) {
    case "yes_no":
      return answerText ?? "No answer";
    case "rating_1_5":
      return answerNumeric !== null ? `${answerNumeric}/5` : "No answer";
    case "rating_1_10":
      return answerNumeric !== null ? `${answerNumeric}/10` : "No answer";
    case "mood":
      return answerNumeric !== null ? `Mood: ${answerNumeric}/5` : "No answer";
    case "free_text":
      if (!answerText) return "No answer";
      return answerText.length > 80
        ? answerText.slice(0, 80) + "..."
        : answerText;
    default:
      return answerText ?? "No answer";
  }
}

export function ContextPanel({
  currentStep,
  currentCategory,
  previousSessions,
  openActionItems,
  sessionScores,
  onQuestionHistoryOpen,
}: ContextPanelProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const isRecap = currentStep === 0 || currentCategory === null;

  const panelContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">
          {isRecap ? "Session Context" : `Context: ${currentCategory}`}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <PanelRightClose className="size-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {previousSessions.length === 0 && openActionItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <History className="size-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No session history yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Context from previous sessions will appear here
            </p>
          </div>
        ) : isRecap ? (
          <RecapContent
            previousSessions={previousSessions}
            openActionItems={openActionItems}
            sessionScores={sessionScores}
          />
        ) : (
          <CategoryContent
            currentCategory={currentCategory!}
            previousSessions={previousSessions}
            openActionItems={openActionItems}
            onQuestionHistoryOpen={onQuestionHistoryOpen}
          />
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed right-4 bottom-20 z-40 size-10 rounded-full shadow-lg lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open context panel"
      >
        <PanelRightOpen className="size-4" />
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile slide-in panel */}
      <aside
        className={`fixed right-0 top-0 z-50 h-full w-[320px] border-l bg-background shadow-xl transition-transform duration-200 lg:hidden ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {panelContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[320px] shrink-0 border-l bg-muted/10 overflow-y-auto">
        {panelContent}
      </aside>
    </>
  );
}
