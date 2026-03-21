import { eq, and, desc, lt } from "drizzle-orm";
import { withTenantContext } from "@/lib/db/tenant-context";
import {
  sessions,
  sessionAnswers,
  privateNotes,
  talkingPoints,
  actionItems,
  users,
  templateQuestions,
  templateSections,
  tenants,
  teams,
  teamMembers,
  meetingSeries,
} from "@/lib/db/schema";
import type { AISummary } from "./schemas/summary";
import { decryptNote, type EncryptedPayload } from "@/lib/encryption/private-notes";

/** Maximum character length for individual text answers in AI context */
const MAX_ANSWER_TEXT_LENGTH = 500;
/** Maximum character length for notes in AI context */
const MAX_NOTE_LENGTH = 1000;
/** Number of recent sessions to include with full answer details */
const DETAILED_HISTORY_COUNT = 5;

export interface SessionAnswer {
  questionText: string;
  sectionName: string;
  answerType: string;
  answerText: string | null;
  answerNumeric: string | null;
  answerJson: unknown;
  skipped: boolean;
}

export interface PreviousSession {
  sessionNumber: number;
  scheduledAt: Date;
  sessionScore: string | null;
  aiSummary: AISummary | null;
  aiAssessmentScore: number | null;
  /** Full answers for recent sessions, empty for older ones (token budget) */
  answers: SessionAnswer[];
}

export interface SessionContext {
  /** Current session metadata */
  sessionId: string;
  seriesId: string;
  tenantId: string;
  managerId: string;
  reportId: string;
  sessionNumber: number;
  scheduledAt: Date;

  /** Manager and report names for prompt personalization */
  managerName: string;
  reportName: string;

  /** Company context for AI (culture, direction, values) */
  companyName: string;
  companyContext: string | null;

  /** Team context for AI */
  teamName: string | null;
  teamDescription: string | null;

  /** Current session answers grouped by section */
  answers: SessionAnswer[];

  /** Shared notes (per-section JSONB) */
  sharedNotes: Record<string, string> | null;

  /** Manager's private notes (decrypted) -- only used for manager addendum */
  privateNoteTexts: string[];

  /** Talking points with discussion status */
  talkingPointTexts: Array<{
    content: string;
    isDiscussed: boolean;
    section: string | null;
  }>;

  /** Action items from this session */
  actionItemTexts: Array<{
    title: string;
    description: string | null;
    status: string;
    assigneeName: string | null;
  }>;

  /** All action items for this series (all sessions) — for duplicate-avoidance context */
  allSeriesActionItems: Array<{
    title: string;
    description: string | null;
    status: string;
    completedAt: string | null;
    sessionNumber: number | null;
    assigneeName: string | null;
  }>;

  /** Previous sessions for cross-session trend analysis */
  previousSessions: PreviousSession[];
}

/**
 * Gathers all session data needed for AI prompt generation.
 *
 * Uses withTenantContext with managerId as the user ID, which allows
 * the manager's private notes to pass RLS (author-only policy).
 *
 * Token budget awareness: text answers truncated at 500 chars,
 * notes at 1000 chars to stay within LLM context limits.
 */
export async function gatherSessionContext(params: {
  sessionId: string;
  seriesId: string;
  tenantId: string;
  managerId: string;
  reportId: string;
}): Promise<SessionContext> {
  const { sessionId, seriesId, tenantId, managerId, reportId } = params;

  return await withTenantContext(tenantId, managerId, async (tx) => {
    // Fetch current session
    const [session] = await tx
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Fetch manager and report names
    const [manager] = await tx
      .select({ firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, managerId))
      .limit(1);

    const [report] = await tx
      .select({ firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, reportId))
      .limit(1);

    const managerName = manager
      ? `${manager.firstName} ${manager.lastName}`
      : "Manager";
    const reportName = report
      ? `${report.firstName} ${report.lastName}`
      : "Report";

    // Fetch tenant info (company name + context)
    const [tenant] = await tx
      .select({ name: tenants.name, settings: tenants.settings })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    const companyName = tenant?.name ?? "Company";
    const companyContext = (tenant?.settings as Record<string, unknown> | null)?.companyContext as string | null ?? null;

    // Fetch team context (team where report is member and manager is lead)
    const teamRow = await tx
      .select({ name: teams.name, description: teams.description })
      .from(teams)
      .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .where(
        and(
          eq(teamMembers.userId, reportId),
          eq(teams.managerId, managerId),
          eq(teams.tenantId, tenantId)
        )
      )
      .limit(1);

    const teamName = teamRow[0]?.name ?? null;
    const teamDescription = teamRow[0]?.description ?? null;

    // Fetch current session answers with question text and section
    const answersRaw = await tx
      .select({
        questionText: templateQuestions.questionText,
        sectionName: templateSections.name,
        answerType: templateQuestions.answerType,
        answerText: sessionAnswers.answerText,
        answerNumeric: sessionAnswers.answerNumeric,
        answerJson: sessionAnswers.answerJson,
        skipped: sessionAnswers.skipped,
      })
      .from(sessionAnswers)
      .innerJoin(
        templateQuestions,
        eq(sessionAnswers.questionId, templateQuestions.id)
      )
      .innerJoin(
        templateSections,
        eq(templateQuestions.sectionId, templateSections.id)
      )
      .where(eq(sessionAnswers.sessionId, sessionId))
      .orderBy(templateQuestions.sortOrder);

    const answers: SessionAnswer[] = answersRaw.map((a) => ({
      ...a,
      answerText: truncate(a.answerText, MAX_ANSWER_TEXT_LENGTH),
    }));

    // Fetch manager's private notes (decrypted)
    const rawNotes = await tx
      .select({ content: privateNotes.content, keyVersion: privateNotes.keyVersion })
      .from(privateNotes)
      .where(
        and(
          eq(privateNotes.sessionId, sessionId),
          eq(privateNotes.authorId, managerId)
        )
      );

    const privateNoteTexts = rawNotes.map((note) => {
      try {
        const payload: EncryptedPayload = JSON.parse(note.content);
        const decrypted = decryptNote(payload, tenantId);
        return truncate(decrypted, MAX_NOTE_LENGTH) ?? "";
      } catch {
        // If decryption fails (e.g., missing key), skip the note
        return "";
      }
    }).filter(Boolean);

    // Fetch talking points
    const talkingPointsRaw = await tx
      .select({
        content: talkingPoints.content,
        isDiscussed: talkingPoints.isDiscussed,
        category: talkingPoints.category,
      })
      .from(talkingPoints)
      .where(eq(talkingPoints.sessionId, sessionId))
      .orderBy(talkingPoints.sortOrder);

    const talkingPointTexts = talkingPointsRaw.map((tp) => ({
      content: truncate(tp.content, MAX_ANSWER_TEXT_LENGTH) ?? tp.content,
      isDiscussed: tp.isDiscussed,
      section: tp.category,
    }));

    // Fetch action items with assignee names
    const actionItemsRaw = await tx
      .select({
        title: actionItems.title,
        description: actionItems.description,
        status: actionItems.status,
        assigneeFirstName: users.firstName,
        assigneeLastName: users.lastName,
      })
      .from(actionItems)
      .innerJoin(users, eq(actionItems.assigneeId, users.id))
      .where(eq(actionItems.sessionId, sessionId));

    const actionItemTexts = actionItemsRaw.map((ai) => ({
      title: ai.title,
      description: truncate(ai.description, MAX_ANSWER_TEXT_LENGTH),
      status: ai.status,
      assigneeName: `${ai.assigneeFirstName} ${ai.assigneeLastName}`,
    }));

    // Fetch ALL action items for this series (all sessions) — for duplicate-avoidance context
    const allSeriesItemsRaw = await tx
      .select({
        title: actionItems.title,
        description: actionItems.description,
        status: actionItems.status,
        completedAt: actionItems.completedAt,
        sessionNumber: sessions.sessionNumber,
        assigneeFirstName: users.firstName,
        assigneeLastName: users.lastName,
      })
      .from(actionItems)
      .innerJoin(sessions, eq(actionItems.sessionId, sessions.id))
      .innerJoin(users, eq(actionItems.assigneeId, users.id))
      .where(eq(sessions.seriesId, seriesId))
      .orderBy(desc(sessions.sessionNumber));

    const allSeriesActionItems = allSeriesItemsRaw.map((ai) => ({
      title: ai.title,
      description: truncate(ai.description, MAX_ANSWER_TEXT_LENGTH),
      status: ai.status,
      completedAt: ai.completedAt ? ai.completedAt.toISOString() : null,
      sessionNumber: ai.sessionNumber,
      assigneeName: `${ai.assigneeFirstName} ${ai.assigneeLastName}`,
    }));

    // Fetch ALL previous completed sessions (tiered: recent with full answers, older with summary only)
    const prevSessionsRaw = await tx
      .select({
        id: sessions.id,
        sessionNumber: sessions.sessionNumber,
        scheduledAt: sessions.scheduledAt,
        sessionScore: sessions.sessionScore,
        aiSummary: sessions.aiSummary,
        aiAssessmentScore: sessions.aiAssessmentScore,
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.seriesId, seriesId),
          eq(sessions.status, "completed"),
          lt(sessions.scheduledAt, session.scheduledAt)
        )
      )
      .orderBy(desc(sessions.scheduledAt));

    const previousSessions: PreviousSession[] = [];
    for (let i = 0; i < prevSessionsRaw.length; i++) {
      const prevSession = prevSessionsRaw[i];
      let prevAnswers: SessionAnswer[] = [];

      // Only fetch full answers for the most recent N sessions (token budget)
      if (i < DETAILED_HISTORY_COUNT) {
        const answersRaw = await tx
          .select({
            questionText: templateQuestions.questionText,
            sectionName: templateSections.name,
            answerType: templateQuestions.answerType,
            answerText: sessionAnswers.answerText,
            answerNumeric: sessionAnswers.answerNumeric,
            answerJson: sessionAnswers.answerJson,
            skipped: sessionAnswers.skipped,
          })
          .from(sessionAnswers)
          .innerJoin(
            templateQuestions,
            eq(sessionAnswers.questionId, templateQuestions.id)
          )
          .innerJoin(
            templateSections,
            eq(templateQuestions.sectionId, templateSections.id)
          )
          .where(eq(sessionAnswers.sessionId, prevSession.id))
          .orderBy(templateQuestions.sortOrder);

        prevAnswers = answersRaw.map((a) => ({
          ...a,
          answerText: truncate(a.answerText, MAX_ANSWER_TEXT_LENGTH),
        }));
      }

      previousSessions.push({
        sessionNumber: prevSession.sessionNumber,
        scheduledAt: prevSession.scheduledAt,
        sessionScore: prevSession.sessionScore,
        aiSummary: prevSession.aiSummary ?? null,
        aiAssessmentScore: prevSession.aiAssessmentScore,
        answers: prevAnswers,
      });
    }

    return {
      sessionId,
      seriesId,
      tenantId,
      managerId,
      reportId,
      sessionNumber: session.sessionNumber,
      scheduledAt: session.scheduledAt,
      managerName,
      reportName,
      companyName,
      companyContext,
      teamName,
      teamDescription,
      answers,
      sharedNotes: session.sharedNotes
        ? truncateNotes(session.sharedNotes)
        : null,
      privateNoteTexts,
      talkingPointTexts,
      actionItemTexts,
      allSeriesActionItems,
      previousSessions,
    };
  });
}

/** Truncate a string to maxLength, adding ellipsis if truncated */
function truncate(
  text: string | null | undefined,
  maxLength: number
): string | null {
  if (!text) return null;
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/** Truncate all values in a notes record */
function truncateNotes(
  notes: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(notes)) {
    result[key] = truncate(value, MAX_NOTE_LENGTH) ?? value;
  }
  return result;
}
