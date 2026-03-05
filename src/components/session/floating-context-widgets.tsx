"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  History,
  ListChecks,
  Sparkles,
  TrendingUp,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ScoreSparkline } from "./score-sparkline";
import { NudgeList } from "./nudge-list";
import type { PreviousSession } from "./question-history-dialog";

// Re-export for convenience
export type { OpenActionItem } from "./context-panel";

export interface FloatingContextWidgetsProps {
  currentStep: number;
  currentCategory: string | null;
  previousSessions: PreviousSession[];
  openActionItems: Array<{
    id: string;
    title: string;
    assignee: { firstName: string; lastName: string };
    dueDate: string | null;
    status: string;
    category: string | null;
    sessionNumber: number;
    createdAt?: string;
  }>;
  sessionScores: number[];
  onQuestionHistoryOpen: (questionId: string) => void;
  seriesId?: string;
  sessionId?: string;
  isManager?: boolean;
}

// --- Helpers (moved from context-panel.tsx) ---

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function isItemOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === "completed") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dueDate) < today;
}

function formatAge(createdAt: string): string | null {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return null;
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  const weeks = Math.floor(diffDays / 7);
  if (weeks === 1) return "1 week ago";
  if (diffDays < 30) return `${weeks} weeks ago`;
  const months = Math.floor(diffDays / 30);
  if (months === 1) return "1 month ago";
  return `${months} months ago`;
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

// --- Collapsible Card Widget ---

function WidgetCard({
  icon: Icon,
  title,
  count,
  defaultOpen = false,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="cursor-pointer p-0"
        onClick={() => setIsOpen(!isOpen)}
      >
        <button
          type="button"
          className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
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
        </button>
      </CardHeader>
      {isOpen && (
        <CardContent className="px-3 pb-3 pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

// --- Widget Content Components ---

function ScoreTrendWidget({ sessionScores }: { sessionScores: number[] }) {
  return (
    <WidgetCard icon={TrendingUp} title="Score Trend" defaultOpen>
      {sessionScores.length >= 2 ? (
        <ScoreSparkline data={sessionScores} height={48} />
      ) : (
        <p className="text-xs text-muted-foreground italic">
          Need at least 2 sessions for a trend
        </p>
      )}
    </WidgetCard>
  );
}

function ActionItemsWidget({
  openActionItems,
  currentCategory,
}: {
  openActionItems: FloatingContextWidgetsProps["openActionItems"];
  currentCategory: string | null;
}) {
  const filteredItems = useMemo(() => {
    if (!currentCategory) return openActionItems;
    return openActionItems.filter((item) => item.category === currentCategory);
  }, [openActionItems, currentCategory]);

  const groupedActions = useMemo(() => {
    const groups = new Map<number, typeof filteredItems>();
    for (const item of filteredItems) {
      if (!groups.has(item.sessionNumber)) {
        groups.set(item.sessionNumber, []);
      }
      groups.get(item.sessionNumber)!.push(item);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => b - a);
  }, [filteredItems]);

  return (
    <WidgetCard
      icon={ListChecks}
      title="Open Action Items"
      count={filteredItems.length}
      defaultOpen={filteredItems.length > 0}
    >
      {groupedActions.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          No open action items{currentCategory ? " for this section" : ""}
        </p>
      ) : (
        <div className="space-y-3">
          {groupedActions.map(([sessionNum, items]) => (
            <div key={sessionNum}>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Session #{sessionNum}
              </p>
              <ul className="space-y-1">
                {items.map((item) => {
                  const overdue = isItemOverdue(item.dueDate, item.status);
                  const age = item.createdAt ? formatAge(item.createdAt) : null;
                  return (
                    <li
                      key={item.id}
                      className={cn(
                        "flex items-start gap-2 rounded-md border px-2 py-1.5 text-xs",
                        overdue && "border-l-2 border-l-destructive/60"
                      )}
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
                          {overdue && (
                            <span className="ml-1 text-destructive font-medium">
                              &middot; Overdue
                            </span>
                          )}
                          {age && (
                            <span className="ml-1 opacity-60">
                              &middot; {age}
                            </span>
                          )}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}

function PreviousNotesWidget({
  previousSessions,
  currentCategory,
}: {
  previousSessions: PreviousSession[];
  currentCategory: string | null;
}) {
  const lastSession = previousSessions[0] ?? null;

  const previousNotes = useMemo(() => {
    if (!lastSession?.sharedNotes || !currentCategory) return null;
    return lastSession.sharedNotes[currentCategory] ?? null;
  }, [lastSession, currentCategory]);

  // Only show on category steps
  if (!currentCategory) return null;

  return (
    <WidgetCard icon={FileText} title="Previous Notes" defaultOpen={!!previousNotes}>
      {previousNotes ? (
        <div>
          <div
            className="prose prose-sm prose-neutral dark:prose-invert max-w-none text-xs leading-relaxed [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1"
            dangerouslySetInnerHTML={{ __html: previousNotes }}
          />
          {lastSession && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              From session #{lastSession.sessionNumber} &middot;{" "}
              {formatDate(lastSession.completedAt)}
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          No previous notes for this section
        </p>
      )}
    </WidgetCard>
  );
}

function PreviousAnswersWidget({
  previousSessions,
  currentCategory,
  onQuestionHistoryOpen,
}: {
  previousSessions: PreviousSession[];
  currentCategory: string | null;
  onQuestionHistoryOpen: (questionId: string) => void;
}) {
  const lastSession = previousSessions[0] ?? null;

  const previousAnswers = useMemo(() => {
    if (!lastSession || !currentCategory) return [];
    return lastSession.answers.filter((a) => a.category === currentCategory);
  }, [lastSession, currentCategory]);

  // Only show on category steps
  if (!currentCategory) return null;

  return (
    <WidgetCard
      icon={History}
      title="Previous Answers"
      count={previousAnswers.length}
    >
      {previousAnswers.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          No previous answers for this section
        </p>
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
    </WidgetCard>
  );
}

function SummaryStatsWidget({
  previousSessions,
  sessionScores,
}: {
  previousSessions: PreviousSession[];
  sessionScores: number[];
}) {
  const stats = useMemo(() => {
    const totalSessions = previousSessions.length;
    const avgScore =
      sessionScores.length > 0
        ? sessionScores.reduce((s, v) => s + v, 0) / sessionScores.length
        : null;
    return { totalSessions, avgScore };
  }, [previousSessions, sessionScores]);

  return (
    <WidgetCard icon={Clock} title="Summary">
      <div className="grid grid-cols-2 gap-3">
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
    </WidgetCard>
  );
}

// --- Main Component ---

function WidgetContent(props: FloatingContextWidgetsProps) {
  const {
    currentStep,
    currentCategory,
    previousSessions,
    openActionItems,
    sessionScores,
    onQuestionHistoryOpen,
    seriesId,
    sessionId,
    isManager,
  } = props;

  const isRecap = currentStep === 0 || currentCategory === null;

  const hasNoHistory = previousSessions.length === 0 && openActionItems.length === 0;

  if (hasNoHistory && !(isManager && seriesId && sessionId)) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <History className="size-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">No session history yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Context from previous sessions will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* AI Nudges -- manager only */}
      {isManager && seriesId && sessionId && (
        <NudgeList seriesId={seriesId} sessionId={sessionId} />
      )}

      {/* Score Trend */}
      <ScoreTrendWidget sessionScores={sessionScores} />

      {/* Action Items */}
      <ActionItemsWidget
        openActionItems={openActionItems}
        currentCategory={isRecap ? null : currentCategory}
      />

      {/* Category-specific widgets */}
      {!isRecap && (
        <>
          <PreviousNotesWidget
            previousSessions={previousSessions}
            currentCategory={currentCategory}
          />
          <PreviousAnswersWidget
            previousSessions={previousSessions}
            currentCategory={currentCategory}
            onQuestionHistoryOpen={onQuestionHistoryOpen}
          />
        </>
      )}

      {/* Summary stats */}
      <SummaryStatsWidget
        previousSessions={previousSessions}
        sessionScores={sessionScores}
      />
    </div>
  );
}

export function FloatingContextWidgets(props: FloatingContextWidgetsProps) {
  const { currentCategory } = props;

  return (
    <>
      {/* Desktop (lg+): rendered inline as a column by the parent */}
      <div className="hidden lg:block">
        <h2 className="text-sm font-semibold mb-3">
          {currentCategory ? `Context: ${currentCategory}` : "Session Context"}
        </h2>
        <WidgetContent {...props} />
      </div>

      {/* Tablet (md-lg): floating action button + right Sheet */}
      <div className="hidden md:block lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="fixed right-4 bottom-20 z-40 size-10 rounded-full shadow-lg"
              aria-label="Open context panel"
            >
              <Layers className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[340px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>
                {currentCategory ? `Context: ${currentCategory}` : "Session Context"}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <WidgetContent {...props} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Mobile (< md): button that opens bottom Sheet */}
      <div className="block md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="fixed right-4 bottom-20 z-40 size-10 rounded-full shadow-lg"
              aria-label="Open context panel"
            >
              <Layers className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto rounded-t-xl">
            <SheetHeader>
              <SheetTitle>
                {currentCategory ? `Context: ${currentCategory}` : "Session Context"}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 pb-6">
              <WidgetContent {...props} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
