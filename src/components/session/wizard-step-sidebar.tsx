"use client";

import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepInfo {
  name: string;
  answered: number;
  total: number;
  isComplete: boolean;
}

interface WizardStepSidebarProps {
  steps: StepInfo[];
  currentStep: number;
  onStepChange: (step: number) => void;
}

export function WizardStepSidebar({
  steps,
  currentStep,
  onStepChange,
}: WizardStepSidebarProps) {
  const t = useTranslations("sessions.wizard");

  return (
    <nav
      className="hidden md:flex w-[240px] shrink-0 flex-col p-8 sticky top-20 h-[calc(100vh-10rem)] overflow-y-auto"
      aria-label={t("wizardSteps")}
    >
      <div className="space-y-6">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isComplete = step.isComplete;
          const isLast = index === steps.length - 1;

          return (
            <div key={index} className="relative">
              <button
                type="button"
                onClick={() => onStepChange(index)}
                className="flex items-center gap-4 w-full text-left group focus-visible:outline-none"
              >
                {/* Step circle */}
                <div
                  className={cn(
                    "shrink-0 flex items-center justify-center rounded-full text-xs font-bold z-10 transition-all",
                    isActive
                      ? "w-10 h-10 bg-primary text-white ring-4 ring-primary/20"
                      : isComplete
                        ? "w-8 h-8 bg-primary text-white"
                        : "w-8 h-8 bg-[var(--editorial-surface-container-highest,var(--accent))] text-muted-foreground"
                  )}
                >
                  {isComplete ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </div>

                {/* Step label */}
                <div className="min-w-0">
                  <span
                    className={cn(
                      "font-headline text-sm transition-colors",
                      isActive
                        ? "font-bold text-foreground"
                        : "font-medium text-muted-foreground group-hover:text-foreground"
                    )}
                  >
                    {step.name}
                  </span>
                  {step.total > 0 && isActive && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {t("answered", { answered: step.answered, total: step.total })}
                    </p>
                  )}
                </div>
              </button>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "absolute w-0.5 bg-[var(--editorial-outline-variant,var(--border))]/30",
                    isActive ? "left-5 top-10 h-6" : "left-4 top-8 h-6"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
