"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("templates");
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

  const operatorKey: Record<string, string> = {
    eq: "conditionalLogic.operatorEq",
    neq: "conditionalLogic.operatorNeq",
    lt: "conditionalLogic.operatorLt",
    gt: "conditionalLogic.operatorGt",
    lte: "conditionalLogic.operatorLte",
    gte: "conditionalLogic.operatorGte",
  };

  const availableQuestions = allQuestions.filter((_, i) => i < currentQuestionIndex);

  const targetQuestion = targetQuestionId
    ? allQuestions.find((q, i) => (q.id ?? `q-${i}`) === targetQuestionId)
    : null;

  const validOperators = targetQuestion
    ? (operatorsForAnswerType[targetQuestion.answerType] ?? conditionalOperators)
    : [];

  useEffect(() => {
    if (targetQuestion) {
      if (operator && !validOperators.includes(operator)) {
        setOperator(null);
        setValue(null);
      }
    }
    // Safe: only reacts to targetQuestionId change, resets dependent state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetQuestionId]);

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
      setValidationError(t("conditionalLogic.allFieldsRequired"));
      onConditionChange({
        conditionalOnQuestionId: targetQuestionId,
        conditionalOperator: operator,
        conditionalValue: value,
      });
    }
    // Safe: onConditionChange is a parent callback, including it would cause infinite loops
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

  function renderValueInput() {
    if (!targetQuestion) return null;

    const answerType = targetQuestion.answerType;

    switch (answerType) {
      case "rating_1_5":
        return (
          <Select value={value ?? ""} onValueChange={(v) => setValue(v)}>
            <SelectTrigger>
              <SelectValue placeholder={t("conditionalLogic.selectValue")} />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "rating_1_10":
        return (
          <Select value={value ?? ""} onValueChange={(v) => setValue(v)}>
            <SelectTrigger>
              <SelectValue placeholder={t("conditionalLogic.selectValue")} />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "yes_no":
        return (
          <Select value={value ?? ""} onValueChange={(v) => setValue(v)}>
            <SelectTrigger>
              <SelectValue placeholder={t("conditionalLogic.selectValue")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">{t("conditionalLogic.yes")}</SelectItem>
              <SelectItem value="false">{t("conditionalLogic.no")}</SelectItem>
            </SelectContent>
          </Select>
        );

      case "multiple_choice": {
        const options = (targetQuestion.answerConfig?.options as string[]) ?? [];
        if (options.length === 0) {
          return (
            <Input
              placeholder={t("conditionalLogic.enterValue")}
              value={value ?? ""}
              onChange={(e) => setValue(e.target.value)}
            />
          );
        }
        return (
          <Select value={value ?? ""} onValueChange={(v) => setValue(v)}>
            <SelectTrigger>
              <SelectValue placeholder={t("conditionalLogic.selectOption")} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      case "mood":
        return (
          <Select value={value ?? ""} onValueChange={(v) => setValue(v)}>
            <SelectTrigger>
              <SelectValue placeholder={t("conditionalLogic.selectMood")} />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "text":
      default:
        return (
          <Input
            placeholder={t("conditionalLogic.enterValue")}
            value={value ?? ""}
            onChange={(e) => setValue(e.target.value)}
          />
        );
    }
  }

  function truncateText(text: string, maxLength = 40): string {
    return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="conditionalToggle" className="cursor-pointer text-sm font-medium">
            {t("conditionalLogic.title")}
          </Label>
          <p className="text-xs text-muted-foreground">
            {t("conditionalLogic.description")}
          </p>
        </div>
        <Switch
          id="conditionalToggle"
          checked={enabled}
          onCheckedChange={handleToggle}
        />
      </div>

      {enabled && (
        <div className="space-y-3 pt-1">
          {availableQuestions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("conditionalLogic.noEarlierQuestions")}
            </p>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("conditionalLogic.whenQuestion")}
                </Label>
                <Select
                  value={targetQuestionId ?? ""}
                  onValueChange={(v) => {
                    setTargetQuestionId(v);
                    setOperator(null);
                    setValue(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("conditionalLogic.selectQuestion")} />
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

              {targetQuestionId && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {t("conditionalLogic.is")}
                  </Label>
                  <Select
                    value={operator ?? ""}
                    onValueChange={(v) => setOperator(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("conditionalLogic.selectOperator")} />
                    </SelectTrigger>
                    <SelectContent>
                      {validOperators.map((op) => (
                        <SelectItem key={op} value={op}>
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {operatorKey[op] ? t(operatorKey[op] as any) : op}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {targetQuestionId && operator && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {t("conditionalLogic.value")}
                  </Label>
                  {renderValueInput()}
                </div>
              )}
            </>
          )}

          {validationError && (
            <p className="text-xs text-destructive">{validationError}</p>
          )}
        </div>
      )}
    </div>
  );
}
