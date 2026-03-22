"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, FileText, ListChecks, MessageSquare } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
      <Icon className="size-3.5" />
      {label}
      {count !== undefined && count > 0 && (
        <span className="px-1.5 py-0.5 rounded-md bg-[var(--editorial-surface-container,var(--muted))] text-[10px] tabular-nums">
          {count}
        </span>
      )}
    </div>
  );
}

/** Test helpers — exported for unit tests only, not for use in application code. */
export const categoryStepTestHelpers = {
  getSectionLabelClassName: () =>
    "flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest",
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
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Category header */}
        <div className="mb-10">
          <h2 className="text-4xl font-black tracking-tight font-headline">
            {categoryName}
          </h2>
          <p className="mt-1 text-muted-foreground font-medium">
            {t("questionCount", { count: visibleQuestions.length })}
          </p>
        </div>

        {/* Questions — open layout, no card borders */}
        <div className="space-y-12">
        {visibleQuestions.map((question, idx) => {
          const answer = answers.get(question.id) ?? null;

          return (
            <section key={question.id} className="pb-10 border-b border-border/10 last:border-b-0 last:pb-0">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-foreground">
                  {question.questionText}
                </h3>
                {question.isRequired && (
                  <span className="shrink-0 text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-1 rounded">
                    {t("required")}
                  </span>
                )}
              </div>
              {question.helpText && (
                <p className="text-sm text-muted-foreground italic mb-4">
                  {question.helpText}
                </p>
              )}
              <div>
                <QuestionWidget
                  question={question}
                  value={answer}
                  onChange={(value) => onAnswerChange(question.id, value)}
                  disabled={disabled}
                />
              </div>
            </section>
          );
        })}

        </div>

        {/* Discussion Section */}
        <div className="space-y-6 mt-16">
          <h3 className="text-2xl font-black text-foreground font-headline border-b-2 border-border/30 pb-4">
            {t("discussion")}
          </h3>

          {/* Notes */}
          <div className="bg-card rounded-2xl shadow-sm overflow-hidden border border-border/20">
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
          <div className="bg-[var(--editorial-surface-container-low,var(--muted))] rounded-2xl p-6">
            <Collapsible open={talkingPointsOpen} onOpenChange={setTalkingPointsOpen}>
              <CollapsibleTrigger className="flex w-full items-center justify-between hover:opacity-70 transition-opacity">
                <SectionLabel
                  icon={MessageSquare}
                  label={t("talkingPoints")}
                  count={talkingPoints.length}
                />
            <ChevronDown
              className={`size-3.5 text-muted-foreground transition-transform duration-200 ${talkingPointsOpen ? "" : "-rotate-90"}`}
            />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
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
          </div>

          {/* Action Items */}
          <div className="bg-[var(--editorial-surface-container-low,var(--muted))] rounded-2xl p-6">
            <Collapsible open={actionItemsOpen} onOpenChange={setActionItemsOpen}>
              <CollapsibleTrigger className="flex w-full items-center justify-between hover:opacity-70 transition-opacity">
                <SectionLabel
                  icon={ListChecks}
                  label={t("actionItems")}
                  count={actionItems.length}
                />
                <ChevronDown
                  className={`size-3.5 text-muted-foreground transition-transform duration-200 ${actionItemsOpen ? "" : "-rotate-90"}`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
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
      </div>
    </div>
  );
}
