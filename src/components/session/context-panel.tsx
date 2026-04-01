"use client";

import { useMemo, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { sanitizeHtml } from "@/lib/utils/sanitize";
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
import { cn } from "@/lib/utils";
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
  assigneeId?: string;
  assignee: { firstName: string; lastName: string };
  dueDate: string | null;
  status: string;
  category: string | null;
  sessionNumber: number;
  createdAt?: string;
}

export interface ContextPanelProps {
  currentStep: number;
  currentCategory: string | null;
  previousSessions: PreviousSession[];
  openActionItems: OpenActionItem[];
  sessionScores: number[];
  onQuestionHistoryOpen: (questionId: string) => void;
}

function isItemOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === "completed") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dueDate) < today;
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
  const t = useTranslations("sessions.context");
  const format = useFormatter();
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

  function formatAge(createdAt: string): string | null {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 1) return null;
    if (diffDays === 1) return t("dayAgo");
    if (diffDays < 7) return t("daysAgo", { count: diffDays });
    const weeks = Math.floor(diffDays / 7);
    if (weeks === 1) return t("weekAgo");
    if (diffDays < 30) return t("weeksAgo", { count: weeks });
    const months = Math.floor(diffDays / 30);
    if (months === 1) return t("monthAgo");
    return t("monthsAgo", { count: months });
  }

  return (
    <div className="space-y-1">
      <Collapsible open={scoreTrendOpen} onOpenChange={setScoreTrendOpen}>
        <SectionHeader
          icon={TrendingUp}
          title={t("scoreTrend")}
          isOpen={scoreTrendOpen}
          onToggle={() => setScoreTrendOpen(!scoreTrendOpen)}
        />
        <CollapsibleContent>
          <div className="px-2 py-2">
            {sessionScores.length >= 2 ? (
              <ScoreSparkline data={sessionScores} height={48} />
            ) : (
              <EmptyState message={t("needTwoSessions")} />
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={actionItemsOpen} onOpenChange={setActionItemsOpen}>
        <SectionHeader
          icon={ListChecks}
          title={t("openActionItems")}
          count={openActionItems.length}
          isOpen={actionItemsOpen}
          onToggle={() => setActionItemsOpen(!actionItemsOpen)}
        />
        <CollapsibleContent>
          <div className="px-2 py-1">
            {groupedActions.length === 0 ? (
              <EmptyState message={t("noActionItems")} />
            ) : (
              <div className="space-y-3">
                {groupedActions.map(([sessionNum, items]) => (
                  <div key={sessionNum}>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      {t("fromSession", { number: sessionNum })}
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
                                    &middot; {t("due", { date: format.dateTime(new Date(item.dueDate), { month: "short", day: "numeric" }) })}
                                  </span>
                                )}
                                {overdue && (
                                  <span className="ml-1 text-destructive font-medium">
                                    &middot; {t("overdue")}
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
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={statsOpen} onOpenChange={setStatsOpen}>
        <SectionHeader
          icon={Clock}
          title={t("summaryTitle")}
          isOpen={statsOpen}
          onToggle={() => setStatsOpen(!statsOpen)}
        />
        <CollapsibleContent>
          <div className="px-2 py-2 grid grid-cols-2 gap-3">
            <div className="rounded-md border p-2 text-center">
              <p className="text-lg font-semibold tabular-nums">
                {stats.totalSessions}
              </p>
              <p className="text-[10px] text-muted-foreground">{t("pastSessions")}</p>
            </div>
            <div className="rounded-md border p-2 text-center">
              <p className="text-lg font-semibold tabular-nums">
                {stats.avgScore !== null ? format.number(stats.avgScore, { maximumFractionDigits: 1, minimumFractionDigits: 1 }) : "--"}
              </p>
              <p className="text-[10px] text-muted-foreground">{t("avgScore")}</p>
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
  const t = useTranslations("sessions.context");
  const format = useFormatter();
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

  function formatAge(createdAt: string): string | null {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 1) return null;
    if (diffDays === 1) return t("dayAgo");
    if (diffDays < 7) return t("daysAgo", { count: diffDays });
    const weeks = Math.floor(diffDays / 7);
    if (weeks === 1) return t("weekAgo");
    if (diffDays < 30) return t("weeksAgo", { count: weeks });
    const months = Math.floor(diffDays / 30);
    if (months === 1) return t("monthAgo");
    return t("monthsAgo", { count: months });
  }

  function formatAnswerPreview(
    answerType: string,
    answerText: string | null,
    answerNumeric: string | null
  ): string {
    switch (answerType) {
      case "yes_no":
        return answerText ?? t("noAnswer");
      case "rating_1_5":
        return answerNumeric !== null ? `${answerNumeric}/5` : t("noAnswer");
      case "rating_1_10":
        return answerNumeric !== null ? `${answerNumeric}/10` : t("noAnswer");
      case "mood":
        return answerNumeric !== null ? `Mood: ${answerNumeric}/5` : t("noAnswer");
      case "free_text":
        if (!answerText) return t("noAnswer");
        return answerText.length > 80
          ? answerText.slice(0, 80) + "..."
          : answerText;
      default:
        return answerText ?? t("noAnswer");
    }
  }

  return (
    <div className="space-y-1">
      <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
        <SectionHeader
          icon={FileText}
          title={t("previousNotes")}
          isOpen={notesOpen}
          onToggle={() => setNotesOpen(!notesOpen)}
        />
        <CollapsibleContent>
          <div className="px-2 py-2">
            {previousNotes ? (
              <div
                className="prose prose-sm prose-neutral dark:prose-invert max-w-none text-xs leading-relaxed [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(previousNotes) }}
              />
            ) : (
              <EmptyState message={t("noPreviousNotes")} />
            )}
            {lastSession && previousNotes && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                {t("fromSession", { number: lastSession.sessionNumber })} &middot;{" "}
                {format.dateTime(new Date(lastSession.completedAt), { month: "short", day: "numeric" })}
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={answersOpen} onOpenChange={setAnswersOpen}>
        <SectionHeader
          icon={History}
          title={t("previousAnswers")}
          count={previousAnswers.length}
          isOpen={answersOpen}
          onToggle={() => setAnswersOpen(!answersOpen)}
        />
        <CollapsibleContent>
          <div className="px-2 py-1">
            {previousAnswers.length === 0 ? (
              <EmptyState message={t("noPreviousAnswers")} />
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
                        title={t("viewHistory")}
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
          title={t("openActionItems")}
          count={categoryActions.length}
          isOpen={actionsOpen}
          onToggle={() => setActionsOpen(!actionsOpen)}
        />
        <CollapsibleContent>
          <div className="px-2 py-1">
            {categoryActions.length === 0 ? (
              <EmptyState message={t("noActionItemsForSection")} />
            ) : (
              <ul className="space-y-1">
                {categoryActions.map((item) => {
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
                              &middot; {t("due", { date: format.dateTime(new Date(item.dueDate), { month: "short", day: "numeric" }) })}
                            </span>
                          )}
                          {overdue && (
                            <span className="ml-1 text-destructive font-medium">
                              &middot; {t("overdue")}
                            </span>
                          )}
                          {age && (
                            <span className="ml-1 opacity-60">
                              &middot; {age}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-0.5">
                        <Badge
                          variant="outline"
                          className="text-[10px]"
                        >
                          #{item.sessionNumber}
                        </Badge>
                        {overdue && (
                          <Badge
                            variant="destructive"
                            className="text-[9px] px-1"
                          >
                            {t("overdue")}
                          </Badge>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function ContextPanel({
  currentStep,
  currentCategory,
  previousSessions,
  openActionItems,
  sessionScores,
  onQuestionHistoryOpen,
}: ContextPanelProps) {
  const t = useTranslations("sessions.context");
  const [mobileOpen, setMobileOpen] = useState(false);

  const isRecap = currentStep === 0 || currentCategory === null;

  const panelContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">
          {isRecap ? t("sessionContext") : t("contextCategory", { category: currentCategory })}
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
            <p className="text-sm text-muted-foreground">{t("noHistory")}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("noHistoryDesc")}
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
