import type { SessionContext } from "../context";
import type { AISummary } from "../schemas/summary";

export function buildActionSuggestionsSystemPrompt(): string {
  return `You are an AI assistant for a 1-on-1 meeting management application. After a session is completed, you suggest 1-3 actionable follow-up items based on the session content and AI-generated summary.

Guidelines:
- Each suggestion should be specific, measurable, and actionable
- Titles should be clear and concise (max 200 characters)
- Descriptions should provide enough context to understand the action (max 500 characters)
- Suggest the most appropriate assignee: "manager" for things the manager should do, "report" for things the report should own
- Provide reasoning for each suggestion so the manager understands why it was suggested
- Focus on items that emerged from the session discussion, not generic advice
- Prioritize follow-ups mentioned in the session, unresolved concerns, and development opportunities
- Do NOT duplicate action items that were already created during the session
- 1-3 suggestions is the target range -- don't force items if the session was straightforward`;
}

export function buildActionSuggestionsUserPrompt(
  context: SessionContext,
  summary: AISummary
): string {
  const parts: string[] = [];

  parts.push(
    `## Session Information`,
    `Session #${context.sessionNumber} between ${context.managerName} (manager) and ${context.reportName} (report)`,
    `Date: ${context.scheduledAt.toISOString().split("T")[0]}`,
    `Overall Sentiment: ${summary.overallSentiment}`,
    ""
  );

  // Include the AI summary for context
  parts.push(`## AI Summary`);
  parts.push(`### Key Takeaways`);
  for (const takeaway of summary.keyTakeaways) {
    parts.push(`- ${takeaway}`);
  }
  parts.push("");

  if (summary.followUpItems.length > 0) {
    parts.push(`### Follow-Up Items from Summary`);
    for (const item of summary.followUpItems) {
      parts.push(`- ${item}`);
    }
    parts.push("");
  }

  // Existing action items (to avoid duplication)
  if (context.actionItemTexts.length > 0) {
    parts.push(`## Existing Action Items (do NOT duplicate these)`);
    for (const ai of context.actionItemTexts) {
      parts.push(`- ${ai.title} (assigned to ${ai.assigneeName})`);
    }
    parts.push("");
  }

  // Key discussion points for more context
  const answersBySection = groupBySection(context.answers);
  if (Object.keys(answersBySection).length > 0) {
    parts.push(`## Session Discussion`);
    for (const [section, answers] of Object.entries(answersBySection)) {
      const nonSkipped = answers.filter((a) => !a.skipped);
      if (nonSkipped.length === 0) continue;
      parts.push(`### ${section}`);
      for (const answer of nonSkipped) {
        const value = formatAnswerValue(answer);
        parts.push(`- **${answer.questionText}**: ${value}`);
      }
    }
    parts.push("");
  }

  parts.push(
    `Based on the session content and summary above, suggest 1-3 specific action items. For each, provide a clear title, brief description, suggested assignee (manager or report), and reasoning.`
  );

  return parts.join("\n");
}

function groupBySection(
  answers: SessionContext["answers"]
): Record<string, SessionContext["answers"]> {
  const grouped: Record<string, SessionContext["answers"]> = {};
  for (const answer of answers) {
    const section = answer.sectionName || "General";
    if (!grouped[section]) grouped[section] = [];
    grouped[section].push(answer);
  }
  return grouped;
}

function formatAnswerValue(answer: SessionContext["answers"][number]): string {
  if (answer.answerNumeric !== null) return `${answer.answerNumeric}`;
  if (answer.answerText) return answer.answerText;
  if (answer.answerJson !== null && answer.answerJson !== undefined) {
    return JSON.stringify(answer.answerJson);
  }
  return "(no answer)";
}
