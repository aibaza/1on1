import { z } from "zod";

export const correctionInputSchema = z.object({
  answerId: z.string().uuid("answerId must be a valid UUID"),
  reason: z
    .string()
    .min(20, "Correction reason must be at least 20 characters")
    .max(500, "Correction reason must be at most 500 characters"),
  newAnswerText: z.string().nullable().optional(),
  newAnswerNumeric: z.number().nullable().optional(),
  newAnswerJson: z.any().optional(),
  skipped: z.boolean().optional(),
});

export type CorrectionInput = z.infer<typeof correctionInputSchema>;

export const batchCorrectionItemSchema = z.object({
  answerId: z.string().uuid("answerId must be a valid UUID"),
  newAnswerText: z.string().nullable().optional(),
  newAnswerNumeric: z.number().nullable().optional(),
  newAnswerJson: z.any().optional(),
  skipped: z.boolean().optional(),
});

export type BatchCorrectionItem = z.infer<typeof batchCorrectionItemSchema>;

export const batchCorrectionInputSchema = z.object({
  corrections: z.array(batchCorrectionItemSchema).min(1).max(50),
  reason: z
    .string()
    .min(20, "Correction reason must be at least 20 characters")
    .max(500, "Correction reason must be at most 500 characters"),
});

export type BatchCorrectionInput = z.infer<typeof batchCorrectionInputSchema>;

export const validateReasonSchema = z.object({
  reason: z
    .string()
    .min(20, "Reason must be at least 20 characters")
    .max(500, "Reason must be at most 500 characters"),
});

export type ValidateReasonInput = z.infer<typeof validateReasonSchema>;
