"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  operatorsForAnswerType,
  conditionalOperators,
} from "@/lib/validations/template";
import type { QuestionData } from "./template-editor";

const operatorLabels: Record<string, string> = {
  eq: "equals",
  neq: "not equals",
  lt: "less than",
  gt: "greater than",
  lte: "at most",
  gte: "at least",
};

interface ConditionalCondition {
  conditionalOnQuestionId: string | null;
  conditionalOperator: string | null;
  conditionalValue: string | null;
}

interface ConditionalLogicFormProps {
  currentQuestionIndex: number;
  allQuestions: QuestionData[];
  initialCondition: ConditionalCondition | null;
  onConditionChange: (condition: ConditionalCondition | null) => void;
}

export function ConditionalLogicForm({
  currentQuestionIndex,
  allQuestions,
  initialCondition,
  onConditionChange,
}: ConditionalLogicFormProps) {
  const hasInitialCondition = !!(
    initialCondition?.conditionalOnQuestionId &&
    initialCondition?.conditionalOperator &&
    initialCondition?.conditionalValue
  );

  const [enabled, setEnabled] = useState(hasInitialCondition);
  const [targetQuestionId, setTargetQuestionId] = useState<string | null>(
    initialCondition?.conditionalOnQuestionId ?? null
  );
  const [operator, setOperator] = useState<string | null>(
    initialCondition?.conditionalOperator ?? null
  );
  const [value, setValue] = useState<string | null>(
    initialCondition?.conditionalValue ?? null
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  // Only earlier questions (lower index) can be referenced
  const availableQuestions = allQuestions.filter((_, i) => i < currentQuestionIndex);

  // Get the selected target question (match by id or fallback index key)
  const targetQuestion = targetQuestionId
    ? allQuestions.find((q, i) => (q.id ?? `q-${i}`) === targetQuestionId)
    : null;

  // Get valid operators for the target question's answer type
  const validOperators = targetQuestion
    ? (operatorsForAnswerType[targetQuestion.answerType] ?? conditionalOperators)
    : [];

  // Reset operator/value when target changes
  useEffect(() => {
    if (targetQuestion) {
      // If current operator is not valid for new target type, reset
      if (operator && !validOperators.includes(operator)) {
        setOperator(null);
        setValue(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetQuestionId]);

  // Propagate changes to parent
  useEffect(() => {
    if (!enabled) {
      onConditionChange(null);
      setValidationError(null);
      return;
    }

    if (targetQuestionId && operator && (value || value === "0")) {
      onConditionChange({
        conditionalOnQuestionId: targetQuestionId,
        conditionalOperator: operator,
        conditionalValue: value,
      });
      setValidationError(null);
    } else if (enabled && (targetQuestionId || operator || value)) {
      // Partially filled: show validation error
      setValidationError("All three fields are required for conditional logic");
      // Still propagate partial state so form knows it's incomplete
      onConditionChange({
        conditionalOnQuestionId: targetQuestionId,
        conditionalOperator: operator,
        conditionalValue: value,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, targetQuestionId, operator, value]);

  function handleToggle(checked: boolean) {
    setEnabled(checked);
    if (!checked) {
      setTargetQuestionId(null);
      setOperator(null);
      setValue(null);
    }
  }

  // Render value input based on target question's answer type
  function renderValueInput() {
    if (!targetQuestion) return null;

    const answerType = targetQuestion.answerType;

    switch (answerType) {
      case "rating_1_5":
        return (
          <Select
            value={value ?? ""}
            onValueChange={(v) => setValue(v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select value" />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "rating_1_10":
        return (
          <Select
            value={value ?? ""}
            onValueChange={(v) => setValue(v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select value" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "yes_no":
        return (
          <Select
            value={value ?? ""}
            onValueChange={(v) => setValue(v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select value" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        );

      case "multiple_choice": {
        const options =
          (targetQuestion.answerConfig?.options as string[]) ?? [];
        if (options.length === 0) {
          return (
            <Input
              placeholder="Enter value"
              value={value ?? ""}
              onChange={(e) => setValue(e.target.value)}
            />
          );
        }
        return (
          <Select
            value={value ?? ""}
            onValueChange={(v) => setValue(v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      case "mood":
        return (
          <Select
            value={value ?? ""}
            onValueChange={(v) => setValue(v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select mood level" />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "text":
      default:
        return (
          <Input
            placeholder="Enter value"
            value={value ?? ""}
            onChange={(e) => setValue(e.target.value)}
          />
        );
    }
  }

  // Truncate question text for the dropdown
  function truncateText(text: string, maxLength = 40): string {
    return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="conditionalToggle" className="cursor-pointer text-sm font-medium">
            Show this question conditionally
          </Label>
          <p className="text-xs text-muted-foreground">
            Only show when a previous answer matches a condition
          </p>
        </div>
        <Switch
          id="conditionalToggle"
          checked={enabled}
          onCheckedChange={handleToggle}
        />
      </div>

      {/* Condition fields */}
      {enabled && (
        <div className="space-y-3 pt-1">
          {availableQuestions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No earlier questions available. Conditional logic can only
              reference questions that appear before this one.
            </p>
          ) : (
            <>
              {/* Target question */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  When question...
                </Label>
                <Select
                  value={targetQuestionId ?? ""}
                  onValueChange={(v) => {
                    setTargetQuestionId(v);
                    // Reset operator and value when target changes
                    setOperator(null);
                    setValue(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a question" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableQuestions.map((q, idx) => {
                      const qIndex = allQuestions.indexOf(q);
                      return (
                        <SelectItem
                          key={q.id ?? `q-${idx}`}
                          value={q.id ?? `q-${idx}`}
                        >
                          Q{qIndex + 1}: {truncateText(q.questionText)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Operator */}
              {targetQuestionId && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    ...is
                  </Label>
                  <Select
                    value={operator ?? ""}
                    onValueChange={(v) => setOperator(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select operator" />
                    </SelectTrigger>
                    <SelectContent>
                      {validOperators.map((op) => (
                        <SelectItem key={op} value={op}>
                          {operatorLabels[op] ?? op}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Value */}
              {targetQuestionId && operator && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    ...value
                  </Label>
                  {renderValueInput()}
                </div>
              )}
            </>
          )}

          {/* Validation error */}
          {validationError && (
            <p className="text-xs text-destructive">{validationError}</p>
          )}
        </div>
      )}
    </div>
  );
}
