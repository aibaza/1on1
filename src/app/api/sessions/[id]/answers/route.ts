import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { isSeriesParticipant, isAdmin } from "@/lib/auth/rbac";
import { answerUpsertSchema } from "@/lib/validations/session";
import {
  sessions,
  meetingSeries,
  sessionAnswers,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * PUT /api/sessions/[id]/answers
 *
 * Upserts a single answer for the auto-save pattern.
 * Uses onConflictDoUpdate on the UNIQUE(session_id, question_id) index.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: sessionId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const data = answerUpsertSchema.parse(body);

    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Fetch the session to get seriesId
        const sessionRows = await tx
          .select({
            id: sessions.id,
            seriesId: sessions.seriesId,
            status: sessions.status,
          })
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

        // Only allow answers on in_progress sessions
        if (sessionRecord.status !== "in_progress") {
          return { error: "SESSION_NOT_IN_PROGRESS" as const };
        }

        // Verify user is participant on the series
        const seriesRows = await tx
          .select({
            managerId: meetingSeries.managerId,
            reportId: meetingSeries.reportId,
          })
          .from(meetingSeries)
          .where(eq(meetingSeries.id, sessionRecord.seriesId))
          .limit(1);

        if (seriesRows.length === 0) {
          return { error: "NOT_FOUND" as const };
        }

        if (
          !isAdmin(session.user.level) &&
          !isSeriesParticipant(session.user.id, seriesRows[0])
        ) {
          return { error: "FORBIDDEN" as const };
        }

        // Upsert the answer
        const [answer] = await tx
          .insert(sessionAnswers)
          .values({
            sessionId,
            questionId: data.questionId,
            respondentId: session.user.id,
            answerText: data.answerText ?? null,
            answerNumeric: data.answerNumeric != null
              ? String(data.answerNumeric)
              : null,
            answerJson: data.answerJson ?? null,
            skipped: data.skipped ?? false,
          })
          .onConflictDoUpdate({
            target: [sessionAnswers.sessionId, sessionAnswers.questionId],
            set: {
              answerText: sql`excluded.answer_text`,
              answerNumeric: sql`excluded.answer_numeric`,
              answerJson: sql`excluded.answer_json`,
              skipped: sql`excluded.skipped`,
              answeredAt: sql`now()`,
            },
          })
          .returning();

        return {
          answer: {
            id: answer.id,
            questionId: answer.questionId,
            answerText: answer.answerText,
            answerNumeric: answer.answerNumeric
              ? Number(answer.answerNumeric)
              : null,
            answerJson: answer.answerJson,
            skipped: answer.skipped,
            answeredAt: answer.answeredAt.toISOString(),
          },
        };
      }
    );

    if ("error" in result && !("answer" in result)) {
      switch (result.error) {
        case "NOT_FOUND":
          return NextResponse.json(
            { error: "Session not found" },
            { status: 404 }
          );
        case "FORBIDDEN":
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        case "SESSION_NOT_IN_PROGRESS":
          return NextResponse.json(
            { error: "Session is not in progress" },
            { status: 409 }
          );
      }
    }

    return NextResponse.json(
      (result as { answer: unknown }).answer
    );
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to save answer:", error);
    return NextResponse.json(
      { error: "Failed to save answer" },
      { status: 500 }
    );
  }
}
