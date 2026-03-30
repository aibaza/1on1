"use client";

import { useTranslations } from "next-intl";
import { Check, Star } from "lucide-react";

/**
 * Static replica of wizard session for landing page showcase.
 * Shows template-based steps (variable count, not fixed 4).
 */
export function ShowcaseWizard() {
  const t = useTranslations("landing.showcase.wizard");

  // Example steps from a template — count is variable
  const steps = [
    { label: t("step1"), completed: true },
    { label: t("step2"), completed: false, active: true },
    { label: t("step3"), completed: false },
    { label: t("step4"), completed: false },
  ];

  return (
    <div className="bg-card p-6 rounded-3xl shadow-sm dark:shadow-none dark:ring-1 dark:ring-white/5 flex flex-col">
      {/* Wizard content */}
      <div className="mb-6 w-full">
        {/* Step pills — horizontal scroll, matching wizard-shell pill row */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                step.active
                  ? "bg-primary text-white shadow-sm"
                  : step.completed
                    ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                    : "bg-[var(--editorial-surface-container-low)] text-muted-foreground/60"
              }`}
            >
              {step.completed && <Check className="h-3 w-3" />}
              {step.active && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              {!step.completed && !step.active && <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />}
              {step.label}
            </div>
          ))}
          {/* Hint that more steps can exist */}
          <div className="flex items-center px-2 text-muted-foreground/30 text-xs shrink-0">
            ···
          </div>
        </div>

        {/* Active step card — rating question */}
        <div className="bg-[var(--editorial-surface-container-low)] rounded-xl p-5">
          <p className="text-sm text-foreground font-medium mb-4 leading-relaxed">
            {t("question")}
          </p>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold shrink-0">
              {t("ratingLabel")}
            </span>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <Star
                  key={i}
                  className="h-6 w-6 fill-[var(--color-warning,#f59e0b)] text-[var(--color-warning,#f59e0b)] cursor-pointer hover:scale-110 transition-transform"
                />
              ))}
              <Star className="h-6 w-6 text-muted-foreground/25 cursor-pointer hover:text-[var(--color-warning,#f59e0b)] transition-colors" />
            </div>
          </div>
        </div>
      </div>

      <h3 className="font-[family-name:var(--font-manrope)] text-2xl font-bold mb-3">
        {t("title")}
      </h3>
      <p className="text-muted-foreground text-sm">
        {t("description")}
      </p>
    </div>
  );
}
