import type { SessionContext } from "../context";

export function buildSummarySystemPrompt(): string {
  return `You summarize 1-on-1 meeting sessions. Be extremely concise — match output length to input length.

Rules:
- If an answer is one sentence, summarize it in a few words, not a paragraph
- Each key takeaway: max 10 words
- Each discussion highlight summary: 1-2 sentences max, only if there's substance to summarize
- Skip sections where answers are just scores with no text commentary
- Follow-up items: only if explicitly mentioned or clearly needed
- Never pad, never invent details not in the data
- Never include private notes
- Use the language of the session answers (if Romanian, write Romanian)`;
}

export function buildSummaryUserPrompt(context: SessionContext): string {
  const parts: string[] = [];

  parts.push(
    `Session #${context.sessionNumber}: ${context.managerName} → ${context.reportName} (${context.scheduledAt.toISOString().split("T")[0]})`,
    ""
  );

  const answersBySection = groupBySection(context.answers);
  for (const [section, answers] of Object.entries(answersBySection)) {
    const nonSkipped = answers.filter((a) => !a.skipped);
    if (nonSkipped.length === 0) continue;
    parts.push(`### ${section}`);
    for (const answer of nonSkipped) {
      const value = formatAnswerValue(answer);
      if (value && value !== "(no answer)") {
        parts.push(`- ${answer.questionText}: ${value}`);
      }
    }
  }

  if (context.talkingPointTexts.length > 0) {
    parts.push(`\n### Talking Points`);
    for (const tp of context.talkingPointTexts) {
      parts.push(`- ${tp.isDiscussed ? "✓" : "○"} ${tp.content}`);
    }
  }

  parts.push(
    `\nSummarize proportionally to the data above. Short answers = short summary. No filler.`
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
