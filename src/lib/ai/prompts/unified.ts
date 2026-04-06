import type { SessionContext } from "../context";
import { buildBaseSystem } from "./base";

export function buildUnifiedSystemPrompt(language?: string): string {
  return buildBaseSystem(language) + `You are analyzing a 1-on-1 meeting session. Produce a structured analysis with three sections:

## METRICS
- overallSentiment: the session's emotional tone (positive/neutral/mixed/concerning)
- keyTakeaways: 2-5 bullet points, each max 10 words
- objectiveRating: 1-5 stars based on mood, engagement, blockers, growth trajectory, and rapport

## PUBLIC SUMMARY (visible to both manager and report)
- cardBlurb: 1-2 plain sentences, max 25 words, no jargon — shown as card preview
- discussionHighlights: 1 sentence per section, skip score-only sections
- followUpItems: only if explicitly needed
- suggestions: 0-3 action items — only what's clearly warranted. Title max 8 words. Don't duplicate existing action items.

## MANAGER ADDENDUM (confidential — NOT visible to the report)
- sentimentAnalysis: 1-2 sentences on engagement and emotional state. Write as an objective assessment, not a quote.
- riskIndicators: 0-3 items that represent genuine risks to engagement, retention, or performance. Only include actual risks backed by session data. An empty array is fine if no risks exist.
- coachingSuggestions: max 3, actionable, 1 sentence each
- followUpPriority: how urgently to follow up

RULES:
- ATTRIBUTION: In a 1on1, the manager records answers about the report's experience. Unnamed subjects ("I", "we", or no subject) = the REPORT. Only attribute to the manager if explicitly named.
- Private notes are CONFIDENTIAL — use them only for the manager addendum, never in public summary.
- Output must be proportional to input. Short session = short analysis.
- Never pad, never add filler.
- NEVER use em dashes, en dashes, or emoji. Use commas, periods, and plain hyphens only.
- Each keyTakeaway must reference a specific answer or data point from the session. Do not invent takeaways without basis in the data.
- areasOfConcern: only include items that are genuine blockers or need clarification. Follow-up items are NOT concerns unless they signal a problem.`;
}

export function buildUnifiedUserPrompt(context: SessionContext): string {
  const parts: string[] = [];

  // Company context
  if (context.companyContext) {
    parts.push(`## Company: ${context.companyName}`);
    parts.push(context.companyContext);
    parts.push("");
  }

  // Team context
  if (context.teamName && context.teamDescription) {
    parts.push(`## Team: ${context.teamName}`);
    parts.push(context.teamDescription);
    parts.push("");
  }

  // Session header
  parts.push(
    `## Current Session #${context.sessionNumber}`,
    `Manager: ${context.managerName} | Report: ${context.reportName} | Date: ${context.scheduledAt.toISOString().split("T")[0]}`,
    `Answers below describe ${context.reportName}'s experience, recorded by ${context.managerName}. Unnamed subjects = ${context.reportName}.`,
    ""
  );

  // Current answers grouped by section
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
    parts.push("");
  }

  // Talking points
  if (context.talkingPointTexts.length > 0) {
    parts.push(`### Talking Points`);
    for (const tp of context.talkingPointTexts) {
      parts.push(`- ${tp.isDiscussed ? "✓" : "○"} ${tp.content}`);
    }
    parts.push("");
  }

  // Shared notes
  if (context.sharedNotes) {
    const noteEntries = Object.entries(context.sharedNotes).filter(([, v]) => v);
    if (noteEntries.length > 0) {
      parts.push(`### Shared Notes`);
      for (const [section, note] of noteEntries) {
        parts.push(`- [${section}] ${note}`);
      }
      parts.push("");
    }
  }

  // Manager's private notes (confidential)
  if (context.privateNoteTexts.length > 0) {
    parts.push(`### Manager's Private Notes (CONFIDENTIAL — for addendum only)`);
    for (const note of context.privateNoteTexts) {
      parts.push(`- ${note}`);
    }
    parts.push("");
  }

  // Existing action items (for duplicate avoidance)
  if (context.allSeriesActionItems.length > 0) {
    parts.push(`### All Action Items From This Relationship (don't duplicate)`);
    for (const ai of context.allSeriesActionItems) {
      const session = ai.sessionNumber ? `#${ai.sessionNumber}` : "?";
      const assignee = ai.assigneeName ? ` — ${ai.assigneeName}` : "";
      parts.push(`- [Session ${session}] ${ai.title} (${ai.status})${assignee}`);
    }
    parts.push("");
  }

  // Previous sessions — tiered: recent with answers, older with summary only
  if (context.previousSessions.length > 0) {
    parts.push(`## Session History (${context.previousSessions.length} previous sessions)`);
    for (const prev of context.previousSessions) {
      const score = prev.sessionScore ? ` — score: ${prev.sessionScore}/5` : "";
      const rating = prev.aiAssessmentScore ? ` — AI rating: ${prev.aiAssessmentScore}/5` : "";
      parts.push(`### Session #${prev.sessionNumber} (${prev.scheduledAt.toISOString().split("T")[0]})${score}${rating}`);

      // AI summary from previous session (if available)
      if (prev.aiSummary) {
        if (prev.aiSummary.cardBlurb) {
          parts.push(`Summary: ${prev.aiSummary.cardBlurb}`);
        }
        if (prev.aiSummary.overallSentiment) {
          parts.push(`Sentiment: ${prev.aiSummary.overallSentiment}`);
        }
      }

      // Full answers for recent sessions only
      if (prev.answers.length > 0) {
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
      parts.push("");
    }
  }

  parts.push("Generate a structured analysis proportional to the data above.");

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
