import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { isSeriesParticipant, isAdmin } from "@/lib/auth/rbac";
import {
  sessions,
  meetingSeries,
  users,
  templateQuestions,
  templateSections,
  questionnaireTemplates,
  sessionAnswers,
  actionItems,
} from "@/lib/db/schema";
import { eq, and, desc, asc, inArray, or } from "drizzle-orm";

/**
 * GET /api/sessions/[id]
 *
 * Returns the full session data needed by the wizard:
 * - Session record (status, sessionNumber, startedAt)
 * - Series info (managerId, reportId, report name/avatar, cadence)
 * - Template sections (ordered by sortOrder, non-archived) with questions
 * - Existing answers (for restore on resume)
 * - Previous sessions (last 3 completed, with answers and action items)
 * - Open action items from previous sessions
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: sessionId } = await params;

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Fetch the session
        const sessionRows = await tx
          .select()
          .from(sessions)
          .where(
            and(
              eq(sessions.id, sessionId),
              eq(sessions.tenantId, session.user.tenantId)
            )
          )
          .limit(1);

        if (sessionRows.length === 0) {
          return { error: "NOT_FOUND" as const };
        }

        const sessionRecord = sessionRows[0];

        // Fetch the series with manager and report info
        const seriesRows = await tx
          .select({
            id: meetingSeries.id,
            managerId: meetingSeries.managerId,
            reportId: meetingSeries.reportId,
            cadence: meetingSeries.cadence,
            status: meetingSeries.status,
          })
          .from(meetingSeries)
          .where(eq(meetingSeries.id, sessionRecord.seriesId))
          .limit(1);

        if (seriesRows.length === 0) {
          return { error: "NOT_FOUND" as const };
        }

        const series = seriesRows[0];

        // Authorization: user must be participant or admin
        if (
          !isAdmin(session.user.role) &&
          !isSeriesParticipant(session.user.id, series)
        ) {
          return { error: "FORBIDDEN" as const };
        }

        // Fetch manager and report info in parallel
        const [managerRows, reportRows] = await Promise.all([
          tx
            .select({
              id: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
              avatarUrl: users.avatarUrl,
            })
            .from(users)
            .where(eq(users.id, series.managerId))
            .limit(1),
          tx
            .select({
              id: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
              avatarUrl: users.avatarUrl,
            })
            .from(users)
            .where(eq(users.id, series.reportId))
            .limit(1),
        ]);

        // Fetch template sections and questions
        let sectionData: Array<{
          id: string;
          name: string;
          description: string | null;
          sortOrder: number;
        }> = [];

        let questions: Array<{
          id: string;
          questionText: string;
          helpText: string | null;
          sectionId: string;
          answerType: string;
          answerConfig: unknown;
          isRequired: boolean;
          sortOrder: number;
          conditionalOnQuestionId: string | null;
          conditionalOperator: string | null;
          conditionalValue: string | null;
        }> = [];

        // Fetch template name
        let templateName: string | null = null;
        if (sessionRecord.templateId) {
          const [tmpl] = await tx
            .select({ name: questionnaireTemplates.name })
            .from(questionnaireTemplates)
            .where(eq(questionnaireTemplates.id, sessionRecord.templateId))
            .limit(1);
          templateName = tmpl?.name ?? null;
        }

        if (sessionRecord.templateId) {
          sectionData = await tx
            .select({
              id: templateSections.id,
              name: templateSections.name,
              description: templateSections.description,
              sortOrder: templateSections.sortOrder,
            })
            .from(templateSections)
            .where(
              and(
                eq(templateSections.templateId, sessionRecord.templateId),
                eq(templateSections.isArchived, false)
              )
            )
            .orderBy(asc(templateSections.sortOrder));

          questions = await tx
            .select({
              id: templateQuestions.id,
              questionText: templateQuestions.questionText,
              helpText: templateQuestions.helpText,
              sectionId: templateQuestions.sectionId,
              answerType: templateQuestions.answerType,
              answerConfig: templateQuestions.answerConfig,
              isRequired: templateQuestions.isRequired,
              sortOrder: templateQuestions.sortOrder,
              conditionalOnQuestionId:
                templateQuestions.conditionalOnQuestionId,
              conditionalOperator: templateQuestions.conditionalOperator,
              conditionalValue: templateQuestions.conditionalValue,
            })
            .from(templateQuestions)
            .where(
              and(
                eq(templateQuestions.templateId, sessionRecord.templateId),
                eq(templateQuestions.isArchived, false)
              )
            )
            .orderBy(asc(templateQuestions.sortOrder));
        }

        // Fetch existing answers for this session
        const answers = await tx
          .select({
            id: sessionAnswers.id,
            questionId: sessionAnswers.questionId,
            answerText: sessionAnswers.answerText,
            answerNumeric: sessionAnswers.answerNumeric,
            answerJson: sessionAnswers.answerJson,
            skipped: sessionAnswers.skipped,
            answeredAt: sessionAnswers.answeredAt,
          })
          .from(sessionAnswers)
          .where(eq(sessionAnswers.sessionId, sessionId));

        // Include archived questions/sections that have answers in this session.
        // When a template is edited, old questions are archived but answers still
        // reference them. Without this, completed sessions show answers as "skipped".
        const loadedQuestionIds = new Set(questions.map((q) => q.id));
        const missingQuestionIds = answers
          .map((a) => a.questionId)
          .filter((qid) => !loadedQuestionIds.has(qid));

        if (missingQuestionIds.length > 0) {
          const archivedQuestions = await tx
            .select({
              id: templateQuestions.id,
              questionText: templateQuestions.questionText,
              helpText: templateQuestions.helpText,
              sectionId: templateQuestions.sectionId,
              answerType: templateQuestions.answerType,
              answerConfig: templateQuestions.answerConfig,
              isRequired: templateQuestions.isRequired,
              sortOrder: templateQuestions.sortOrder,
              conditionalOnQuestionId:
                templateQuestions.conditionalOnQuestionId,
              conditionalOperator: templateQuestions.conditionalOperator,
              conditionalValue: templateQuestions.conditionalValue,
            })
            .from(templateQuestions)
            .where(inArray(templateQuestions.id, missingQuestionIds));

          questions.push(...archivedQuestions);

          // Also load any missing sections those archived questions belong to
          const loadedSectionIds = new Set(sectionData.map((s) => s.id));
          const missingSectionIds = [
            ...new Set(
              archivedQuestions
                .map((q) => q.sectionId)
                .filter((sid) => !loadedSectionIds.has(sid))
            ),
          ];

          if (missingSectionIds.length > 0) {
            const archivedSections = await tx
              .select({
                id: templateSections.id,
                name: templateSections.name,
                description: templateSections.description,
                sortOrder: templateSections.sortOrder,
              })
              .from(templateSections)
              .where(inArray(templateSections.id, missingSectionIds));

            sectionData.push(...archivedSections);
            sectionData.sort((a, b) => a.sortOrder - b.sortOrder);
          }
        }

        // Fetch previous completed sessions for this series (last 3)
        const previousSessions = await tx
          .select({
            id: sessions.id,
            sessionNumber: sessions.sessionNumber,
            scheduledAt: sessions.scheduledAt,
            completedAt: sessions.completedAt,
            status: sessions.status,
            sessionScore: sessions.sessionScore,
            sharedNotes: sessions.sharedNotes,
          })
          .from(sessions)
          .where(
            and(
              eq(sessions.seriesId, sessionRecord.seriesId),
              eq(sessions.status, "completed")
            )
          )
          .orderBy(desc(sessions.sessionNumber))
          .limit(3);

        // Fetch answers for previous sessions
        const prevSessionIds = previousSessions.map((s) => s.id);
        let prevAnswers: Array<{
          sessionId: string;
          questionId: string;
          answerText: string | null;
          answerNumeric: string | null;
          answerJson: unknown;
          skipped: boolean;
        }> = [];
        if (prevSessionIds.length > 0) {
          prevAnswers = await tx
            .select({
              sessionId: sessionAnswers.sessionId,
              questionId: sessionAnswers.questionId,
              answerText: sessionAnswers.answerText,
              answerNumeric: sessionAnswers.answerNumeric,
              answerJson: sessionAnswers.answerJson,
              skipped: sessionAnswers.skipped,
            })
            .from(sessionAnswers)
            .where(inArray(sessionAnswers.sessionId, prevSessionIds));
        }

        // Fetch open action items from sessions in this series (single join query)
        const filteredActionItems = await tx
          .select({
            id: actionItems.id,
            title: actionItems.title,
            status: actionItems.status,
            dueDate: actionItems.dueDate,
            category: actionItems.category,
            assigneeId: actionItems.assigneeId,
            sessionId: actionItems.sessionId,
            createdAt: actionItems.createdAt,
          })
          .from(actionItems)
          .innerJoin(sessions, eq(actionItems.sessionId, sessions.id))
          .where(
            and(
              eq(actionItems.tenantId, session.user.tenantId),
              eq(sessions.seriesId, sessionRecord.seriesId),
              or(
                eq(actionItems.status, "open"),
                eq(actionItems.status, "in_progress")
              )
            )
          );

        // Group previous answers by session
        const prevAnswersBySession = new Map<string, typeof prevAnswers>();
        for (const a of prevAnswers) {
          const existing = prevAnswersBySession.get(a.sessionId) ?? [];
          existing.push(a);
          prevAnswersBySession.set(a.sessionId, existing);
        }

        return {
          session: {
            id: sessionRecord.id,
            seriesId: sessionRecord.seriesId,
            templateId: sessionRecord.templateId,
            sessionNumber: sessionRecord.sessionNumber,
            status: sessionRecord.status,
            scheduledAt: sessionRecord.scheduledAt.toISOString(),
            startedAt: sessionRecord.startedAt?.toISOString() ?? null,
            completedAt: sessionRecord.completedAt?.toISOString() ?? null,
            sharedNotes: sessionRecord.sharedNotes,
          },
          series: {
            id: series.id,
            managerId: series.managerId,
            reportId: series.reportId,
            cadence: series.cadence,
            manager: managerRows[0] ?? null,
            report: reportRows[0] ?? null,
          },
          template: {
            name: templateName,
            sections: sectionData,
            questions,
          },
          answers: answers.map((a) => ({
            id: a.id,
            questionId: a.questionId,
            answerText: a.answerText,
            answerNumeric: a.answerNumeric
              ? Number(a.answerNumeric)
              : null,
            answerJson: a.answerJson,
            skipped: a.skipped,
            answeredAt: a.answeredAt.toISOString(),
          })),
          previousSessions: previousSessions.map((s) => ({
            id: s.id,
            sessionNumber: s.sessionNumber,
            scheduledAt: s.scheduledAt.toISOString(),
            completedAt: s.completedAt?.toISOString() ?? null,
            sessionScore: s.sessionScore ? Number(s.sessionScore) : null,
            sharedNotes: s.sharedNotes,
            answers: (prevAnswersBySession.get(s.id) ?? []).map((a) => ({
              questionId: a.questionId,
              answerText: a.answerText,
              answerNumeric: a.answerNumeric
                ? Number(a.answerNumeric)
                : null,
              answerJson: a.answerJson,
              skipped: a.skipped,
            })),
          })),
          openActionItems: filteredActionItems.map((ai) => ({
            id: ai.id,
            title: ai.title,
            status: ai.status,
            dueDate: ai.dueDate,
            category: ai.category,
            assigneeId: ai.assigneeId,
            createdAt: ai.createdAt.toISOString(),
          })),
        };
      }
    );

    if ("error" in result) {
      if (result.error === "NOT_FOUND") {
        return NextResponse.json(
          { error: "Session not found" },
          { status: 404 }
        );
      }
      if (result.error === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch session:", error);
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}
