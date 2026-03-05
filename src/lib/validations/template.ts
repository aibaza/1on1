import { z } from "zod";

// Answer types (mirrors DB enum)
export const answerTypes = [
  "text",
  "rating_1_5",
  "rating_1_10",
  "yes_no",
  "multiple_choice",
  "mood",
] as const;

// Conditional operators (mirrors DB enum)
export const conditionalOperators = [
  "eq",
  "neq",
  "lt",
  "gt",
  "lte",
  "gte",
] as const;

// --- Section schemas ---

export const sectionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Section name is required").max(255),
  description: z.string().max(2000).nullable().optional(),
  sortOrder: z.number().int().min(0),
});

// --- Label schemas ---

export const labelSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Label name is required").max(100),
  color: z.string().max(7).nullable().optional(),
});

// --- Question schemas ---

// Create/update question (no category — belongs to a section)
export const questionSchema = z.object({
  questionText: z.string().min(1, "Question text is required").max(1000),
  helpText: z.string().max(500).nullable().optional(),
  answerType: z.enum(answerTypes),
  answerConfig: z.record(z.string(), z.unknown()).default({}),
  isRequired: z.boolean().default(false),
  sortOrder: z.number().int().min(0),
  conditionalOnQuestionId: z.string().nullable().optional(),
  conditionalOperator: z.enum(conditionalOperators).nullable().optional(),
  conditionalValue: z.string().max(255).nullable().optional(),
  scoreWeight: z.number().min(0).max(10).default(1).optional(),
});

// Question with optional ID for batch saves (existing questions have IDs, new ones don't)
export const saveQuestionSchema = questionSchema.extend({
  id: z.string().uuid().optional(),
});

// Section with its questions for batch save
export const saveSectionSchema = sectionSchema.extend({
  questions: z.array(saveQuestionSchema),
});

// Create template (quick create — no sections yet)
export const createTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required").max(255),
  description: z.string().max(2000).optional(),
  labelIds: z.array(z.string().uuid()).optional(),
});

// Update template metadata
export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  labelIds: z.array(z.string().uuid()).optional(),
});

// Batch save: template metadata + sections with questions
export const saveTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).nullable().optional(),
  labelIds: z.array(z.string().uuid()).optional(),
  sections: z
    .array(saveSectionSchema)
    .min(1, "Template must have at least 1 section"),
});

// Reorder questions (array of question IDs in desired order)
export const reorderQuestionsSchema = z.object({
  questionIds: z.array(z.string().uuid()).min(1),
});

/**
 * Operators valid for each answer type.
 * text: only eq/neq (no numeric comparisons on text)
 * rating_1_5, rating_1_10, mood: all 6 operators
 * yes_no: only eq/neq
 * multiple_choice: only eq/neq
 */
export const operatorsForAnswerType: Record<string, readonly string[]> = {
  text: ["eq", "neq"],
  rating_1_5: ["eq", "neq", "lt", "gt", "lte", "gte"],
  rating_1_10: ["eq", "neq", "lt", "gt", "lte", "gte"],
  yes_no: ["eq", "neq"],
  multiple_choice: ["eq", "neq"],
  mood: ["eq", "neq", "lt", "gt", "lte", "gte"],
};

/**
 * Validates answer_config based on answerType.
 * Returns null if valid, or error string describing the problem.
 */
export function validateAnswerConfig(
  answerType: string,
  answerConfig: Record<string, unknown>
): string | null {
  if (answerType === "multiple_choice") {
    const options = answerConfig.options;
    if (!Array.isArray(options) || options.length < 2) {
      return "Multiple choice questions require at least 2 options";
    }
    for (const opt of options) {
      if (typeof opt !== "string" || opt.trim().length === 0) {
        return "All multiple choice options must be non-empty strings";
      }
    }
  }
  return null;
}

/**
 * Validates conditional logic for a set of questions.
 * Returns null if valid, or error string describing the problem.
 *
 * Caller should flatten all sections into global order before calling.
 *
 * Checks:
 * - conditionalOnQuestionId references a question in the same set
 * - Referenced question has a lower sortOrder (earlier in the list)
 * - Operator is valid for the referenced question's answer type
 * - Both operator and value must be present when conditionalOnQuestionId is set
 */
export function validateConditionalLogic(
  questions: Array<{
    id?: string;
    questionText: string;
    sortOrder: number;
    answerType: string;
    conditionalOnQuestionId?: string | null;
    conditionalOperator?: string | null;
    conditionalValue?: string | null;
  }>
): string | null {
  // Build a map of question ID -> question data for lookup
  const questionMap = new Map<string, (typeof questions)[number]>();
  for (const q of questions) {
    if (q.id) {
      questionMap.set(q.id, q);
    }
  }

  // Also build an index-based map for questions without IDs
  const indexMap = new Map<number, (typeof questions)[number]>();
  for (let i = 0; i < questions.length; i++) {
    indexMap.set(i, questions[i]);
  }

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    // Skip questions without conditional logic
    if (!q.conditionalOnQuestionId) {
      // Ensure operator and value are also null/empty if no target
      if (q.conditionalOperator || q.conditionalValue) {
        return `Question "${q.questionText}": conditional operator and value must be empty when no target question is set`;
      }
      continue;
    }

    // Both operator and value must be present
    if (!q.conditionalOperator) {
      return `Question "${q.questionText}": conditional operator is required when a target question is set`;
    }
    if (!q.conditionalValue && q.conditionalValue !== "0") {
      return `Question "${q.questionText}": conditional value is required when a target question is set`;
    }

    // Target must exist in the same set (by ID or by q-{index} temporary reference)
    let target = questionMap.get(q.conditionalOnQuestionId);
    if (!target) {
      const indexMatch = q.conditionalOnQuestionId.match(/^q-(\d+)$/);
      if (indexMatch) {
        target = indexMap.get(parseInt(indexMatch[1], 10));
      }
    }
    if (!target) {
      return `Question "${q.questionText}": references non-existent question ${q.conditionalOnQuestionId}`;
    }

    // Target must have a lower sortOrder (earlier in the list)
    if (target.sortOrder >= q.sortOrder) {
      return `Question "${q.questionText}": can only reference earlier questions (target Q"${target.questionText}" has sortOrder ${target.sortOrder}, this question has ${q.sortOrder})`;
    }

    // Operator must be valid for target's answer type
    const validOperators = operatorsForAnswerType[target.answerType];
    if (validOperators && !validOperators.includes(q.conditionalOperator)) {
      return `Question "${q.questionText}": operator "${q.conditionalOperator}" is not valid for answer type "${target.answerType}"`;
    }
  }

  return null;
}
