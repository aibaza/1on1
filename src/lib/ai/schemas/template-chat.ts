import { z } from "zod";

/**
 * Zod schema for the AI template editor chat turn response.
 *
 * The AI responds with:
 * - chatMessage: always present — the conversational reply shown to the user
 * - templateJson: only present when AI produces or modifies a template;
 *   null for conversational turns (greetings, clarifications, questions)
 *
 * This schema is used with AI SDK's Output.object() to enforce structured output.
 */
export const templateChatResponseSchema = z.object({
  /** The AI's conversational reply to the user (always present). */
  chatMessage: z.string().min(1),

  /**
   * Full replacement template when AI generates or modifies the template.
   * Null when AI responds conversationally without modifying the template.
   * The app replaces the current template with this value when non-null.
   */
  templateJson: z
    .object({
      schemaVersion: z.literal(1),
      language: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      sections: z
        .array(
          z.object({
            name: z.string(),
            description: z.string().nullable(),
            sortOrder: z.number(),
            questions: z.array(
              z.object({
                questionText: z.string(),
                helpText: z.string().nullable(),
                answerType: z.enum([
                  "text",
                  "rating_1_5",
                  "rating_1_10",
                  "yes_no",
                  "multiple_choice",
                  "mood",
                  "scale_custom",
                ]),
                answerConfig: z.object({}).passthrough(),
                isRequired: z.boolean(),
                sortOrder: z.number(),
                scoreWeight: z.number(),
                conditionalOnQuestionSortOrder: z.number().nullable(),
                conditionalOperator: z
                  .enum(["eq", "neq", "lt", "gt", "lte", "gte"])
                  .nullable(),
                conditionalValue: z.string().nullable(),
              })
            ),
          })
        )
        .min(1),
    })
    .nullable(),
});

export type ChatTurnResponse = z.infer<typeof templateChatResponseSchema>;
