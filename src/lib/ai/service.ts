import * as Sentry from "@sentry/nextjs";
import { generateText, generateObject, Output } from "ai";
import { reasonValidationResultSchema, type ReasonValidationResult } from "./schemas/correction";
import type { ModelMessage } from "ai";
import { models } from "./models";
import { summarySchema, type AISummary } from "./schemas/summary";
import {
  managerAddendumSchema,
  type AIManagerAddendum,
} from "./schemas/addendum";
import {
  actionSuggestionsSchema,
  type AIActionSuggestions,
} from "./schemas/action-items";
import {
  templateChatResponseSchema,
  type ChatTurnResponse,
} from "./schemas/template-chat";
import type { SessionContext } from "./context";
import type { TemplateExport } from "../templates/export-schema";
import { buildBaseSystem } from "./prompts/base";
import {
  buildSummarySystemPrompt,
  buildSummaryUserPrompt,
} from "./prompts/summary";
import {
  buildActionSuggestionsSystemPrompt,
  buildActionSuggestionsUserPrompt,
} from "./prompts/action-items";
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
 * Generate a structured session summary from session context.
 *
 * Uses the shared content (answers, shared notes, talking points) to produce
 * a summary visible to both manager and report. Private notes are excluded.
 */
export async function generateSummary(
  context: SessionContext,
  language?: string
): Promise<AISummary> {
  try {
    const { output } = await generateText({
      model: models.summary,
      output: Output.object({ schema: summarySchema }),
      system: buildSummarySystemPrompt(language),
      prompt: buildSummaryUserPrompt(context),
    });

    if (!output) {
      throw new Error("AI SDK returned null output for summary generation");
    }

    return output;
  } catch (error) {
    console.error("[AI Service] Summary generation failed:", error);
    Sentry.captureException(error, {
      tags: { ai_operation: "generateSummary", model: "summary" },
      extra: {
        sessionId: context.sessionId,
        tenantId: context.tenantId,
        sessionNumber: context.sessionNumber,
        answersCount: context.answers.length,
        language,
        anthropicKeyPresent: !!process.env.ANTHROPIC_API_KEY,
      },
    });
    throw error;
  }
}

/**
 * Generate a manager-only addendum with sentiment analysis and coaching suggestions.
 *
 * Uses private notes (decrypted) in addition to shared content to provide
 * deeper insights visible only to the manager.
 */
export async function generateManagerAddendum(
  context: SessionContext,
  language?: string
): Promise<AIManagerAddendum> {
  try {
    const systemPrompt = buildBaseSystem(language) + `Confidential manager-only addendum. NOT visible to the report.

- Sentiment: 1 sentence
- Patterns: a few words each, only if real
- Coaching: 1 sentence each, only what matters
- ATTRIBUTION: In a 1:1, the manager records answers about the report's experience. Any unnamed subject ("I", "we", or no subject at all) refers to the REPORT, not the manager. Only attribute something to the manager if the answer explicitly names the manager.`;

    const parts: string[] = [];
    parts.push(
      `## Session Information`,
      `Session #${context.sessionNumber} between ${context.managerName} (manager) and ${context.reportName} (report)`,
      `Date: ${context.scheduledAt.toISOString().split("T")[0]}`,
      ""
    );

    // Include answers summary
    if (context.answers.length > 0) {
      parts.push(`## Session Answers`);
      for (const answer of context.answers) {
        if (answer.skipped) continue;
        const value =
          answer.answerNumeric ??
          answer.answerText ??
          (answer.answerJson ? JSON.stringify(answer.answerJson) : null);
        if (value) {
          parts.push(`- **${answer.questionText}** (${answer.sectionName}): ${value}`);
        }
      }
      parts.push("");
    }

    // Include manager's private notes
    if (context.privateNoteTexts.length > 0) {
      parts.push(`## Manager's Private Notes (confidential)`);
      for (const note of context.privateNoteTexts) {
        parts.push(`- ${note}`);
      }
      parts.push("");
    }

    // Previous session trends with full answers
    if (context.previousSessions.length > 0) {
      parts.push(`## Previous Sessions`);
      for (const prev of context.previousSessions) {
        const score = prev.sessionScore ? ` — score: ${prev.sessionScore}` : "";
        parts.push(
          `Session #${prev.sessionNumber} (${prev.scheduledAt.toISOString().split("T")[0]})${score}`
        );
        for (const answer of prev.answers) {
          if (answer.skipped) continue;
          const value =
            answer.answerNumeric ??
            answer.answerText ??
            (answer.answerJson ? JSON.stringify(answer.answerJson) : null);
          if (value) {
            parts.push(`  - [${answer.sectionName}] ${answer.questionText}: ${value}`);
          }
        }
      }
      parts.push("");
    }

    parts.push(`Generate a brief addendum proportional to the data above.`);

    const { output } = await generateText({
      model: models.managerAddendum,
      output: Output.object({ schema: managerAddendumSchema }),
      system: systemPrompt,
      prompt: parts.join("\n"),
    });

    if (!output) {
      throw new Error("AI SDK returned null output for addendum generation");
    }

    return output;
  } catch (error) {
    console.error("[AI Service] Manager addendum generation failed:", error);
    Sentry.captureException(error, {
      tags: { ai_operation: "generateManagerAddendum", model: "managerAddendum" },
      extra: {
        sessionId: context.sessionId,
        tenantId: context.tenantId,
        sessionNumber: context.sessionNumber,
        language,
        anthropicKeyPresent: !!process.env.ANTHROPIC_API_KEY,
      },
    });
    throw error;
  }
}

/**
 * Generate action item suggestions based on session content and AI summary.
 *
 * Takes the already-generated summary as input to avoid redundant analysis
 * and ensure suggestions align with identified follow-up items.
 */
export async function generateActionSuggestions(
  context: SessionContext,
  summary: AISummary,
  language?: string
): Promise<AIActionSuggestions> {
  try {
    const { output } = await generateText({
      model: models.actionSuggestions,
      output: Output.object({ schema: actionSuggestionsSchema }),
      system: buildActionSuggestionsSystemPrompt(language),
      prompt: buildActionSuggestionsUserPrompt(context, summary),
    });

    if (!output) {
      throw new Error(
        "AI SDK returned null output for action suggestions generation"
      );
    }

    return output;
  } catch (error) {
    console.error(
      "[AI Service] Action suggestions generation failed:",
      error
    );
    Sentry.captureException(error, {
      tags: { ai_operation: "generateActionSuggestions", model: "actionSuggestions" },
      extra: {
        sessionId: context.sessionId,
        tenantId: context.tenantId,
        sessionNumber: context.sessionNumber,
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
    "You are a correction reason validator for a 1:1 meeting tool. " +
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
