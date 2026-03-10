import { z } from "zod";

export const reasonValidationResultSchema = z.object({
  pass: z
    .boolean()
    .describe(
      "true if the reason is specific, professional, and explains why the answer needs correction; false otherwise"
    ),
  feedback: z
    .string()
    .max(200)
    .describe(
      "One sentence of feedback. If pass=true, acknowledge the reason quality. If pass=false, explain specifically what is missing or problematic."
    ),
});

export type ReasonValidationResult = z.infer<typeof reasonValidationResultSchema>;
