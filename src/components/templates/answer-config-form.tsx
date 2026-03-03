"use client";

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface AnswerConfigFormProps {
  answerType: string;
  answerConfig: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function AnswerConfigForm({
  answerType,
  answerConfig,
  onChange,
}: AnswerConfigFormProps) {
  switch (answerType) {
    case "text":
    case "yes_no":
      // No configuration needed
      return null;

    case "rating_1_5":
      return (
        <RatingLabels
          answerConfig={answerConfig}
          onChange={onChange}
          low={1}
          high={5}
        />
      );

    case "rating_1_10":
      return (
        <RatingLabels
          answerConfig={answerConfig}
          onChange={onChange}
          low={1}
          high={10}
        />
      );

    case "multiple_choice":
      return (
        <MultipleChoiceConfig
          answerConfig={answerConfig}
          onChange={onChange}
        />
      );

    case "mood":
      return <MoodConfig answerConfig={answerConfig} onChange={onChange} />;

    default:
      return null;
  }
}

// Rating labels component
function RatingLabels({
  answerConfig,
  onChange,
  low,
  high,
}: {
  answerConfig: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  low: number;
  high: number;
}) {
  const labels = (answerConfig.labels as Record<string, string>) ?? {};

  function updateLabel(key: string, value: string) {
    const newLabels = { ...labels, [key]: value };
    if (!value) delete newLabels[key];
    onChange({ ...answerConfig, labels: newLabels });
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <Label className="text-sm font-medium">
        Rating Labels{" "}
        <span className="text-muted-foreground font-normal">(optional)</span>
      </Label>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`label-${low}`} className="text-xs text-muted-foreground">
            Label for {low} (lowest)
          </Label>
          <Input
            id={`label-${low}`}
            placeholder="e.g. Poor"
            value={labels[String(low)] ?? ""}
            onChange={(e) => updateLabel(String(low), e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`label-${high}`} className="text-xs text-muted-foreground">
            Label for {high} (highest)
          </Label>
          <Input
            id={`label-${high}`}
            placeholder="e.g. Excellent"
            value={labels[String(high)] ?? ""}
            onChange={(e) => updateLabel(String(high), e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

// Multiple choice configuration
function MultipleChoiceConfig({
  answerConfig,
  onChange,
}: {
  answerConfig: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const rawOptions = answerConfig.options;
  const [options, setOptions] = useState<string[]>(
    Array.isArray(rawOptions) && rawOptions.every((o) => typeof o === "string")
      ? (rawOptions as string[])
      : ["", ""]
  );
  const allowMultiple = (answerConfig.allow_multiple as boolean) ?? false;

  // Sync options to parent config
  useEffect(() => {
    onChange({
      ...answerConfig,
      options,
      allow_multiple: allowMultiple,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, allowMultiple]);

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function addOption() {
    setOptions((prev) => [...prev, ""]);
  }

  function removeOption(index: number) {
    if (options.length <= 2) return; // Minimum 2 options
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <Label className="text-sm font-medium">Multiple Choice Options</Label>
      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              placeholder={`Option ${index + 1}`}
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => removeOption(index)}
              disabled={options.length <= 2}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Remove option</span>
            </Button>
          </div>
        ))}
      </div>
      {options.length < 2 && (
        <p className="text-xs text-destructive">
          At least 2 options are required
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addOption}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Option
      </Button>

      <div className="flex items-center gap-2 pt-1">
        <Checkbox
          id="allowMultiple"
          checked={allowMultiple}
          onCheckedChange={(checked) => {
            onChange({
              ...answerConfig,
              options,
              allow_multiple: !!checked,
            });
          }}
        />
        <Label htmlFor="allowMultiple" className="text-sm cursor-pointer">
          Allow multiple selections
        </Label>
      </div>
    </div>
  );
}

// Mood configuration
function MoodConfig({
  answerConfig,
  onChange,
}: {
  answerConfig: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const labels = (answerConfig.labels as Record<string, string>) ?? {};
  const defaultLabels = [
    "Very Unhappy",
    "Unhappy",
    "Neutral",
    "Happy",
    "Very Happy",
  ];

  function updateLabel(index: number, value: string) {
    const newLabels = { ...labels, [String(index + 1)]: value };
    if (!value) delete newLabels[String(index + 1)];
    onChange({ ...answerConfig, labels: newLabels });
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <Label className="text-sm font-medium">
        Mood Labels{" "}
        <span className="text-muted-foreground font-normal">(optional)</span>
      </Label>
      <div className="space-y-2">
        {defaultLabels.map((defaultLabel, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="w-6 text-center text-lg">
              {["😢", "😟", "😐", "😊", "😄"][index]}
            </span>
            <Input
              placeholder={defaultLabel}
              value={labels[String(index + 1)] ?? ""}
              onChange={(e) => updateLabel(index, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
