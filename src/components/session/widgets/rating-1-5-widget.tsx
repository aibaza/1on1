"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Rating15WidgetProps {
  value: number | null;
  onChange: (value: { answerNumeric: number }) => void;
  disabled?: boolean;
  answerConfig?: { labels?: string[] };
}

const DEFAULT_LABELS = ["Poor", "Fair", "Good", "Very Good", "Excellent"];

export function Rating15Widget({
  value,
  onChange,
  disabled,
  answerConfig,
}: Rating15WidgetProps) {
  const labels = answerConfig?.labels ?? DEFAULT_LABELS;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            disabled={disabled}
            onClick={() => onChange({ answerNumeric: rating })}
            className={cn(
              "rounded-full p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "hover:text-amber-400 disabled:pointer-events-none disabled:opacity-50"
            )}
            aria-label={`${rating} out of 5${labels[rating - 1] ? ` - ${labels[rating - 1]}` : ""}`}
          >
            <Star
              className={cn(
                "h-8 w-8 transition-colors",
                value != null && rating <= value
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/40"
              )}
            />
          </button>
        ))}
      </div>
      {value != null && labels[value - 1] && (
        <p className="text-sm text-muted-foreground">{labels[value - 1]}</p>
      )}
    </div>
  );
}
