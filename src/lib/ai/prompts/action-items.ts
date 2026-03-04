import type { SessionContext } from "../context";
import type { AISummary } from "../schemas/summary";

export function buildActionSuggestionsSystemPrompt(): string {
  return `Suggest 1-3 follow-up action items after a 1-on-1 session.

Rules:
- Only suggest items clearly warranted by the session data
- Title: max 10 words. Description: 1 sentence.
- Don't duplicate existing action items
- If session was routine with no issues, suggest 0-1 items — don't force it
- Use the language of the session answers (if Romanian, write Romanian)`;
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

  parts.push(`Key takeaways:`);
  for (const t of summary.keyTakeaways) {
    parts.push(`- ${t}`);
  }

  if (summary.followUpItems.length > 0) {
    parts.push(`\nFollow-ups identified:`);
    for (const item of summary.followUpItems) {
      parts.push(`- ${item}`);
    }
  }

  if (context.actionItemTexts.length > 0) {
    parts.push(`\nExisting items (do NOT duplicate):`);
    for (const ai of context.actionItemTexts) {
      parts.push(`- ${ai.title}`);
    }
  }

  parts.push(`\nSuggest only clearly needed action items. Keep it brief.`);
  return parts.join("\n");
}
