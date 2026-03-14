"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { QuestionWidget, type AnswerValue } from "./question-widget";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { evaluateConditionFromRecord } from "@/lib/utils/evaluate-condition";
import { cn } from "@/lib/utils";
import type { SummaryAnswer } from "./answer-utils";

interface SummaryQuestion {
  id: string;
  questionText: string;
  answerType: string;
  answerConfig: unknown;
  isRequired: boolean;
  helpText: string | null;
  conditionalOnQuestionId: string | null;
  conditionalOperator: string | null;
  conditionalValue: string | null;
}

interface SectionCorrectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  categoryName: string;
  questions: SummaryQuestion[];
  currentAnswers: Record<string, SummaryAnswer>;
  onSuccess: () => void;
}

export function SectionCorrectionDialog({
  open,
  onOpenChange,
  sessionId,
  categoryName,
  questions,
  currentAnswers,
  onSuccess,
}: SectionCorrectionDialogProps) {
  const t = useTranslations("sessions");
  const router = useRouter();

  // Only questions that have an existing answer record (corrections amend existing answers)
  const editableQuestions = questions.filter((q) => !!currentAnswers[q.id]?.id);

  // Initialize draft answers from current answers
  const [draftAnswers, setDraftAnswers] = useState<Record<string, AnswerValue>>(
    () => {
      const initial: Record<string, AnswerValue> = {};
      for (const q of editableQuestions) {
        const answer = currentAnswers[q.id];
        if (answer) {
          const val: AnswerValue = {};
          if (answer.answerText != null) val.answerText = answer.answerText;
          if (answer.answerNumeric != null) val.answerNumeric = answer.answerNumeric;
          if (answer.answerJson != null) val.answerJson = answer.answerJson;
          if (Object.keys(val).length > 0) initial[q.id] = val;
        }
      }
      return initial;
    }
  );

  const [reason, setReason] = useState("");
  const debouncedReason = useDebounce(reason, 800);

  // Determine visible questions based on live conditional evaluation
  const isVisible = (q: SummaryQuestion) =>
    evaluateConditionFromRecord(q, draftAnswers);

  const updateDraft = (questionId: string, value: AnswerValue) => {
    setDraftAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // AI validation query
  const { data: aiValidation, isFetching: isValidating } = useQuery({
    queryKey: ["validate-reason", sessionId, debouncedReason],
    queryFn: async () => {
      const res = await fetch(
        `/api/sessions/${sessionId}/corrections/validate-reason`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: debouncedReason }),
        }
      );
      if (!res.ok) return { pass: true, feedback: null };
      return res.json() as Promise<{ pass: boolean; feedback: string | null }>;
    },
    enabled: debouncedReason.length >= 20,
    staleTime: 30_000,
  });

  const { mutate: submitBatch, isPending } = useMutation({
    mutationFn: async () => {
      // Compute diff — only include answers that actually changed
      const corrections: Array<{
        answerId: string;
        newAnswerText?: string | null;
        newAnswerNumeric?: number | null;
        newAnswerJson?: unknown;
      }> = [];

      for (const q of editableQuestions) {
        if (!isVisible(q)) continue;
        const answer = currentAnswers[q.id];
        if (!answer?.id) continue;

        const draft = draftAnswers[q.id];
        const draftText = draft?.answerText ?? null;
        const draftNumeric = draft?.answerNumeric ?? null;
        const draftJson = draft?.answerJson ?? null;

        const origText = answer.answerText ?? null;
        const origNumeric = answer.answerNumeric ?? null;
        const origJson = answer.answerJson ?? null;

        const changed =
          draftText !== origText ||
          draftNumeric !== origNumeric ||
          JSON.stringify(draftJson) !== JSON.stringify(origJson);

        if (changed) {
          corrections.push({
            answerId: answer.id,
            newAnswerText: draftText,
            newAnswerNumeric: draftNumeric,
            newAnswerJson: draftJson,
          });
        }
      }

      if (corrections.length === 0) {
        throw new Error("NO_CHANGES");
      }

      const res = await fetch(`/api/sessions/${sessionId}/corrections/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ corrections, reason }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Batch correction failed");
      }
      return res.json();
    },
    onError: (err) => {
      if (err.message === "NO_CHANGES") {
        toast.info("No answers were changed");
        return;
      }
      toast.error(err.message);
    },
    onSuccess: () => {
      router.refresh();
      onOpenChange(false);
      onSuccess();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>
            {t("corrections.editSectionTitle", { section: categoryName })}
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable question list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {editableQuestions.filter(isVisible).map((q) => (
            <div key={q.id} className="space-y-2">
              <p className="text-sm font-medium">{q.questionText}</p>
              {q.helpText && (
                <p className="text-xs text-muted-foreground">{q.helpText}</p>
              )}
              <QuestionWidget
                question={{ id: q.id, answerType: q.answerType, answerConfig: q.answerConfig }}
                value={draftAnswers[q.id] ?? null}
                onChange={(val) => updateDraft(q.id, val)}
              />
            </div>
          ))}

          {editableQuestions.filter(isVisible).length === 0 && (
            <p className="text-sm text-muted-foreground italic py-4 text-center">
              No editable answers in this section.
            </p>
          )}
        </div>

        {/* Pinned footer: reason + buttons */}
        <div className="shrink-0 border-t px-6 py-4 space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              {t("corrections.reasonLabel")}
            </p>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("corrections.reasonPlaceholder")}
              rows={3}
              className={cn(
                "text-sm",
                reason.length > 0 && reason.length < 20 && "border-amber-400"
              )}
            />
            <p className="mt-1 text-xs text-muted-foreground text-right">
              {reason.length}/500
            </p>

            {isValidating && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("corrections.aiValidating")}
              </div>
            )}

            {!isValidating &&
              aiValidation?.feedback !== null &&
              aiValidation?.feedback !== undefined && (
                <div
                  className={cn(
                    "mt-2 flex items-start gap-1.5 text-xs",
                    aiValidation.pass
                      ? "text-green-700 dark:text-green-400"
                      : "text-amber-700 dark:text-amber-400"
                  )}
                >
                  {aiValidation.pass ? (
                    <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  )}
                  <span className="flex flex-col gap-0.5">
                    <span>
                      {aiValidation.pass
                        ? t("corrections.aiPassLabel")
                        : t("corrections.aiFailLabel")}
                    </span>
                    {aiValidation.feedback && (
                      <span>{aiValidation.feedback}</span>
                    )}
                  </span>
                </div>
              )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t("corrections.cancelButton")}
            </Button>
            <Button onClick={() => submitBatch()} disabled={isPending}>
              {isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {t("corrections.submitButton")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
