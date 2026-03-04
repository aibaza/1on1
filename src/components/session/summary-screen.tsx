"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  Pencil,
  Loader2,
  User,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { type AnswerValue } from "./question-widget";
import { type TalkingPoint } from "./talking-point-list";
import { type ActionItemData } from "./action-item-inline";
import { computeSessionScore, normalizeAnswer } from "@/lib/utils/scoring";

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

const CATEGORY_LABELS: Record<string, string> = {
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

const SCORABLE_TYPES = new Set([
  "rating_1_5",
  "rating_1_10",
  "yes_no",
  "mood",
]);

function formatAnswerDisplay(
  answerType: string,
  value: AnswerValue | undefined
): string {
  if (!value) return "Not answered";

  switch (answerType) {
    case "text":
      return value.answerText || "Not answered";
    case "rating_1_5":
      return value.answerNumeric !== undefined
        ? `${value.answerNumeric} / 5`
        : "Not answered";
    case "rating_1_10":
      return value.answerNumeric !== undefined
        ? `${value.answerNumeric} / 10`
        : "Not answered";
    case "yes_no":
      if (value.answerNumeric === undefined) return "Not answered";
      return value.answerNumeric === 1 ? "Yes" : "No";
    case "mood": {
      const moods = ["Very Bad", "Bad", "Neutral", "Good", "Great"];
      return value.answerNumeric !== undefined
        ? moods[(value.answerNumeric ?? 1) - 1] ?? `${value.answerNumeric} / 5`
        : "Not answered";
    }
    case "multiple_choice":
      if (value.answerJson && Array.isArray(value.answerJson)) {
        return (value.answerJson as string[]).join(", ");
      }
      return value.answerText || "Not answered";
    default:
      return value.answerText || "Not answered";
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
      toast.success("Session completed!");
      router.push(`/sessions/${seriesId}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">Session Summary</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review everything before completing the session
          </p>
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
              <p className={`text-4xl font-bold tabular-nums ${getScoreColor(sessionScore)}`}>
                {sessionScore.toFixed(1)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                out of 5.0
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-muted-foreground">
                No score
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                No numeric answers to compute a score
              </p>
            </>
          )}
        </div>

        {/* Categories */}
        {categories.map((category, catIndex) => {
          const catLabel = CATEGORY_LABELS[category.name] ?? category.name;
          const catNotes = sharedNotes[category.name] ?? "";
          const catTalkingPoints = talkingPoints[category.name] ?? [];
          const catActionItems = actionItems[category.name] ?? [];

          return (
            <div key={category.name} className="mb-8">
              {/* Category header with edit button */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{catLabel}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs text-muted-foreground"
                  onClick={() => onGoBack(catIndex + 1)}
                >
                  <Pencil className="h-3 w-3" />
                  Edit
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
                    <div key={question.id} className="rounded-md border px-4 py-3">
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
                            Required
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatAnswerDisplay(question.answerType, answer)}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Notes */}
              <div className="mt-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Notes
                </p>
                {catNotes && catNotes !== "<p></p>" ? (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none rounded-md border bg-muted/20 px-4 py-3"
                    dangerouslySetInnerHTML={{ __html: catNotes }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No notes
                  </p>
                )}
              </div>

              {/* Talking points */}
              {catTalkingPoints.length > 0 && (
                <div className="mt-4">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Talking Points
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
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Action Items
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
                              {new Date(ai.dueDate).toLocaleDateString(
                                "en-US",
                                { month: "short", day: "numeric" }
                              )}
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
            Go Back
          </Button>

          {isManager && (
            <Button
              size="lg"
              onClick={() => completeSession.mutate()}
              disabled={completeSession.isPending}
              className="gap-2"
            >
              {completeSession.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Complete Session
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
