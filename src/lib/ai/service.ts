import * as Sentry from "@sentry/nextjs";
import { generateText, generateObject, Output } from "ai";
import { reasonValidationResultSchema, type ReasonValidationResult } from "./schemas/correction";
import type { ModelMessage } from "ai";
import { models } from "./models";
import { unifiedAISchema, type UnifiedAIOutput } from "./schemas/unified";
import {
  templateChatResponseSchema,
  type ChatTurnResponse,
} from "./schemas/template-chat";
import type { SessionContext } from "./context";
import type { TemplateExport } from "../templates/export-schema";
import {
  buildUnifiedSystemPrompt,
  buildUnifiedUserPrompt,
} from "./prompts/unified";
import { buildTemplateEditorSystemPrompt } from "./prompts/template-editor";

/** Map language codes to full language names */
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  ro: "Romanian",
  de: "German",
  fr: "French",
  es: "Spanish",
  pt: "Portuguese",
};

/**
 * Append a language instruction to the system prompt when the org
 * has a non-English preferred language.
 *
 * Exported so tests and other callers (e.g. template editor) can use it directly.
 */
export function withLanguageInstruction(
  systemPrompt: string,
  language?: string
): string {
  if (!language || language === "en") return systemPrompt;
  const languageName = LANGUAGE_NAMES[language] || language;
  return `${systemPrompt}\n\nORGANIZATION LANGUAGE — MANDATORY: All output text must be in ${languageName}. This applies to every field: summaries, takeaways, action items, nudges, section names, question text — everything. The session participants may have written answers in any language; ignore that and always respond in ${languageName}.`;
}

/**
 * Generate unified session analysis in a single LLM call.
 *
 * Replaces the previous 3-call pipeline (generateSummary + generateManagerAddendum + generateActionSuggestions).
 * Produces metrics, public summary, and manager addendum in one structured output.
 */
export async function generateUnifiedOutput(
  context: SessionContext,
  language?: string
): Promise<UnifiedAIOutput> {
  try {
    const { output } = await generateText({
      model: models.unified,
      output: Output.object({ schema: unifiedAISchema }),
      system: buildUnifiedSystemPrompt(language),
      prompt: buildUnifiedUserPrompt(context),
    });

    if (!output) {
      throw new Error("AI SDK returned null output for unified generation");
    }

    return output;
  } catch (error) {
    console.error("[AI Service] Unified generation failed:", error);
    Sentry.captureException(error, {
      tags: { ai_operation: "generateUnifiedOutput", model: "unified" },
      extra: {
        sessionId: context.sessionId,
        tenantId: context.tenantId,
        sessionNumber: context.sessionNumber,
        answersCount: context.answers.length,
        previousSessionsCount: context.previousSessions.length,
        language,
        anthropicKeyPresent: !!process.env.ANTHROPIC_API_KEY,
      },
    });
    throw error;
  }
}

/**
 * Generate one turn of the AI template editor conversation.
 *
 * The AI receives the full chat history and the current template state.
 * It responds with a conversational message (always) and optionally a full
 * replacement template (when it generates or modifies the template).
 *
 * @param messages - Full conversation history (ModelMessage[]) including the new user message
 * @param currentTemplate - The current template state, or null if starting from scratch
 * @param language - Company content language code (e.g. "en", "ro"); defaults to English
 */
export async function generateTemplateChatTurn(
  messages: ModelMessage[],
  currentTemplate: TemplateExport | null,
  contentLanguage?: string,
  uiLanguage?: string
): Promise<ChatTurnResponse> {
  try {
    // Language instruction is embedded in the system prompt with full nuance:
    // conversation in uiLanguage, template content in contentLanguage.
    // withLanguageInstruction is intentionally NOT called here — it would override
    // the nuanced instruction with a blanket "respond entirely in X".
    const systemPrompt = buildTemplateEditorSystemPrompt(
      currentTemplate ?? undefined,
      contentLanguage,
      uiLanguage
    );

    const { object } = await generateObject({
      model: models.templateEditor,
      schema: templateChatResponseSchema,
      system: systemPrompt,
      messages,
    });

    return object;
  } catch (e) {
    throw new Error("AI generation failed: " + String(e));
  }
}

/**
 * Validate a correction reason for quality, relevance, and professional language.
 *
 * Called ONLY from the /validate-reason endpoint — NEVER inside a DB transaction.
 * AI availability must not block the correction mutation endpoint.
 *
 * On error: throws. Caller (validate-reason route) catches and returns degraded { pass: true, feedback: null }.
 */
export async function validateCorrectionReason(
  reason: string,
  language?: string
): Promise<ReasonValidationResult> {
  const systemPrompt = withLanguageInstruction(
    "You are a correction reason validator for a 1on1 meeting tool. " +
    "Evaluate whether the provided correction reason is specific, professional, and clearly explains " +
    "why an answer needs to be corrected. A good reason identifies what was wrong and why the new answer is more accurate. " +
    "A poor reason is vague (e.g., 'I made a mistake'), unrelated to the answer, or too brief.",
    language
  );

  const { object } = await generateObject({
    model: models.correctionValidator,
    schema: reasonValidationResultSchema,
    system: systemPrompt,
    prompt: `Correction reason: "${reason}"`,
  });

  return object;
}
