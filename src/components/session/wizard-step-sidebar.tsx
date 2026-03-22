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
      className="hidden md:flex w-[220px] shrink-0 flex-col bg-[var(--sidebar,var(--muted))] overflow-y-auto"
      aria-label={t("wizardSteps")}
    >
      <div className="flex flex-col gap-1 p-4">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isComplete = step.isComplete;

          return (
            <button
              key={index}
              type="button"
              onClick={() => onStepChange(index)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3.5 py-3 text-left transition-all font-headline text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                isActive
                  ? "bg-card text-primary font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50"
              )}
            >
              {/* Step indicator */}
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  isComplete
                    ? "bg-[var(--color-success)] text-white"
                    : isActive
                      ? "bg-primary text-white"
                      : "bg-[var(--editorial-surface-container-high,var(--accent))] text-muted-foreground"
                )}
              >
                {isComplete ? (
                  <Check className="size-3.5" />
                ) : (
                  index + 1
                )}
              </span>

              {/* Step name + completion count */}
              <div className="min-w-0 flex-1">
                <p className="truncate leading-tight">{step.name}</p>
                {step.total > 0 && (
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                    {t("answered", { answered: step.answered, total: step.total })}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
