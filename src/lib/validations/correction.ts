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

export const validateReasonSchema = z.object({
  reason: z
    .string()
    .min(20, "Reason must be at least 20 characters")
    .max(500, "Reason must be at most 500 characters"),
});

export type ValidateReasonInput = z.infer<typeof validateReasonSchema>;
