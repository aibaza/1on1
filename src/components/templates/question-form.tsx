"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  questionSchema,
  answerTypes,
} from "@/lib/validations/template";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AnswerConfigForm } from "./answer-config-form";
import { ConditionalLogicForm } from "./conditional-logic-form";
import type { QuestionData } from "./template-editor";

type QuestionFormValues = z.infer<typeof questionSchema>;

const answerTypeLabels: Record<string, string> = {
  text: "Text",
  rating_1_5: "Rating (1-5)",
  rating_1_10: "Rating (1-10)",
  yes_no: "Yes/No",
  multiple_choice: "Multiple Choice",
  mood: "Mood",
};

interface QuestionFormProps {
  question: QuestionData | null;
  questionIndex?: number;
  allQuestions?: QuestionData[];
  onSave: (question: QuestionData) => void;
  onCancel: () => void;
}

export function QuestionForm({
  question,
  questionIndex,
  allQuestions,
  onSave,
  onCancel,
}: QuestionFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<QuestionFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- zodResolver type mismatch with RHF v7
    resolver: zodResolver(questionSchema) as any,
    defaultValues: {
      questionText: question?.questionText ?? "",
      helpText: question?.helpText ?? "",
      answerType: question?.answerType ?? "text",
      answerConfig: question?.answerConfig ?? {},
      isRequired: question?.isRequired ?? false,
      sortOrder: question?.sortOrder ?? 0,
      conditionalOnQuestionId: question?.conditionalOnQuestionId ?? undefined,
      conditionalOperator: question?.conditionalOperator as QuestionFormValues["conditionalOperator"] ?? undefined,
      conditionalValue: question?.conditionalValue ?? undefined,
    },
  });

  const selectedAnswerType = watch("answerType");
  const isRequired = watch("isRequired");
  const answerConfig = watch("answerConfig");

  function onSubmit(data: QuestionFormValues) {
    onSave({
      id: question?.id,
      questionText: data.questionText,
      helpText: data.helpText || null,
      answerType: data.answerType,
      answerConfig: data.answerConfig,
      isRequired: data.isRequired,
      sortOrder: data.sortOrder,
      conditionalOnQuestionId: data.conditionalOnQuestionId || null,
      conditionalOperator: data.conditionalOperator || null,
      conditionalValue: data.conditionalValue || null,
    });
  }

  // Handle conditional logic changes from the sub-form
  function handleConditionChange(
    condition: {
      conditionalOnQuestionId: string | null;
      conditionalOperator: string | null;
      conditionalValue: string | null;
    } | null
  ) {
    if (condition) {
      setValue("conditionalOnQuestionId", condition.conditionalOnQuestionId);
      setValue(
        "conditionalOperator",
        condition.conditionalOperator as QuestionFormValues["conditionalOperator"] ?? undefined
      );
      setValue("conditionalValue", condition.conditionalValue);
    } else {
      setValue("conditionalOnQuestionId", null);
      setValue("conditionalOperator", null);
      setValue("conditionalValue", null);
    }
  }

  const showConditionalLogic =
    allQuestions !== undefined && questionIndex !== undefined;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Question text */}
      <div className="space-y-2">
        <Label htmlFor="questionText">Question Text</Label>
        <Textarea
          id="questionText"
          placeholder="What would you like to ask?"
          rows={2}
          {...register("questionText")}
        />
        {errors.questionText && (
          <p className="text-xs text-destructive">
            {errors.questionText.message}
          </p>
        )}
      </div>

      {/* Help text */}
      <div className="space-y-2">
        <Label htmlFor="helpText">
          Help Text{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="helpText"
          placeholder="Additional context or instructions for this question"
          rows={2}
          {...register("helpText")}
        />
        {errors.helpText && (
          <p className="text-xs text-destructive">{errors.helpText.message}</p>
        )}
      </div>

      {/* Answer type */}
      <div className="space-y-2">
        <Label>Answer Type</Label>
        <Select
          value={selectedAnswerType}
          onValueChange={(value) => {
            setValue(
              "answerType",
              value as QuestionFormValues["answerType"]
            );
            // Reset answer config when type changes
            setValue("answerConfig", {});
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select answer type" />
          </SelectTrigger>
          <SelectContent>
            {answerTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {answerTypeLabels[type] ?? type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.answerType && (
          <p className="text-xs text-destructive">
            {errors.answerType.message}
          </p>
        )}
      </div>

      {/* Answer config (per-type configuration) */}
      <AnswerConfigForm
        answerType={selectedAnswerType}
        answerConfig={answerConfig}
        onChange={(config) => setValue("answerConfig", config)}
      />

      {/* Required toggle */}
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <Label htmlFor="isRequired" className="cursor-pointer">
            Required
          </Label>
          <p className="text-xs text-muted-foreground">
            Participants must answer this question
          </p>
        </div>
        <Switch
          id="isRequired"
          checked={isRequired}
          onCheckedChange={(checked) => setValue("isRequired", checked)}
        />
      </div>

      {/* Conditional logic */}
      {showConditionalLogic && (
        <ConditionalLogicForm
          currentQuestionIndex={questionIndex}
          allQuestions={allQuestions}
          initialCondition={
            question?.conditionalOnQuestionId
              ? {
                  conditionalOnQuestionId:
                    question.conditionalOnQuestionId,
                  conditionalOperator:
                    question.conditionalOperator ?? null,
                  conditionalValue:
                    question.conditionalValue ?? null,
                }
              : null
          }
          onConditionChange={handleConditionChange}
        />
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {question ? "Update Question" : "Add Question"}
        </Button>
      </div>
    </form>
  );
}
