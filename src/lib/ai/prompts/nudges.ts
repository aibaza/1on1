import type { SessionContext } from "../context";

export function buildNudgesSystemPrompt(): string {
  return `You are a coaching assistant helping a manager prepare for an upcoming 1-on-1 meeting with their direct report. Generate 2-3 specific, actionable nudges based on previous session data.

Guidelines:
- Use a gentle, supportive coaching tone
- Start nudges with phrases like "Consider asking about...", "Last time [name] mentioned...", "It might be worth following up on..."
- Reference specific topics, answers, or action items from previous sessions
- Prioritize nudges based on importance: "high" for urgent follow-ups, "medium" for recurring themes, "low" for nice-to-discuss items
- Each nudge should be 1-2 sentences, specific enough to be actionable
- Do NOT make up information -- only reference data from the provided sessions
- Include the source session ID when the nudge references a specific previous session
- Focus on the report's wellbeing, development, and unresolved items`;
}

export function buildNudgesUserPrompt(context: SessionContext): string {
  const parts: string[] = [];

  parts.push(
    `## Preparing for Next Session`,
    `Manager: ${context.managerName}`,
    `Report: ${context.reportName}`,
    ""
  );

  // Current action items status
  if (context.actionItemTexts.length > 0) {
    parts.push(`## Open Action Items`);
    for (const ai of context.actionItemTexts) {
      parts.push(
        `- **${ai.title}** (${ai.status}, assigned to ${ai.assigneeName})${ai.description ? `: ${ai.description}` : ""}`
      );
    }
    parts.push("");
  }

  // Previous session data for context
  if (context.previousSessions.length > 0) {
    parts.push(`## Recent Session History`);
    for (const prev of context.previousSessions) {
      const score = prev.sessionScore
        ? ` (score: ${prev.sessionScore})`
        : "";
      parts.push(
        `### Session #${prev.sessionNumber} on ${prev.scheduledAt.toISOString().split("T")[0]}${score}`
      );

      // Show key answers from previous sessions
      const answersBySection = groupBySection(prev.answers);
      for (const [section, answers] of Object.entries(answersBySection)) {
        parts.push(`**${section}:**`);
        for (const answer of answers) {
          if (answer.skipped) continue;
          const value = formatAnswerValue(answer);
          parts.push(`- ${answer.questionText}: ${value}`);
        }
      }
      parts.push("");
    }
  }

  // Talking points that were not discussed
  const undiscussed = context.talkingPointTexts.filter(
    (tp) => !tp.isDiscussed
  );
  if (undiscussed.length > 0) {
    parts.push(`## Undiscussed Talking Points (from last session)`);
    for (const tp of undiscussed) {
      parts.push(`- ${tp.content}`);
    }
    parts.push("");
  }

  parts.push(
    `Generate 2-3 coaching nudges for ${context.managerName} to prepare for their next 1-on-1 with ${context.reportName}. Each nudge should reference specific data from the sessions above.`
  );

  return parts.join("\n");
}

function groupBySection(
  answers: SessionContext["previousSessions"][number]["answers"]
): Record<string, SessionContext["previousSessions"][number]["answers"]> {
  const grouped: Record<
    string,
    SessionContext["previousSessions"][number]["answers"]
  > = {};
  for (const answer of answers) {
    const section = answer.sectionName || "General";
    if (!grouped[section]) grouped[section] = [];
    grouped[section].push(answer);
  }
  return grouped;
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
