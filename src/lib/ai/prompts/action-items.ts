import type { SessionContext } from "../context";
import type { AISummary } from "../schemas/summary";
import { buildBaseSystem } from "./base";

export function buildActionSuggestionsSystemPrompt(language?: string): string {
  return buildBaseSystem(language) + `Suggest follow-up action items after a 1-on-1.

- Title: max 8 words. Description: 1 sentence.
- Only suggest what's clearly warranted — 0 items is fine for routine sessions
- Don't duplicate existing or historical action items
- ATTRIBUTION: In a 1:1, the manager records answers about the report's experience. Any unnamed subject ("I", "we", or no subject at all) refers to the REPORT, not the manager. Only attribute something to the manager if the answer explicitly names the manager.`;
}

export function buildActionSuggestionsUserPrompt(
  context: SessionContext,
  summary: AISummary
): string {
  const parts: string[] = [];

  parts.push(
    `Session #${context.sessionNumber} — Manager: ${context.managerName} | Report: ${context.reportName}`,
    `Unnamed subjects in the session answers refer to ${context.reportName} (the report).`,
    `Sentiment: ${summary.overallSentiment}`,
    ""
  );

  parts.push(`Takeaways:`);
  for (const t of summary.keyTakeaways) {
    parts.push(`- ${t}`);
  }

  if (summary.followUpItems.length > 0) {
    parts.push(`\nFollow-ups:`);
    for (const item of summary.followUpItems) {
      parts.push(`- ${item}`);
    }
  }

  if (context.previousSessions.length > 0) {
    parts.push(`\nPrevious session answers (for context):`);
    for (const prev of context.previousSessions) {
      const score = prev.sessionScore ? ` — score: ${prev.sessionScore}` : "";
      parts.push(`Session #${prev.sessionNumber} (${prev.scheduledAt.toISOString().split("T")[0]})${score}`);
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
  }

  if (context.allSeriesActionItems.length > 0) {
    parts.push(`\nAll action items from this relationship (don't duplicate):`);
    for (const ai of context.allSeriesActionItems) {
      const session = ai.sessionNumber ? `#${ai.sessionNumber}` : "?";
      const assignee = ai.assigneeName ? ` — ${ai.assigneeName}` : "";
      parts.push(`- [Session ${session}] ${ai.title} (${ai.status})${assignee}`);
    }
  } else if (context.actionItemTexts.length > 0) {
    parts.push(`\nExisting (don't duplicate):`);
    for (const ai of context.actionItemTexts) {
      parts.push(`- ${ai.title}`);
    }
  }

  return parts.join("\n");
}
