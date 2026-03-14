import type { AnswerValue } from "@/components/session/question-widget";

interface ConditionalQuestion {
  conditionalOnQuestionId: string | null;
  conditionalOperator: string | null;
  conditionalValue: string | null;
}

/**
 * Evaluates whether a conditional question should be visible
 * based on the current answers map.
 */
export function evaluateCondition(
  question: ConditionalQuestion,
  answers: Map<string, AnswerValue>
): boolean {
  if (!question.conditionalOnQuestionId || !question.conditionalOperator) {
    return true;
  }

  const parentAnswer = answers.get(question.conditionalOnQuestionId);
  if (!parentAnswer) return false;

  const parentValue =
    parentAnswer.answerNumeric ??
    (parentAnswer.answerJson
      ? JSON.stringify(parentAnswer.answerJson)
      : null) ??
    parentAnswer.answerText ??
    null;

  if (parentValue == null) return false;

  const condValue = question.conditionalValue ?? "";
  const numParent = Number(parentValue);
  const numCond = Number(condValue);
  const useNumeric = !isNaN(numParent) && !isNaN(numCond);

  switch (question.conditionalOperator) {
    case "eq":
      return String(parentValue) === condValue;
    case "neq":
      return String(parentValue) !== condValue;
    case "lt":
      return useNumeric ? numParent < numCond : String(parentValue) < condValue;
    case "gt":
      return useNumeric ? numParent > numCond : String(parentValue) > condValue;
    case "lte":
      return useNumeric
        ? numParent <= numCond
        : String(parentValue) <= condValue;
    case "gte":
      return useNumeric
        ? numParent >= numCond
        : String(parentValue) >= condValue;
    default:
      return true;
  }
}

/**
 * Convenience wrapper that accepts a plain record instead of a Map.
 */
export function evaluateConditionFromRecord(
  question: ConditionalQuestion,
  answers: Record<string, AnswerValue>
): boolean {
  return evaluateCondition(question, new Map(Object.entries(answers)));
}
