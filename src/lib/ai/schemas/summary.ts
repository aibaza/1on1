import { z } from "zod";

export const summarySchema = z.object({
  keyTakeaways: z
    .array(z.string())
    .describe("2-5 key takeaways, each max 10 words"),
  discussionHighlights: z
    .array(
      z.object({
        category: z.string().describe("Section name"),
        summary: z.string().describe("1-2 sentences max"),
      })
    )
    .describe("Only sections with substantive answers — skip score-only sections"),
  followUpItems: z
    .array(z.string())
    .describe("Only items explicitly mentioned or clearly needed"),
  overallSentiment: z
    .enum(["positive", "neutral", "mixed", "concerning"])
    .describe("Overall tone"),
});

export type AISummary = z.infer<typeof summarySchema>;
