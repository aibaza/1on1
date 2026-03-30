"use client";

import { useTranslations } from "next-intl";
import { Check, Star } from "lucide-react";

/**
 * Static replica of wizard mobile carousel for landing page showcase.
 * Matches the pill/card UI from wizard-mobile-carousel.tsx.
 */
export function ShowcaseWizard() {
  const t = useTranslations("landing.showcase.wizard");

  const steps = [
    { label: t("step1"), completed: true },
    { label: t("step2"), completed: false, active: true },
    { label: t("step3"), completed: false },
    { label: t("step4"), completed: false },
  ];

  return (
    <div className="bg-card p-6 rounded-3xl shadow-sm dark:shadow-none dark:ring-1 dark:ring-white/5 flex flex-col items-center text-center">
      {/* Phone frame */}
      <div className="mb-6 w-full max-w-[300px]">
        {/* Step pills — matching wizard-mobile-carousel */}
        <div className="flex gap-2 mb-5 overflow-hidden">
          {steps.map((step, i) => (
            <button
              key={i}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-[10px] font-semibold transition-all ${
                step.active
                  ? "bg-primary text-white shadow-md"
                  : step.completed
                    ? "bg-[var(--editorial-surface-container-low)] text-foreground"
                    : "bg-[var(--editorial-surface-container-low)] text-muted-foreground/60"
              }`}
            >
              {step.completed ? (
                <Check className="h-3 w-3" />
              ) : (
                <span className={`w-1.5 h-1.5 rounded-full ${step.active ? "bg-white" : "bg-muted-foreground/30"}`} />
              )}
              <span className="truncate w-full">{step.label}</span>
            </button>
          ))}
        </div>

        {/* Active step card — rating question */}
        <div className="bg-[var(--editorial-surface-container-low)] rounded-2xl p-5">
          <p className="text-sm text-foreground font-medium mb-5 leading-relaxed">
            {t("question")}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2">
            {t("ratingLabel")}
          </p>
          <div className="flex justify-center gap-1.5 mb-1">
            {[1, 2, 3, 4].map((i) => (
              <Star
                key={i}
                className="h-7 w-7 text-amber-400 fill-amber-400 drop-shadow-sm"
              />
            ))}
            <Star className="h-7 w-7 text-muted-foreground/25" />
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
