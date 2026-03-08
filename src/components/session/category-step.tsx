"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, FileText, ListChecks, MessageSquare } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  count,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <Icon className="size-3.5" />
      {label}
      {count !== undefined && count > 0 && (
        <Badge variant="secondary" className="h-4 px-1.5 text-[10px] tabular-nums">
          {count}
        </Badge>
      )}
    </div>
  );
}

/** Test helpers — exported for unit tests only, not for use in application code. */
export const categoryStepTestHelpers = {
  getSectionLabelClassName: () =>
    "flex items-center gap-1.5 text-xs font-medium text-muted-foreground",
};

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
  const t = useTranslations("sessions.wizard");
  const containerRef = useRef<HTMLDivElement>(null);
  const [talkingPointsOpen, setTalkingPointsOpen] = useState(true);
  const [actionItemsOpen, setActionItemsOpen] = useState(true);

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
            {t("questionCount", { count: visibleQuestions.length })}
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
                    {t("required")}
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
          <SectionLabel icon={FileText} label={t("notes")} />
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
        <Collapsible open={talkingPointsOpen} onOpenChange={setTalkingPointsOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-sm px-0 py-0 hover:opacity-70 transition-opacity">
            <SectionLabel
              icon={MessageSquare}
              label={t("talkingPoints")}
              count={talkingPoints.length}
            />
            <ChevronDown
              className={`size-3.5 text-muted-foreground transition-transform duration-200 ${talkingPointsOpen ? "" : "-rotate-90"}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <TalkingPointList
              sessionId={sessionId}
              category={categoryName}
              initialPoints={talkingPoints}
              readOnly={disabled}
              onSavingChange={onSavingChange}
              sessionNumberMap={sessionNumberMap}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Action Items */}
        <Collapsible open={actionItemsOpen} onOpenChange={setActionItemsOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-sm px-0 py-0 hover:opacity-70 transition-opacity">
            <SectionLabel
              icon={ListChecks}
              label={t("actionItems")}
              count={actionItems.length}
            />
            <ChevronDown
              className={`size-3.5 text-muted-foreground transition-transform duration-200 ${actionItemsOpen ? "" : "-rotate-90"}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <ActionItemInline
              sessionId={sessionId}
              category={categoryName}
              seriesParticipants={seriesParticipants}
              initialItems={actionItems}
              readOnly={disabled}
              onSavingChange={onSavingChange}
            />
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
