"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepInfo {
  name: string;
  /** Number of answered questions in this section */
  answered: number;
  /** Total visible questions in this section */
  total: number;
  /** Whether all questions are answered */
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
  return (
    <>
      {/* Desktop: vertical sidebar */}
      <nav
        className="hidden md:flex w-[200px] shrink-0 flex-col border-r bg-muted/30 overflow-y-auto"
        aria-label="Wizard steps"
      >
        <div className="flex flex-col gap-0.5 p-3">
          {steps.map((step, index) => {
            const isActive = index === currentStep;
            const isComplete = step.isComplete;

            return (
              <button
                key={index}
                type="button"
                onClick={() => onStepChange(index)}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                {/* Step indicator */}
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                    isComplete
                      ? "bg-primary text-primary-foreground"
                      : isActive
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground"
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
                    <p className="text-[10px] text-muted-foreground">
                      {step.answered}/{step.total} answered
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile: horizontal scrollable strip */}
      <nav
        className="flex md:hidden overflow-x-auto border-b bg-muted/30 px-2 py-2 gap-1.5"
        aria-label="Wizard steps"
      >
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isComplete = step.isComplete;

          return (
            <button
              key={index}
              type="button"
              onClick={() => onStepChange(index)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-primary text-primary-foreground font-medium"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {isComplete && <Check className="size-3" />}
              <span className="truncate max-w-[120px]">{step.name}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
