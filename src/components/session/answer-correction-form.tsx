"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { renderAnswerDisplay, type SummaryAnswer } from "./answer-utils";
import { cn } from "@/lib/utils";

// Allow originalAnswer without requiring id (id only needed for submissions)
type OriginalAnswerInput = Omit<SummaryAnswer, "id"> & { id?: string };

interface AnswerCorrectionFormProps {
  answerId: string; // session_answers.id (NOT questionId)
  sessionId: string;
  questionAnswerType: string;
  originalAnswer: OriginalAnswerInput | undefined;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AnswerCorrectionForm({
  answerId,
  sessionId,
  questionAnswerType,
  originalAnswer,
  onSuccess,
  onCancel,
}: AnswerCorrectionFormProps) {
  const t = useTranslations("sessions");
  const router = useRouter();

  // New answer state — text field for text type; numeric for rating types
  const [newAnswerText, setNewAnswerText] = useState<string>("");
  const [newAnswerNumeric, setNewAnswerNumeric] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  const debouncedReason = useDebounce(reason, 800);

  // AI validation query — fires when debounced reason meets min length
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
      if (!res.ok) return { pass: true, feedback: null }; // degrade gracefully
      return res.json() as Promise<{ pass: boolean; feedback: string | null }>;
    },
    enabled: debouncedReason.length >= 20,
    staleTime: 30_000,
  });

  // Correction submission mutation
  const { mutate: submitCorrection, isPending } = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        answerId,
        reason,
      };
      if (questionAnswerType === "text") {
        body.newAnswerText = newAnswerText || null;
      } else if (
        ["rating_1_5", "rating_1_10", "yes_no", "mood"].includes(
          questionAnswerType
        )
      ) {
        body.newAnswerNumeric = newAnswerNumeric;
      }
      const res = await fetch(`/api/sessions/${sessionId}/corrections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Correction failed");
      }
      return res.json();
    },
    onSuccess: () => {
      onSuccess();
      router.refresh(); // Re-run server component to get updated score + fresh data
    },
  });

  // AI advisory only — button is gated only by pending state, not AI result
  const canSubmit = !isPending;

  // Cast to SummaryAnswer for renderAnswerDisplay (id optional in input)
  const originalAnswerForDisplay = originalAnswer as SummaryAnswer | undefined;

  return (
    <div className="mt-3 rounded-md border border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20 px-4 py-3 space-y-3">
      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
        {t("corrections.correctionFormTitle")}
      </p>

      {/* Original value display */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">
          {t("corrections.originalLabel")}
        </p>
        <div className="text-sm text-muted-foreground bg-muted/40 rounded px-3 py-2">
          {renderAnswerDisplay(questionAnswerType, originalAnswerForDisplay, t)}
        </div>
      </div>

      {/* New answer input — text type */}
      {questionAnswerType === "text" && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {t("corrections.newAnswerLabel")}
          </p>
          <Textarea
            value={newAnswerText}
            onChange={(e) => setNewAnswerText(e.target.value)}
            rows={3}
            className="text-sm"
          />
        </div>
      )}

      {/* New answer input — numeric types (rating_1_5, rating_1_10, yes_no, mood) */}
      {["rating_1_5", "rating_1_10", "yes_no", "mood"].includes(
        questionAnswerType
      ) && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {t("corrections.newAnswerLabel")}
          </p>
          <input
            type="number"
            value={newAnswerNumeric ?? ""}
            onChange={(e) =>
              setNewAnswerNumeric(
                e.target.value ? Number(e.target.value) : null
              )
            }
            min={
              questionAnswerType === "rating_1_5"
                ? 1
                : questionAnswerType === "yes_no"
                  ? 0
                  : 1
            }
            max={
              questionAnswerType === "rating_1_5"
                ? 5
                : questionAnswerType === "rating_1_10"
                  ? 10
                  : questionAnswerType === "mood"
                    ? 5
                    : 1
            }
            className="w-24 rounded border px-2 py-1 text-sm"
          />
        </div>
      )}

      {/* Reason field */}
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

        {/* AI feedback — loading */}
        {isValidating && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t("corrections.aiValidating")}
          </div>
        )}

        {/* AI feedback — result (only when feedback is non-null) */}
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

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          onClick={() => submitCorrection()}
          disabled={!canSubmit}
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          {t("corrections.submitButton")}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {t("corrections.cancelButton")}
        </Button>
      </div>
    </div>
  );
}
