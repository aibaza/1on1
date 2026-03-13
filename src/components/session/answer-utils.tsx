"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SummaryAnswer {
  id: string;
  questionId: string;
  answerText: string | null;
  answerNumeric: number | null;
  answerJson: unknown;
  skipped: boolean;
}

const MOOD_ENTRIES = [
  { emoji: "😞", key: "moodVeryBad" },
  { emoji: "😟", key: "moodBad" },
  { emoji: "😐", key: "moodNeutral" },
  { emoji: "🙂", key: "moodGood" },
  { emoji: "😄", key: "moodGreat" },
] as const;

export function renderAnswerDisplay(
  answerType: string,
  answer: SummaryAnswer | undefined,
  t: ReturnType<typeof useTranslations<"sessions">>
): React.ReactNode {
  if (!answer || answer.skipped)
    return <span className="italic">{t("summary.skipped")}</span>;
  if (!answer.answerText && answer.answerNumeric === null && !answer.answerJson)
    return <span className="italic">{t("summary.notAnswered")}</span>;

  switch (answerType) {
    case "text":
      return answer.answerText || <span className="italic">{t("summary.notAnswered")}</span>;

    case "rating_1_5": {
      if (answer.answerNumeric === null)
        return <span className="italic">{t("summary.notAnswered")}</span>;
      const v = answer.answerNumeric;
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
      if (answer.answerNumeric === null)
        return <span className="italic">{t("summary.notAnswered")}</span>;
      const v = answer.answerNumeric;
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
      if (answer.answerNumeric === null)
        return <span className="italic">{t("summary.notAnswered")}</span>;
      return answer.answerNumeric === 1 ? t("summary.yes") : t("summary.no");

    case "mood": {
      if (answer.answerNumeric === null)
        return <span className="italic">{t("summary.notAnswered")}</span>;
      const entry = MOOD_ENTRIES[(answer.answerNumeric ?? 1) - 1] ?? MOOD_ENTRIES[2];
      return (
        <span className="flex items-center gap-1.5">
          <span className="text-xl" role="img" aria-hidden="true">{entry.emoji}</span>
          <span>{t(`summary.${entry.key}`)}</span>
        </span>
      );
    }

    case "multiple_choice":
      if (answer.answerJson && Array.isArray(answer.answerJson)) {
        return (answer.answerJson as string[]).join(", ");
      }
      return answer.answerText || <span className="italic">{t("summary.notAnswered")}</span>;

    default:
      return answer.answerText || <span className="italic">{t("summary.notAnswered")}</span>;
  }
}
