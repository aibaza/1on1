"use client";

import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { QuestionWidget, type AnswerValue } from "./question-widget";

interface TemplateQuestion {
  id: string;
  questionText: string;
  helpText: string | null;
  category: string;
  answerType: string;
  answerConfig: unknown;
  isRequired: boolean;
  sortOrder: number;
  conditionalOnQuestionId: string | null;
  conditionalOperator: string | null;
  conditionalValue: string | null;
}

interface CategoryStepProps {
  categoryName: string;
  questions: TemplateQuestion[];
  answers: Map<string, AnswerValue>;
  onAnswerChange: (questionId: string, value: AnswerValue) => void;
  isQuestionVisible: (question: TemplateQuestion) => boolean;
  disabled?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  check_in: "Check-in",
  wellbeing: "Wellbeing",
  engagement: "Engagement",
  performance: "Performance",
  career: "Career",
  feedback: "Feedback",
  recognition: "Recognition",
  goals: "Goals",
  custom: "Custom",
};

export function CategoryStep({
  categoryName,
  questions,
  answers,
  onAnswerChange,
  isQuestionVisible,
  disabled,
}: CategoryStepProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Smooth scroll to top when step transitions
  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [categoryName]);

  const visibleQuestions = questions.filter(isQuestionVisible);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        {/* Category header */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            {CATEGORY_LABELS[categoryName] ?? categoryName}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {visibleQuestions.length} question{visibleQuestions.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Questions */}
        {visibleQuestions.map((question) => {
          const answer = answers.get(question.id) ?? null;

          return (
            <div
              key={question.id}
              className="space-y-3 rounded-lg border bg-card p-6"
            >
              <div className="flex items-start gap-2">
                <h3 className="flex-1 font-medium leading-snug">
                  {question.questionText}
                </h3>
                {question.isRequired && (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    Required
                  </Badge>
                )}
              </div>

              {question.helpText && (
                <p className="text-sm text-muted-foreground">
                  {question.helpText}
                </p>
              )}

              <div className="pt-1">
                <QuestionWidget
                  question={question}
                  value={answer}
                  onChange={(value) => onAnswerChange(question.id, value)}
                  disabled={disabled}
                />
              </div>
            </div>
          );
        })}

        {/* Placeholder slots for notes and action items (Plan 04) */}
        <div className="space-y-4 pt-4">
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Notes and action items will appear here
          </div>
        </div>
      </div>
    </div>
  );
}
