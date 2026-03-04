"use client";

import { TextWidget } from "./widgets/text-widget";
import { Rating15Widget } from "./widgets/rating-1-5-widget";
import { Rating110Widget } from "./widgets/rating-1-10-widget";
import { YesNoWidget } from "./widgets/yes-no-widget";
import { MultipleChoiceWidget } from "./widgets/multiple-choice-widget";
import { MoodWidget } from "./widgets/mood-widget";

export interface AnswerValue {
  answerText?: string;
  answerNumeric?: number;
  answerJson?: unknown;
}

interface QuestionWidgetProps {
  question: {
    id: string;
    answerType: string;
    answerConfig: unknown;
  };
  value: AnswerValue | null;
  onChange: (value: AnswerValue) => void;
  disabled?: boolean;
}

export function QuestionWidget({
  question,
  value,
  onChange,
  disabled,
}: QuestionWidgetProps) {
  const config = question.answerConfig as Record<string, unknown> | null;

  switch (question.answerType) {
    case "text":
      return (
        <TextWidget
          value={(value?.answerText as string) ?? null}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case "rating_1_5":
      return (
        <Rating15Widget
          value={(value?.answerNumeric as number) ?? null}
          onChange={onChange}
          disabled={disabled}
          answerConfig={config as { labels?: string[] } | undefined}
        />
      );

    case "rating_1_10":
      return (
        <Rating110Widget
          value={(value?.answerNumeric as number) ?? null}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case "yes_no":
      return (
        <YesNoWidget
          value={(value?.answerNumeric as number) ?? null}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case "multiple_choice":
      return (
        <MultipleChoiceWidget
          value={(value?.answerJson as { selected: string }) ?? null}
          onChange={onChange}
          disabled={disabled}
          answerConfig={config as { options?: string[] } | undefined}
        />
      );

    case "mood":
      return (
        <MoodWidget
          value={(value?.answerNumeric as number) ?? null}
          onChange={onChange}
          disabled={disabled}
          answerConfig={config as { labels?: string[] } | undefined}
        />
      );

    default:
      return (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Unsupported question type: {question.answerType}
        </div>
      );
  }
}
