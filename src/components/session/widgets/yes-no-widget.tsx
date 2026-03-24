"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface YesNoWidgetProps {
  value: number | null;
  onChange: (value: { answerNumeric: number }) => void;
  disabled?: boolean;
}

export function YesNoWidget({ value, onChange, disabled }: YesNoWidgetProps) {
  const t = useTranslations("sessions.widgets");

  return (
    <div className="flex gap-3">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange({ answerNumeric: 1 })}
        className={cn(
          "flex-1 rounded-xl border-2 px-6 py-3 text-sm font-medium transition-colors active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-50",
          value === 1
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background hover:bg-accent"
        )}
      >
        {t("yes")}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange({ answerNumeric: 0 })}
        className={cn(
          "flex-1 rounded-xl border-2 px-6 py-3 text-sm font-medium transition-colors active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-50",
          value === 0
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background hover:bg-accent"
        )}
      >
        {t("no")}
      </button>
    </div>
  );
}
