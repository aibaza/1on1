"use client";

import { useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  User,
  CalendarDays,
  ArrowLeft,
  Lock,
} from "lucide-react";
import { AISummarySection } from "./ai-summary-section";
import { AISuggestionsSection } from "./ai-suggestions-section";
import type { AISummary } from "@/lib/ai/schemas/summary";
import type { AIManagerAddendum } from "@/lib/ai/schemas/addendum";

// --- Types ---

interface SummaryAnswer {
  questionId: string;
  answerText: string | null;
  answerNumeric: number | null;
  answerJson: unknown;
  skipped: boolean;
}

interface SummaryQuestion {
  id: string;
  questionText: string;
  answerType: string;
  isRequired: boolean;
  helpText: string | null;
}

interface SummaryTalkingPoint {
  id: string;
  content: string;
  isDiscussed: boolean;
}

interface SummaryActionItem {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  assigneeName: string | null;
  category: string | null;
}

interface SummaryPrivateNote {
  id: string;
  content: string;
  category: string | null;
}

interface SummaryCategory {
  name: string;
  questions: SummaryQuestion[];
  answers: Record<string, SummaryAnswer>;
  sharedNotes: string;
  talkingPoints: SummaryTalkingPoint[];
  actionItems: SummaryActionItem[];
  privateNotes: SummaryPrivateNote[];
}

interface SessionSummaryViewProps {
  sessionNumber: number;
  scheduledAt: string;
  completedAt: string | null;
  sessionScore: number | null;
  durationMinutes: number | null;
  status: string;
  categories: SummaryCategory[];
  isManager: boolean;
  seriesId: string;
  sessionId: string;
  aiStatus: string | null;
  aiSummary: AISummary | null;
  aiAddendum: AIManagerAddendum | null;
  managerId: string;
  reportId: string;
  managerName: string;
  reportName: string;
}

// --- Helpers ---

function formatAnswerDisplay(
  answerType: string,
  answer: SummaryAnswer | undefined,
  t: ReturnType<typeof useTranslations<"sessions">>
): string {
  if (!answer || answer.skipped) return t("summary.skipped");
  if (
    !answer.answerText &&
    answer.answerNumeric === null &&
    !answer.answerJson
  ) {
    return t("summary.notAnswered");
  }

  switch (answerType) {
    case "text":
      return answer.answerText || t("summary.notAnswered");
    case "rating_1_5":
      return answer.answerNumeric !== null
        ? `${answer.answerNumeric} / 5`
        : t("summary.notAnswered");
    case "rating_1_10":
      return answer.answerNumeric !== null
        ? `${answer.answerNumeric} / 10`
        : t("summary.notAnswered");
    case "yes_no":
      if (answer.answerNumeric === null) return t("summary.notAnswered");
      return answer.answerNumeric === 1 ? t("summary.yes") : t("summary.no");
    case "mood": {
      const moods = [
        t("summary.moodVeryBad"),
        t("summary.moodBad"),
        t("summary.moodNeutral"),
        t("summary.moodGood"),
        t("summary.moodGreat"),
      ];
      return answer.answerNumeric !== null
        ? moods[(answer.answerNumeric ?? 1) - 1] ??
            `${answer.answerNumeric} / 5`
        : t("summary.notAnswered");
    }
    case "multiple_choice":
      if (answer.answerJson && Array.isArray(answer.answerJson)) {
        return (answer.answerJson as string[]).join(", ");
      }
      return answer.answerText || t("summary.notAnswered");
    default:
      return answer.answerText || t("summary.notAnswered");
  }
}

function getAnswerBadge(
  answerType: string,
  answer: SummaryAnswer | undefined,
  t: ReturnType<typeof useTranslations<"sessions">>
): { label: string; variant: "default" | "secondary" | "outline" } | null {
  if (!answer || answer.skipped) return null;

  switch (answerType) {
    case "yes_no":
      if (answer.answerNumeric === null) return null;
      return answer.answerNumeric === 1
        ? { label: t("summary.yes"), variant: "default" }
        : { label: t("summary.no"), variant: "secondary" };
    case "mood": {
      const moodLabels = [
        t("summary.moodVeryBad"),
        t("summary.moodBad"),
        t("summary.moodNeutral"),
        t("summary.moodGood"),
        t("summary.moodGreat"),
      ];
      const moodEmojis = ["😢", "😟", "😐", "😊", "😄"];
      if (answer.answerNumeric === null) return null;
      const idx = (answer.answerNumeric ?? 1) - 1;
      return {
        label: `${moodEmojis[idx]} ${moodLabels[idx]}`,
        variant: answer.answerNumeric >= 4 ? "default" : answer.answerNumeric >= 3 ? "outline" : "secondary",
      };
    }
    default:
      return null;
  }
}

function getScoreColor(score: number): string {
  if (score >= 3.5) return "text-green-600 dark:text-green-400";
  if (score >= 2.5) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getScoreBgColor(score: number): string {
  if (score >= 3.5) return "bg-green-50 dark:bg-green-950/30";
  if (score >= 2.5) return "bg-yellow-50 dark:bg-yellow-950/30";
  return "bg-red-50 dark:bg-red-950/30";
}

function getStatusBadgeVariant(
  status: string
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "completed":
      return "default";
    case "open":
      return "secondary";
    case "in_progress":
      return "secondary";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

// --- Component ---

export function SessionSummaryView({
  sessionNumber,
  scheduledAt,
  completedAt,
  sessionScore,
  durationMinutes,
  status,
  categories,
  isManager,
  seriesId,
  sessionId,
  aiStatus,
  aiSummary,
  aiAddendum,
  managerId,
  reportId,
  managerName,
  reportName,
}: SessionSummaryViewProps) {
  const t = useTranslations("sessions");
  const format = useFormatter();
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      for (const cat of categories) {
        initial[cat.name] = true;
      }
      return initial;
    }
  );

  const toggleCategory = (name: string) => {
    setOpenCategories((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/sessions/${seriesId}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("summary.backToSeries")}
        </Link>
        <h1 className="text-2xl font-semibold">
          {t("summary.sessionNumber", { number: sessionNumber })}
        </h1>
        <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
          <span>
            {format.dateTime(new Date(scheduledAt), {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          {durationMinutes && <span>{t("summary.duration", { count: durationMinutes })}</span>}
          <Badge
            variant={
              status === "completed"
                ? "default"
                : status === "in_progress"
                  ? "secondary"
                  : "outline"
            }
            className="text-xs"
          >
            {status.replace("_", " ")}
          </Badge>
        </div>
      </div>

      {/* Score card */}
      <div
        className={`mb-8 rounded-lg border p-6 text-center ${
          sessionScore !== null
            ? getScoreBgColor(sessionScore)
            : "bg-muted/30"
        }`}
      >
        {sessionScore !== null ? (
          <>
            <p
              className={`text-4xl font-bold tabular-nums ${getScoreColor(sessionScore)}`}
            >
              {sessionScore.toFixed(1)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{t("summary.outOf")}</p>
          </>
        ) : (
          <>
            <p className="text-lg font-medium text-muted-foreground">
              {t("summary.noScore")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("summary.noScoreDesc")}
            </p>
          </>
        )}
      </div>

      {/* AI Summary */}
      {status === "completed" && (
        <>
          <AISummarySection
            sessionId={sessionId}
            isManager={isManager}
            initialStatus={aiStatus}
            initialSummary={aiSummary}
            initialAddendum={aiAddendum}
          />
          <AISuggestionsSection
            sessionId={sessionId}
            seriesId={seriesId}
            managerId={managerId}
            reportId={reportId}
            managerName={managerName}
            reportName={reportName}
            isManager={isManager}
          />
        </>
      )}

      {/* Per-category sections */}
      {categories.map((category) => {
        const isOpen = openCategories[category.name] ?? true;

        return (
          <div key={category.name} className="mb-6">
            <Collapsible open={isOpen} onOpenChange={() => toggleCategory(category.name)}>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-1 py-2 hover:bg-muted/50 transition-colors">
                <h2 className="text-lg font-semibold">{category.name}</h2>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Separator className="my-3" />

                {/* Answers */}
                <div className="space-y-3">
                  {category.questions.map((question) => {
                    const answer = category.answers[question.id];
                    const badge = getAnswerBadge(question.answerType, answer, t);

                    return (
                      <div
                        key={question.id}
                        className="rounded-md border px-4 py-3"
                      >
                        <p className="text-sm font-medium">
                          {question.questionText}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          {badge ? (
                            <Badge variant={badge.variant} className="text-xs">
                              {badge.label}
                            </Badge>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {formatAnswerDisplay(
                                question.answerType,
                                answer,
                                t
                              )}
                            </p>
                          )}
                          {question.answerType.startsWith("rating") &&
                            answer?.answerNumeric !== null &&
                            answer?.answerNumeric !== undefined && (
                              <span className="text-sm text-muted-foreground">
                                {formatAnswerDisplay(
                                  question.answerType,
                                  answer,
                                  t
                                )}
                              </span>
                            )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Shared notes */}
                <div className="mt-4">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t("summary.notes")}
                  </p>
                  {category.sharedNotes &&
                  category.sharedNotes !== "<p></p>" ? (
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none rounded-md border bg-muted/20 px-4 py-3"
                      dangerouslySetInnerHTML={{
                        __html: category.sharedNotes,
                      }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      {t("summary.noNotes")}
                    </p>
                  )}
                </div>

                {/* Talking points */}
                {category.talkingPoints.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t("summary.talkingPoints")}
                    </p>
                    <div className="space-y-1">
                      {category.talkingPoints.map((tp) => (
                        <div
                          key={tp.id}
                          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm"
                        >
                          <CheckCircle2
                            className={`h-4 w-4 shrink-0 ${
                              tp.isDiscussed
                                ? "text-green-500"
                                : "text-muted-foreground/30"
                            }`}
                          />
                          <span
                            className={
                              tp.isDiscussed
                                ? "text-muted-foreground line-through"
                                : ""
                            }
                          >
                            {tp.content}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action items */}
                {category.actionItems.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t("summary.actionItemsLabel")}
                    </p>
                    <div className="space-y-1">
                      {category.actionItems.map((ai) => (
                        <div
                          key={ai.id}
                          className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="truncate font-medium">
                              {ai.title}
                            </span>
                            <Badge
                              variant={getStatusBadgeVariant(ai.status)}
                              className="shrink-0 text-xs"
                            >
                              {ai.status.replace("_", " ")}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                            {ai.assigneeName && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {ai.assigneeName}
                              </span>
                            )}
                            {ai.dueDate && (
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" />
                                {format.dateTime(new Date(ai.dueDate), {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Private notes */}
                {category.privateNotes.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Lock className="h-3 w-3" />
                      {t("summary.privateNotes")}
                    </p>
                    {category.privateNotes.map((note) => (
                      <div
                        key={note.id}
                        className="mt-1 rounded-md border border-dashed bg-muted/20 px-4 py-3"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs gap-1">
                            <Lock className="h-2.5 w-2.5" />
                            {t("summary.private")}
                          </Badge>
                        </div>
                        <div
                          className="prose prose-sm dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: note.content }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        );
      })}

      {/* Footer */}
      <div className="mt-8 border-t pt-6">
        <Link
          href={`/sessions/${seriesId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("summary.backToSeries")}
        </Link>
      </div>
    </div>
  );
}
