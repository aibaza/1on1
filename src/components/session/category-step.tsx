"use client";

import { useEffect, useRef } from "react";
import { FileText, ListChecks, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { QuestionWidget, type AnswerValue } from "./question-widget";
import { NotesEditor } from "./notes-editor";
import { TalkingPointList, type TalkingPoint } from "./talking-point-list";
import { ActionItemInline, type ActionItemData } from "./action-item-inline";

interface TemplateQuestion {
  id: string;
  questionText: string;
  helpText: string | null;
  sectionId: string;
  answerType: string;
  answerConfig: unknown;
  isRequired: boolean;
  sortOrder: number;
  conditionalOnQuestionId: string | null;
  conditionalOperator: string | null;
  conditionalValue: string | null;
}

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
}

interface CategoryStepProps {
  sessionId: string;
  categoryName: string;
  questions: TemplateQuestion[];
  answers: Map<string, AnswerValue>;
  onAnswerChange: (questionId: string, value: AnswerValue) => void;
  isQuestionVisible: (question: TemplateQuestion) => boolean;
  disabled?: boolean;
  sharedNotesContent: string;
  privateNotesContent: string;
  talkingPoints: TalkingPoint[];
  actionItems: ActionItemData[];
  seriesParticipants: Participant[];
  sessionNumberMap?: Map<string, number>;
  onSavingChange?: (saving: boolean) => void;
}

function SectionLabel({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
      <Icon className="size-3.5" />
      {label}
    </div>
  );
}

export function CategoryStep({
  sessionId,
  categoryName,
  questions,
  answers,
  onAnswerChange,
  isQuestionVisible,
  disabled,
  sharedNotesContent,
  privateNotesContent,
  talkingPoints,
  actionItems,
  seriesParticipants,
  sessionNumberMap,
  onSavingChange,
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
            {categoryName}
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

        {/* Divider between questions and discussion tools */}
        <Separator className="my-6" />

        {/* Notes */}
        <div className="space-y-3">
          <SectionLabel icon={FileText} label="Notes" />
          <NotesEditor
            sessionId={sessionId}
            category={categoryName}
            initialSharedContent={sharedNotesContent}
            initialPrivateContent={privateNotesContent}
            readOnly={disabled}
            onSavingChange={onSavingChange}
          />
        </div>

        {/* Talking Points */}
        <div className="space-y-3">
          <SectionLabel icon={MessageSquare} label="Talking Points" />
          <TalkingPointList
            sessionId={sessionId}
            category={categoryName}
            initialPoints={talkingPoints}
            readOnly={disabled}
            onSavingChange={onSavingChange}
            sessionNumberMap={sessionNumberMap}
          />
        </div>

        {/* Action Items */}
        <div className="space-y-3">
          <SectionLabel icon={ListChecks} label="Action Items" />
          <ActionItemInline
            sessionId={sessionId}
            category={categoryName}
            seriesParticipants={seriesParticipants}
            initialItems={actionItems}
            readOnly={disabled}
            onSavingChange={onSavingChange}
          />
        </div>
      </div>
    </div>
  );
}
