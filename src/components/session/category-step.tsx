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
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        {/* Category header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--editorial-tertiary, var(--color-success))" }}>
              {t("category")}
            </span>
            <div className="h-px w-8" style={{ backgroundColor: "var(--editorial-tertiary-fixed-dim, var(--color-success))" }} />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight font-headline">
            {categoryName}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground font-medium">
            {t("questionCount", { count: visibleQuestions.length })}
          </p>
        </div>

        {/* Questions */}
        {visibleQuestions.map((question, idx) => {
          const answer = answers.get(question.id) ?? null;

          return (
            <div
              key={question.id}
              className="rounded-2xl border border-[var(--editorial-outline-variant,var(--border))]/50 bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all hover:shadow-md"
            >
              <div className="flex items-start gap-3 mb-4">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/8 text-primary text-xs font-bold">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground leading-snug">
                    {question.questionText}
                  </h3>
                  {question.helpText && (
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      {question.helpText}
                    </p>
                  )}
                </div>
                {question.isRequired && (
                  <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest text-destructive bg-destructive/8 px-2 py-0.5 rounded-md">
                    {t("required")}
                  </span>
                )}
              </div>

              <div className="pl-10">
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
        <div className="flex items-center gap-3 py-4">
          <div className="h-px flex-1 bg-[var(--editorial-outline-variant,var(--border))]/30" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("discussion")}</span>
          <div className="h-px flex-1 bg-[var(--editorial-outline-variant,var(--border))]/30" />
        </div>

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
