"use client";

import { useRouter } from "next/navigation";
import { useTranslations, useFormatter } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import { sanitizeHtml } from "@/lib/utils/sanitize";
import { toast } from "sonner";
import { useApiErrorToast } from "@/lib/i18n/api-error-toast";
import {
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  Pencil,
  Loader2,
  User,
  CalendarDays,
  Star,
} from "lucide-react";
import { StarRating } from "@/components/ui/star-rating";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { type AnswerValue } from "./question-widget";
import { type TalkingPoint } from "./talking-point-list";
import { type ActionItemData } from "./action-item-inline";
import { computeSessionScore } from "@/lib/utils/scoring";

// --- Types ---

interface SummaryQuestion {
  id: string;
  questionText: string;
  answerType: string;
  isRequired: boolean;
}

interface SummaryCategory {
  name: string;
  questions: SummaryQuestion[];
}

interface SummaryScreenProps {
  sessionId: string;
  seriesId: string;
  categories: SummaryCategory[];
  answers: Map<string, AnswerValue>;
  sharedNotes: Record<string, string>;
  talkingPoints: Record<string, TalkingPoint[]>;
  actionItems: Record<string, ActionItemData[]>;
  onGoBack: (step: number) => void;
  isManager: boolean;
}

// --- Helpers ---

const SCORABLE_TYPES = new Set([
  "rating_1_5",
  "rating_1_10",
  "yes_no",
  "mood",
]);

const MOOD_ENTRIES = [
  { emoji: "😞", key: "moodVeryBad" },
  { emoji: "😟", key: "moodBad" },
  { emoji: "😐", key: "moodNeutral" },
  { emoji: "🙂", key: "moodGood" },
  { emoji: "😄", key: "moodGreat" },
] as const;

function renderAnswerDisplay(
  answerType: string,
  value: AnswerValue | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic translation keys
  t: (key: any) => string
): React.ReactNode {
  if (!value) return <span className="italic">{t("notAnswered")}</span>;

  switch (answerType) {
    case "text":
      return value.answerText || <span className="italic">{t("notAnswered")}</span>;

    case "rating_1_5": {
      if (value.answerNumeric === undefined) return <span className="italic">{t("notAnswered")}</span>;
      const v = value.answerNumeric;
      return (
        <span className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              className={cn("h-4 w-4", i <= v ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25")}
            />
          ))}
        </span>
      );
    }

    case "rating_1_10": {
      if (value.answerNumeric === undefined) return <span className="italic">{t("notAnswered")}</span>;
      const v = value.answerNumeric;
      return (
        <span className="flex items-center gap-0.5">
          {Array.from({ length: 10 }, (_, i) => (
            <span
              key={i}
              className={cn("h-2.5 w-3.5 rounded-sm", i < v ? "bg-primary" : "bg-muted-foreground/20")}
            />
          ))}
          <span className="ml-1.5 text-xs text-muted-foreground">{v}/10</span>
        </span>
      );
    }

    case "yes_no":
      if (value.answerNumeric === undefined) return <span className="italic">{t("notAnswered")}</span>;
      return value.answerNumeric === 1 ? t("yes") : t("no");

    case "mood": {
      if (value.answerNumeric === undefined) return <span className="italic">{t("notAnswered")}</span>;
      const entry = MOOD_ENTRIES[(value.answerNumeric ?? 1) - 1] ?? MOOD_ENTRIES[2];
      return (
        <span className="flex items-center gap-1.5">
          <span className="text-xl" role="img" aria-hidden="true">{entry.emoji}</span>
          <span>{t(entry.key)}</span>
        </span>
      );
    }

    case "multiple_choice":
      if (value.answerJson && Array.isArray(value.answerJson)) {
        return (value.answerJson as string[]).join(", ");
      }
      return value.answerText || <span className="italic">{t("notAnswered")}</span>;

    default:
      return value.answerText || <span className="italic">{t("notAnswered")}</span>;
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

// --- Component ---

export function SummaryScreen({
  sessionId,
  seriesId,
  categories,
  answers,
  sharedNotes,
  talkingPoints,
  actionItems,
  onGoBack,
  isManager,
}: SummaryScreenProps) {
  const router = useRouter();
  const t = useTranslations("sessions.summary");
  const format = useFormatter();
  const { showApiError } = useApiErrorToast();

  // Compute score from current answers
  const scoreInput = categories.flatMap((cat) =>
    cat.questions
      .filter((q) => SCORABLE_TYPES.has(q.answerType))
      .map((q) => {
        const answer = answers.get(q.id);
        return {
          answerType: q.answerType,
          answerNumeric: answer?.answerNumeric ?? null,
          skipped: false,
        };
      })
  );
  const sessionScore = computeSessionScore(scoreInput);

  // Complete session mutation
  const completeSession = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}/complete`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to complete session");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(t("sessionCompleted"));
      router.push(`/sessions/${seriesId}`);
    },
    onError: (error: Error) => {
      showApiError(error);
    },
  });

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight font-headline">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("reviewDesc")}
          </p>
        </div>

        {/* Score card */}
        <div className="mb-8 rounded-2xl border border-[var(--editorial-outline-variant,var(--border))]/50 p-6 text-center bg-[var(--editorial-surface-container-low,var(--muted))]/30 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex justify-center">
            <StarRating score={sessionScore} size="lg" />
          </div>
          {sessionScore !== null ? (
            <p className="mt-2 text-sm tabular-nums text-muted-foreground">
              {format.number(sessionScore, { maximumFractionDigits: 1, minimumFractionDigits: 1 })} {t("outOf")}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">{t("noScore")}</p>
          )}
        </div>

        {/* Categories */}
        {categories.map((category, catIndex) => {
          const catLabel = category.name;
          const catNotes = sharedNotes[category.name] ?? "";
          const catTalkingPoints = talkingPoints[category.name] ?? [];
          const catActionItems = actionItems[category.name] ?? [];

          return (
            <div key={category.name} className="mb-8">
              {/* Category header with edit button */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold font-headline">{catLabel}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs text-muted-foreground"
                  onClick={() => onGoBack(catIndex + 1)}
                >
                  <Pencil className="h-3 w-3" />
                  {t("edit")}
                </Button>
              </div>
              <Separator className="my-3" />

              {/* Answers */}
              <div className="space-y-3">
                {category.questions.map((question) => {
                  const answer = answers.get(question.id);
                  const isAnswered =
                    answer &&
                    (answer.answerText ||
                      answer.answerNumeric !== undefined ||
                      answer.answerJson);
                  const isUnansweredRequired =
                    question.isRequired && !isAnswered;

                  return (
                    <div key={question.id} className="rounded-xl border border-[var(--editorial-outline-variant,var(--border))]/50 px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">
                          {question.questionText}
                        </p>
                        {isUnansweredRequired && (
                          <Badge
                            variant="destructive"
                            className="shrink-0 gap-1 text-xs"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            {t("required")}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {renderAnswerDisplay(question.answerType, answer, t)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Notes */}
              <div className="mt-4">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  {t("notes")}
                </p>
                {catNotes && catNotes !== "<p></p>" ? (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none rounded-md border bg-muted/20 px-4 py-3"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(catNotes) }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    {t("noNotes")}
                  </p>
                )}
              </div>

              {/* Talking points */}
              {catTalkingPoints.length > 0 && (
                <div className="mt-4">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    {t("talkingPoints")}
                  </p>
                  <div className="space-y-1">
                    {catTalkingPoints.map((tp) => (
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
              {catActionItems.length > 0 && (
                <div className="mt-4">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    {t("actionItemsLabel")}
                  </p>
                  <div className="space-y-1">
                    {catActionItems.map((ai) => (
                      <div
                        key={ai.id}
                        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="truncate font-medium">
                            {ai.title}
                          </span>
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {ai.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                          {ai.assignee && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {ai.assignee.firstName} {ai.assignee.lastName}
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
            </div>
          );
        })}

        {/* Bottom actions */}
        <div className="mt-8 flex items-center justify-between border-t pt-6">
          <Button
            variant="ghost"
            onClick={() => onGoBack(categories.length)}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("goBack")}
          </Button>

          {isManager && (
            <button
              type="button"
              onClick={() => {
                // Validate all required questions are answered
                const unanswered: string[] = [];
                for (const cat of categories) {
                  for (const q of cat.questions) {
                    if (!q.isRequired) continue;
                    const a = answers.get(q.id);
                    if (!a || (a.answerText === undefined && a.answerNumeric === undefined && a.answerJson === undefined)) {
                      unanswered.push(q.questionText);
                    }
                  }
                }
                if (unanswered.length > 0) {
                  toast.error(t("required"), {
                    description: unanswered.slice(0, 3).join(", ") + (unanswered.length > 3 ? ` (+${unanswered.length - 3})` : ""),
                  });
                  return;
                }
                completeSession.mutate();
              }}
              disabled={completeSession.isPending}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold font-headline text-sm text-white shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--editorial-primary-container, var(--primary)) 100%)" }}
            >
              {completeSession.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {t("completeSession")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
