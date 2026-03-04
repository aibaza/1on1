"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCallback, useEffect } from "react";

interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  stepNames: string[];
  onStepChange: (step: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function WizardNavigation({
  currentStep,
  totalSteps,
  stepNames,
  onStepChange,
  onPrev,
  onNext,
}: WizardNavigationProps) {
  const isFirst = currentStep === 0;
  const isSummaryStep = currentStep === totalSteps - 1;
  const isLastCategoryStep = currentStep === totalSteps - 2;

  // Keyboard shortcuts: Left/Right arrow keys for navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't capture arrows when focus is on an input element
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      if (isInput) return;

      if (e.key === "ArrowLeft" && !isFirst) {
        e.preventDefault();
        onPrev();
      } else if (e.key === "ArrowRight" && !isSummaryStep) {
        e.preventDefault();
        onNext();
      }
    },
    [isFirst, isSummaryStep, onPrev, onNext]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex items-center justify-between border-t bg-background px-4 py-3">
      {/* Prev button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onPrev}
        disabled={isFirst}
        className="gap-1"
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>

      {/* Category tabs */}
      <div className="mx-4 flex flex-1 items-center justify-center gap-1 overflow-x-auto">
        {stepNames.map((name, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onStepChange(index)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              index === currentStep
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Next button -- hidden on summary step (Complete Session button handles it) */}
      {isSummaryStep ? (
        <div className="w-[100px]" />
      ) : (
        <Button
          variant={isLastCategoryStep ? "default" : "outline"}
          size="sm"
          onClick={onNext}
          className="gap-1"
        >
          {isLastCategoryStep ? "Review" : "Next"}
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
