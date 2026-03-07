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
  assessmentScore: z
    .number()
    .int()
    .min(1)
    .max(100)
    .describe(
      "Overall session health score 1–100. Use the full range: 1–20 = critical/urgent intervention; 21–40 = significant issues; 41–60 = average, mixed signals; 61–80 = good, engaged and progressing; 81–100 = excellent, high energy and strong rapport. Base it on mood, blockers, growth, manager feedback quality, and engagement."
    ),
});

export type AIManagerAddendum = z.infer<typeof managerAddendumSchema>;
