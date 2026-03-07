import type { SessionContext } from "../context";
import { buildBaseSystem } from "./base";

export function buildSummarySystemPrompt(language?: string): string {
  return buildBaseSystem(language) + `Summarize a 1-on-1 session.

- Card blurb: 1-2 plain sentences, max 25 words, no jargon — shown as preview on the series card
- Each takeaway: a few words, not a sentence
- Discussion highlights: 1 sentence per section, skip score-only sections
- Follow-ups: only if explicitly needed
- Never include private notes`;
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
