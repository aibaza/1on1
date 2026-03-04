"use client";

import { cn } from "@/lib/utils";

interface Rating110WidgetProps {
  value: number | null;
  onChange: (value: { answerNumeric: number }) => void;
  disabled?: boolean;
}

export function Rating110Widget({
  value,
  onChange,
  disabled,
}: Rating110WidgetProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((rating) => (
        <button
          key={rating}
          type="button"
          disabled={disabled}
          onClick={() => onChange({ answerNumeric: rating })}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:pointer-events-none disabled:opacity-50",
            value === rating
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background hover:bg-accent hover:text-accent-foreground"
          )}
          aria-label={`${rating} out of 10`}
        >
          {rating}
        </button>
      ))}
    </div>
  );
}
