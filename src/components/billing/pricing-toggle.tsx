"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface PricingToggleProps {
  isYearly: boolean;
  onToggle: (yearly: boolean) => void;
}

export function PricingToggle({ isYearly, onToggle }: PricingToggleProps) {
  const t = useTranslations("billing.pricing");

  return (
    <div className="flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => onToggle(false)}
        className={cn(
          "rounded-xl px-5 py-2.5 text-sm font-semibold transition-all",
          !isYearly
            ? "bg-primary text-primary-foreground shadow-md"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {t("monthly")}
      </button>
      <button
        type="button"
        onClick={() => onToggle(true)}
        className={cn(
          "rounded-xl px-5 py-2.5 text-sm font-semibold transition-all",
          isYearly
            ? "bg-primary text-primary-foreground shadow-md"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {t("yearly")}
      </button>
      {isYearly && (
        <Badge
          variant="secondary"
          className="bg-[var(--color-success)]/10 text-[var(--color-success)] border-0"
        >
          {t("savePercent", { percent: "17" })}
        </Badge>
      )}
    </div>
  );
}
