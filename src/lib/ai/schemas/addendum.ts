import { z } from "zod";

export const managerAddendumSchema = z.object({
  sentimentAnalysis: z
    .string()
    .describe("1-2 sentences on report's engagement and emotional state"),
  patterns: z
    .array(z.string())
    .describe("Recurring themes across sessions, a few words each — only if data supports it"),
  coachingSuggestions: z
    .array(z.string())
    .describe("1 sentence each, max 3 — actionable coaching tips"),
  followUpPriority: z
    .enum(["low", "medium", "high"])
    .describe("How urgently to follow up"),
});

export type AIManagerAddendum = z.infer<typeof managerAddendumSchema>;
