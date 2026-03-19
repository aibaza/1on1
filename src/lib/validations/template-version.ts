import { z } from "zod";

/**
 * Zod schema matching TemplateVersionSnapshot interface.
 * Used to validate snapshot data integrity.
 */
export const templateVersionSnapshotSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  sections: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      description: z.string().nullable(),
      sortOrder: z.number(),
      questions: z.array(
        z.object({
          id: z.string().uuid(),
          questionText: z.string(),
          helpText: z.string().nullable(),
          answerType: z.string(),
          answerConfig: z.record(z.string(), z.unknown()),
          isRequired: z.boolean(),
          sortOrder: z.number(),
          scoreWeight: z.string(),
          conditionalOnQuestionId: z.string().uuid().nullable(),
          conditionalOperator: z.string().nullable(),
          conditionalValue: z.string().nullable(),
        })
      ),
    })
  ),
  labelIds: z.array(z.string().uuid()),
});

/**
 * Schema for version list items displayed in the History tab.
 */
export const versionListItemSchema = z.object({
  versionNumber: z.number(),
  createdAt: z.string(),
  createdByName: z.string(),
  questionCount: z.number(),
});

/**
 * Schema for restore version API payload.
 */
export const restoreVersionSchema = z.object({
  versionNumber: z.number(),
});
