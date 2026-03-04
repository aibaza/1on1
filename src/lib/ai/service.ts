import { generateText, Output } from "ai";
import { models } from "./models";
import { summarySchema, type AISummary } from "./schemas/summary";
import {
  managerAddendumSchema,
  type AIManagerAddendum,
} from "./schemas/addendum";
import { nudgesSchema, type AINudges } from "./schemas/nudges";
import {
  actionSuggestionsSchema,
  type AIActionSuggestions,
} from "./schemas/action-items";
import type { SessionContext } from "./context";
import { BASE_SYSTEM } from "./prompts/base";
import {
  buildSummarySystemPrompt,
  buildSummaryUserPrompt,
} from "./prompts/summary";
import {
  buildNudgesSystemPrompt,
  buildNudgesUserPrompt,
} from "./prompts/nudges";
import {
  buildActionSuggestionsSystemPrompt,
  buildActionSuggestionsUserPrompt,
} from "./prompts/action-items";

/**
 * Generate a structured session summary from session context.
 *
 * Uses the shared content (answers, shared notes, talking points) to produce
 * a summary visible to both manager and report. Private notes are excluded.
 */
export async function generateSummary(
  context: SessionContext
): Promise<AISummary> {
  try {
    const { output } = await generateText({
      model: models.summary,
      output: Output.object({ schema: summarySchema }),
      system: buildSummarySystemPrompt(),
      prompt: buildSummaryUserPrompt(context),
    });

    if (!output) {
      throw new Error("AI SDK returned null output for summary generation");
    }

    return output;
  } catch (error) {
    console.error("[AI Service] Summary generation failed:", error);
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
  context: SessionContext
): Promise<AIManagerAddendum> {
  try {
    const systemPrompt = BASE_SYSTEM + `Confidential manager-only addendum. NOT visible to the report.

- Sentiment: 1 sentence
- Patterns: a few words each, only if real
- Coaching: 1 sentence each, only what matters`;

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

    // Previous session trends
    if (context.previousSessions.length > 0) {
      parts.push(`## Previous Session Scores`);
      for (const prev of context.previousSessions) {
        const score = prev.sessionScore ? ` -- score: ${prev.sessionScore}` : "";
        parts.push(
          `- Session #${prev.sessionNumber} (${prev.scheduledAt.toISOString().split("T")[0]})${score}`
        );
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
    throw error;
  }
}

/**
 * Generate pre-session nudges for the manager.
 *
 * Produces 2-3 coaching nudges based on previous session data,
 * open action items, and undiscussed talking points.
 */
export async function generateNudges(
  context: SessionContext
): Promise<AINudges> {
  try {
    const { output } = await generateText({
      model: models.nudges,
      output: Output.object({ schema: nudgesSchema }),
      system: buildNudgesSystemPrompt(),
      prompt: buildNudgesUserPrompt(context),
    });

    if (!output) {
      throw new Error("AI SDK returned null output for nudges generation");
    }

    return output;
  } catch (error) {
    console.error("[AI Service] Nudges generation failed:", error);
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
  summary: AISummary
): Promise<AIActionSuggestions> {
  try {
    const { output } = await generateText({
      model: models.actionSuggestions,
      output: Output.object({ schema: actionSuggestionsSchema }),
      system: buildActionSuggestionsSystemPrompt(),
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
    throw error;
  }
}
