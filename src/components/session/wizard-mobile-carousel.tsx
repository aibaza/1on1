"use client";

import { useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepInfo {
  name: string;
  answered: number;
  total: number;
  isComplete: boolean;
}

interface WizardMobileCarouselProps {
  steps: StepInfo[];
  currentStep: number;
  onStepChange: (step: number) => void;
  children: React.ReactNode;
}

export function WizardMobileCarousel({
  steps,
  currentStep,
  onStepChange,
  children,
}: WizardMobileCarouselProps) {
  const t = useTranslations("sessions.wizard");
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;

      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;

      if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        if (deltaX < 0 && currentStep < steps.length - 1) {
          onStepChange(currentStep + 1);
        } else if (deltaX > 0 && currentStep > 0) {
          onStepChange(currentStep - 1);
        }
      }

      touchStartX.current = null;
      touchStartY.current = null;
    },
    [currentStep, steps.length, onStepChange]
  );

  const currentStepInfo = steps[currentStep];

  return (
    <div
      className="flex md:hidden flex-col flex-1 overflow-hidden h-full"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Content area — full width, takes all remaining space */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {children}
      </div>

      {/* Bottom navigation bar — compact, fixed height */}
      <div className="shrink-0 border-t border-[var(--editorial-outline-variant,var(--border))]/30 bg-[var(--background)]/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        {/* Step indicator dots + prev/next */}
        <div className="flex items-center gap-1 px-3 py-2">
          {/* Prev button */}
          <button
            type="button"
            onClick={() => currentStep > 0 && onStepChange(currentStep - 1)}
            disabled={currentStep === 0}
            className="shrink-0 p-1.5 rounded-md text-muted-foreground disabled:opacity-30 hover:bg-muted transition-colors"
            aria-label={t("previousStep")}
          >
            <ChevronLeft className="size-4" />
          </button>

          {/* Step pills — scrollable row */}
          <div className="flex-1 flex items-center justify-center gap-1 overflow-x-auto scrollbar-none">
            {steps.map((step, index) => {
              const isActive = index === currentStep;
              const isComplete = step.isComplete;

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => onStepChange(index)}
                  className={cn(
                    "shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] transition-all",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                      ? "bg-primary text-white font-bold"
                      : isComplete
                        ? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
                        : "text-muted-foreground hover:bg-[var(--editorial-surface-container,var(--muted))]"
                  )}
                  aria-label={step.name}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isComplete && <Check className="size-2.5 shrink-0" />}
                  <span className="truncate max-w-[72px]">
                    {step.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Next button */}
          <button
            type="button"
            onClick={() => currentStep < steps.length - 1 && onStepChange(currentStep + 1)}
            disabled={currentStep === steps.length - 1}
            className="shrink-0 p-1.5 rounded-md text-muted-foreground disabled:opacity-30 hover:bg-muted transition-colors"
            aria-label={t("nextStep")}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-[var(--editorial-surface-container,var(--muted))] mx-3 mb-1 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{ background: "linear-gradient(90deg, var(--primary), var(--editorial-primary-container, var(--primary)))", width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
