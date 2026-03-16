import type { SessionContext } from "../context";
import { buildBaseSystem } from "./base";

export function buildSummarySystemPrompt(language?: string): string {
  return buildBaseSystem(language) + `Summarize a 1-on-1 session.

- Card blurb: 1-2 plain sentences, max 25 words, no jargon — shown as preview on the series card
- Each takeaway: a few words, not a sentence
- Discussion highlights: 1 sentence per section, skip score-only sections
- Follow-ups: only if explicitly needed
- Never include private notes
- ATTRIBUTION: In a 1:1, the manager records answers about the report's experience. Any unnamed subject ("I", "we", or no subject at all) refers to the REPORT, not the manager. Only attribute something to the manager if the answer explicitly names the manager.`;
}

export function buildSummaryUserPrompt(context: SessionContext): string {
  const parts: string[] = [];

  parts.push(
    `Session #${context.sessionNumber} — Manager: ${context.managerName} | Report: ${context.reportName} (${context.scheduledAt.toISOString().split("T")[0]})`,
    `Answers below describe ${context.reportName}'s experience, recorded by ${context.managerName}. Unnamed subjects = ${context.reportName}.`,
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

  if (context.previousSessions.length > 0) {
    parts.push(`\n## Previous Sessions (for trend context)`);
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
