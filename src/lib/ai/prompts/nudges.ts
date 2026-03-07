import type { SessionContext } from "../context";
import { buildBaseSystem } from "./base";

export function buildNudgesSystemPrompt(language?: string): string {
  return buildBaseSystem(language) + `Generate 2-3 coaching nudges for a manager before their next 1-on-1.

- Each nudge: 1 sentence, specific, referencing real data
- No generic advice`;
}

export function buildNudgesUserPrompt(context: SessionContext): string {
  const parts: string[] = [];

  parts.push(`Manager: ${context.managerName}, Report: ${context.reportName}`, "");

  if (context.actionItemTexts.length > 0) {
    parts.push(`Open action items:`);
    for (const ai of context.actionItemTexts) {
      parts.push(`- ${ai.title} (${ai.status})`);
    }
    parts.push("");
  }

  const undiscussed = context.talkingPointTexts.filter((tp) => !tp.isDiscussed);
  if (undiscussed.length > 0) {
    parts.push(`Not discussed last time:`);
    for (const tp of undiscussed) {
      parts.push(`- ${tp.content}`);
    }
    parts.push("");
  }

  if (context.previousSessions.length > 0) {
    for (const prev of context.previousSessions) {
      parts.push(`Session #${prev.sessionNumber} (${prev.scheduledAt.toISOString().split("T")[0]}):`);
      for (const answer of prev.answers) {
        if (answer.skipped) continue;
        const value = formatAnswerValue(answer);
        if (value && value !== "(no answer)") {
          parts.push(`- ${answer.questionText}: ${value}`);
        }
      }
      parts.push("");
    }
  }

  return parts.join("\n");
}

function formatAnswerValue(
  answer: SessionContext["previousSessions"][number]["answers"][number]
): string {
  if (answer.answerNumeric !== null) return `${answer.answerNumeric}`;
  if (answer.answerText) return answer.answerText;
  if (answer.answerJson !== null && answer.answerJson !== undefined) {
    return JSON.stringify(answer.answerJson);
  }
  return "(no answer)";
}
