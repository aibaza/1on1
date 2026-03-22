"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface MoodWidgetProps {
  value: number | null;
  onChange: (value: { answerNumeric: number }) => void;
  disabled?: boolean;
  answerConfig?: { labels?: string[] };
}

const MOOD_KEYS = [
  { emoji: "\uD83D\uDE2B", key: "moodVeryUnhappy" },
  { emoji: "\uD83D\uDE10", key: "moodUnhappy" },
  { emoji: "\uD83D\uDE42", key: "moodNeutral" },
  { emoji: "\uD83D\uDE0A", key: "moodHappy" },
  { emoji: "\uD83E\uDD29", key: "moodVeryHappy" },
] as const;

export function MoodWidget({
  value,
  onChange,
  disabled,
  answerConfig,
}: MoodWidgetProps) {
  const t = useTranslations("sessions.widgets");
  const labels = answerConfig?.labels;

  return (
    <div className="flex justify-between max-w-lg bg-[var(--editorial-surface-container-low,var(--muted))] p-6 rounded-2xl">
      {MOOD_KEYS.map((mood, index) => {
        const rating = index + 1;
        const isSelected = value === rating;
        const label = labels?.[index] ?? t(mood.key);

        return (
          <button
            key={rating}
            type="button"
            disabled={disabled}
            onClick={() => onChange({ answerNumeric: rating })}
            className={cn(
              "group flex flex-col items-center gap-2 transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              "disabled:pointer-events-none disabled:opacity-50",
              isSelected
                ? "ring-2 ring-primary ring-offset-4 rounded-xl p-2 bg-card shadow-sm"
                : "p-2"
            )}
            aria-label={label}
          >
            <span
              className={cn(
                "text-3xl transition-all",
                isSelected
                  ? ""
                  : "grayscale group-hover:grayscale-0 opacity-40 group-hover:opacity-100"
              )}
              role="img"
              aria-hidden="true"
            >
              {mood.emoji}
            </span>
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-tighter transition-colors",
                isSelected ? "text-primary" : "text-muted-foreground group-hover:text-primary"
              )}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
