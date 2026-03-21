import { z } from "zod";

/**
 * Unified AI output schema — single LLM call produces all three sections.
 *
 * Replaces the previous 3-call pipeline (summary + addendum + action suggestions).
 */
export const unifiedAISchema = z.object({
  metrics: z.object({
    overallSentiment: z
      .enum(["positive", "neutral", "mixed", "concerning"])
      .describe("Overall session tone based on answers, mood, and engagement"),
    keyTakeaways: z
      .array(z.string())
      .describe("2-5 key takeaways, each max 10 words"),
    objectiveRating: z
      .number()
      .min(1)
      .max(5)
      .describe(
        "Session health rating 1-5 stars. 1 = critical issues, urgent intervention needed; 2 = significant concerns, follow-up required; 3 = average, mixed signals; 4 = good, engaged and progressing; 5 = excellent, high energy and strong rapport. Base it on mood, blockers, growth trajectory, and engagement quality."
      ),
  }),

  publicSummary: z.object({
    cardBlurb: z
      .string()
      .describe("1-2 sentence plain-language summary for card preview, max 25 words"),
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
    suggestions: z
      .array(
        z.object({
          title: z
            .string()
            .describe("Clear, actionable title for the action item (max 200 chars)"),
          description: z
            .string()
            .describe("Brief description with context (max 500 chars)"),
          suggestedAssignee: z
            .enum(["manager", "report"])
            .describe("Who should own this action item"),
          reasoning: z
            .string()
            .describe("Why this action item was suggested"),
        })
      )
      .describe("0-3 suggested action items — only what's clearly warranted"),
  }),

  managerAddendum: z.object({
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
  }),
});

export type UnifiedAIOutput = z.infer<typeof unifiedAISchema>;
