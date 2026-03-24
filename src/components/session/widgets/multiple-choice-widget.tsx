"use client";

import { cn } from "@/lib/utils";

interface MultipleChoiceWidgetProps {
  value: { selected: string } | null;
  onChange: (value: { answerJson: { selected: string } }) => void;
  disabled?: boolean;
  answerConfig?: { options?: string[] };
}

export function MultipleChoiceWidget({
  value,
  onChange,
  disabled,
  answerConfig,
}: MultipleChoiceWidgetProps) {
  const options = answerConfig?.options ?? [];
  const selectedValue = value?.selected ?? null;

  return (
    <div className="flex flex-col gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          disabled={disabled}
          onClick={() => onChange({ answerJson: { selected: option } })}
          className={cn(
            "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:pointer-events-none disabled:opacity-50",
            selectedValue === option
              ? "border-primary bg-primary/5"
              : "border-border bg-background hover:bg-accent"
          )}
        >
          <div
            className={cn(
              "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
              selectedValue === option
                ? "border-primary"
                : "border-muted-foreground/40"
            )}
          >
            {selectedValue === option && (
              <div className="h-2 w-2 rounded-full bg-primary" />
            )}
          </div>
          <span>{option}</span>
        </button>
      ))}
    </div>
  );
}
