import type { SessionContext } from "../context";
import type { AISummary } from "../schemas/summary";
import { BASE_SYSTEM } from "./base";

export function buildActionSuggestionsSystemPrompt(): string {
  return BASE_SYSTEM + `Suggest follow-up action items after a 1-on-1.

- Title: max 8 words. Description: 1 sentence.
- Only suggest what's clearly warranted — 0 items is fine for routine sessions
- Don't duplicate existing items`;
}

export function buildActionSuggestionsUserPrompt(
  context: SessionContext,
  summary: AISummary
): string {
  const parts: string[] = [];

  parts.push(
    `Session #${context.sessionNumber}: ${context.managerName} → ${context.reportName}`,
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

  if (context.actionItemTexts.length > 0) {
    parts.push(`\nExisting (don't duplicate):`);
    for (const ai of context.actionItemTexts) {
      parts.push(`- ${ai.title}`);
    }
  }

  return parts.join("\n");
}
