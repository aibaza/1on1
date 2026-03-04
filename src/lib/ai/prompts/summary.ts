import type { SessionContext } from "../context";

export function buildSummarySystemPrompt(): string {
  return `You are an AI assistant for a 1-on-1 meeting management application. Your task is to generate structured summaries of completed 1-on-1 sessions between a manager and their direct report.

Guidelines:
- Extract the most important takeaways from the session's answers and notes
- Organize discussion highlights by the sections/categories used in the meeting template
- Identify items that need follow-up attention
- Assess the overall sentiment/tone of the session
- Be concise but substantive -- each point should convey meaningful information
- Use professional, neutral language
- Do NOT include private notes content in the summary (those are confidential)
- Reference specific answers and topics discussed, not just generic observations
- When previous sessions are available, note trends or changes (e.g., score improvements, recurring themes)`;
}

export function buildSummaryUserPrompt(context: SessionContext): string {
  const parts: string[] = [];

  parts.push(
    `## Session Information`,
    `Session #${context.sessionNumber} between ${context.managerName} (manager) and ${context.reportName} (report)`,
    `Date: ${context.scheduledAt.toISOString().split("T")[0]}`,
    ""
  );

  // Group answers by section
  const answersBySection = groupBySection(context.answers);
  if (Object.keys(answersBySection).length > 0) {
    parts.push(`## Session Answers`);
    for (const [section, answers] of Object.entries(answersBySection)) {
      parts.push(`\n### ${section}`);
      for (const answer of answers) {
        if (answer.skipped) {
          parts.push(`- **${answer.questionText}**: (skipped)`);
          continue;
        }
        const value = formatAnswerValue(answer);
        parts.push(`- **${answer.questionText}**: ${value}`);
      }
    }
    parts.push("");
  }

  // Shared notes
  if (context.sharedNotes && Object.keys(context.sharedNotes).length > 0) {
    parts.push(`## Shared Notes`);
    for (const [section, note] of Object.entries(context.sharedNotes)) {
      if (note.trim()) {
        parts.push(`### ${section}`, note, "");
      }
    }
  }

  // Talking points
  if (context.talkingPointTexts.length > 0) {
    parts.push(`## Talking Points`);
    for (const tp of context.talkingPointTexts) {
      const status = tp.isDiscussed ? "[Discussed]" : "[Not discussed]";
      const section = tp.section ? ` (${tp.section})` : "";
      parts.push(`- ${status}${section} ${tp.content}`);
    }
    parts.push("");
  }

  // Action items
  if (context.actionItemTexts.length > 0) {
    parts.push(`## Action Items Created`);
    for (const ai of context.actionItemTexts) {
      parts.push(
        `- **${ai.title}** (assigned to ${ai.assigneeName}, status: ${ai.status})${ai.description ? `: ${ai.description}` : ""}`
      );
    }
    parts.push("");
  }

  // Cross-session trends
  if (context.previousSessions.length > 0) {
    parts.push(`## Previous Session Context`);
    for (const prev of context.previousSessions) {
      const score = prev.sessionScore
        ? ` (score: ${prev.sessionScore})`
        : "";
      parts.push(
        `- Session #${prev.sessionNumber} on ${prev.scheduledAt.toISOString().split("T")[0]}${score}`
      );
    }
    parts.push("");
  }

  parts.push(
    `Generate a structured summary of this session with key takeaways, per-section discussion highlights, follow-up items, and overall sentiment.`
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
  if (answer.answerNumeric !== null) {
    return `${answer.answerNumeric}`;
  }
  if (answer.answerText) {
    return answer.answerText;
  }
  if (answer.answerJson !== null && answer.answerJson !== undefined) {
    return JSON.stringify(answer.answerJson);
  }
  return "(no answer)";
}
