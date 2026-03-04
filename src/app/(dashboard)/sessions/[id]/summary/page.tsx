import { auth } from "@/lib/auth/config";
import { redirect, notFound } from "next/navigation";
import { withTenantContext } from "@/lib/db/tenant-context";
import { isSeriesParticipant, isAdmin } from "@/lib/auth/rbac";
import {
  sessions,
  meetingSeries,
  users,
  templateQuestions,
  templateSections,
  sessionAnswers,
  talkingPoints,
  privateNotes,
  actionItems,
} from "@/lib/db/schema";
import { eq, and, asc, inArray, sql } from "drizzle-orm";
import { decryptNote, type EncryptedPayload } from "@/lib/encryption/private-notes";
import { SessionSummaryView } from "@/components/session/session-summary-view";

export default async function SessionSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id: sessionId } = await params;

  const data = await withTenantContext(
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

      if (sessionRows.length === 0) return { error: "NOT_FOUND" as const };

      const sessionRecord = sessionRows[0];

      // If in_progress, redirect to the wizard
      if (sessionRecord.status === "in_progress") {
        return { error: "IN_PROGRESS" as const };
      }

      // Fetch the series
      const seriesRows = await tx
        .select()
        .from(meetingSeries)
        .where(eq(meetingSeries.id, sessionRecord.seriesId))
        .limit(1);

      if (seriesRows.length === 0) return { error: "NOT_FOUND" as const };

      const series = seriesRows[0];

      // Authorization: user must be participant or admin
      if (
        !isAdmin(session.user.role) &&
        !isSeriesParticipant(session.user.id, series)
      ) {
        return { error: "FORBIDDEN" as const };
      }

      const isManager = session.user.id === series.managerId;

      // Fetch all data in parallel
      const [
        sectionData,
        questions,
        answers,
        talkingPointRows,
        privateNoteRows,
        actionItemRows,
      ] = await Promise.all([
        sessionRecord.templateId
          ? tx
              .select({
                id: templateSections.id,
                name: templateSections.name,
                sortOrder: templateSections.sortOrder,
              })
              .from(templateSections)
              .where(
                and(
                  eq(templateSections.templateId, sessionRecord.templateId),
                  eq(templateSections.isArchived, false)
                )
              )
              .orderBy(asc(templateSections.sortOrder))
          : Promise.resolve([]),
        sessionRecord.templateId
          ? tx
              .select({
                id: templateQuestions.id,
                sectionId: templateQuestions.sectionId,
                questionText: templateQuestions.questionText,
                answerType: templateQuestions.answerType,
                isRequired: templateQuestions.isRequired,
                helpText: templateQuestions.helpText,
                sortOrder: templateQuestions.sortOrder,
              })
              .from(templateQuestions)
              .where(
                and(
                  eq(templateQuestions.templateId, sessionRecord.templateId),
                  eq(templateQuestions.isArchived, false)
                )
              )
              .orderBy(asc(templateQuestions.sortOrder))
          : Promise.resolve([]),
        tx
          .select({
            id: sessionAnswers.id,
            questionId: sessionAnswers.questionId,
            answerText: sessionAnswers.answerText,
            answerNumeric: sessionAnswers.answerNumeric,
            answerJson: sessionAnswers.answerJson,
            skipped: sessionAnswers.skipped,
          })
          .from(sessionAnswers)
          .where(eq(sessionAnswers.sessionId, sessionId)),
        tx
          .select({
            id: talkingPoints.id,
            content: talkingPoints.content,
            category: talkingPoints.category,
            isDiscussed: talkingPoints.isDiscussed,
            sortOrder: talkingPoints.sortOrder,
          })
          .from(talkingPoints)
          .where(eq(talkingPoints.sessionId, sessionId))
          .orderBy(asc(talkingPoints.sortOrder)),
        tx
          .select({
            id: privateNotes.id,
            content: privateNotes.content,
            category: privateNotes.category,
            authorId: privateNotes.authorId,
            keyVersion: privateNotes.keyVersion,
          })
          .from(privateNotes)
          .where(
            and(
              eq(privateNotes.sessionId, sessionId),
              eq(privateNotes.authorId, session.user.id)
            )
          ),
        tx
          .select({
            id: actionItems.id,
            title: actionItems.title,
            status: actionItems.status,
            dueDate: actionItems.dueDate,
            category: actionItems.category,
            assigneeId: actionItems.assigneeId,
          })
          .from(actionItems)
          .where(eq(actionItems.sessionId, sessionId)),
      ]);

      // Fetch assignee names for action items
      const assigneeIds = [
        ...new Set(actionItemRows.map((ai) => ai.assigneeId)),
      ];
      const assigneeMap = new Map<
        string,
        { firstName: string; lastName: string }
      >();
      if (assigneeIds.length > 0) {
        const assigneeRows = await tx
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
          })
          .from(users)
          .where(inArray(users.id, assigneeIds));
        for (const row of assigneeRows) {
          assigneeMap.set(row.id, {
            firstName: row.firstName,
            lastName: row.lastName,
          });
        }
      }

      // Decrypt private notes
      const decryptedNotes = privateNoteRows
        .map((note) => {
          try {
            const payload: EncryptedPayload = JSON.parse(note.content);
            const decrypted = decryptNote(payload, session.user.tenantId);
            return {
              id: note.id,
              content: decrypted,
              category: note.category,
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean) as Array<{
        id: string;
        content: string;
        category: string | null;
      }>;

      // Build answer map by questionId
      const answerMap = new Map(
        answers.map((a) => [
          a.questionId,
          {
            questionId: a.questionId,
            answerText: a.answerText,
            answerNumeric: a.answerNumeric ? Number(a.answerNumeric) : null,
            answerJson: a.answerJson,
            skipped: a.skipped,
          },
        ])
      );

      // Build categories from sections
      const sharedNotes = (sessionRecord.sharedNotes as Record<string, string>) ?? {};

      const categoriesData = sectionData.map((section) => {
        const sectionQuestions = questions
          .filter((q) => q.sectionId === section.id)
          .map((q) => ({
            id: q.id,
            questionText: q.questionText,
            answerType: q.answerType,
            isRequired: q.isRequired,
            helpText: q.helpText,
          }));

        // Collect answers as a plain object (Maps cannot be serialized to client)
        const sectionAnswers: Record<
          string,
          {
            questionId: string;
            answerText: string | null;
            answerNumeric: number | null;
            answerJson: unknown;
            skipped: boolean;
          }
        > = {};
        for (const q of sectionQuestions) {
          const answer = answerMap.get(q.id);
          if (answer) sectionAnswers[q.id] = answer;
        }

        const sectionTalkingPoints = talkingPointRows
          .filter((tp) => tp.category === section.name)
          .map((tp) => ({
            id: tp.id,
            content: tp.content,
            isDiscussed: tp.isDiscussed,
          }));

        const sectionActionItems = actionItemRows
          .filter((ai) => ai.category === section.name)
          .map((ai) => {
            const assignee = assigneeMap.get(ai.assigneeId);
            return {
              id: ai.id,
              title: ai.title,
              status: ai.status,
              dueDate: ai.dueDate,
              category: ai.category,
              assigneeName: assignee
                ? `${assignee.firstName} ${assignee.lastName}`
                : null,
            };
          });

        const sectionPrivateNotes = decryptedNotes.filter(
          (n) => n.category === section.name
        );

        return {
          name: section.name,
          questions: sectionQuestions,
          answers: sectionAnswers,
          sharedNotes: sharedNotes[section.name] ?? "",
          talkingPoints: sectionTalkingPoints,
          actionItems: sectionActionItems,
          privateNotes: sectionPrivateNotes,
        };
      });

      return {
        sessionNumber: sessionRecord.sessionNumber,
        scheduledAt: sessionRecord.scheduledAt.toISOString(),
        completedAt: sessionRecord.completedAt?.toISOString() ?? null,
        sessionScore: sessionRecord.sessionScore
          ? Number(sessionRecord.sessionScore)
          : null,
        durationMinutes: sessionRecord.durationMinutes,
        status: sessionRecord.status,
        categories: categoriesData,
        isManager,
        seriesId: series.id,
      };
    }
  );

  if ("error" in data) {
    if (data.error === "IN_PROGRESS") {
      redirect(`/wizard/${sessionId}`);
    }
    notFound();
  }

  return (
    <SessionSummaryView
      sessionNumber={data.sessionNumber}
      scheduledAt={data.scheduledAt}
      completedAt={data.completedAt}
      sessionScore={data.sessionScore}
      durationMinutes={data.durationMinutes}
      status={data.status}
      categories={data.categories}
      isManager={data.isManager}
      seriesId={data.seriesId}
    />
  );
}
