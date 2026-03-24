import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { logAuditEvent } from "@/lib/audit/log";
import { computeSessionScore } from "@/lib/utils/scoring";
import { isAdmin } from "@/lib/auth/rbac";
import {
  sessions,
  sessionAnswers,
  sessionAnswerHistory,
  templateQuestions,
} from "@/lib/db/schema";

const revertInputSchema = z.object({
  historyId: z.string().uuid("historyId must be a valid UUID"),
});

/**
 * POST /api/sessions/[id]/corrections/revert
 *
 * Admin-only: reverts a session answer to its pre-correction state.
 * 1. Auth check — 401 if not authenticated, 403 if not admin
 * 2. Parse body — 400 if historyId missing/invalid UUID
 * 3. Load history entry (must belong to this session + tenant) — 404 if not found
 * 4. Load session — must be completed — 409 if not
 * 5. Load current sessionAnswers row
 * 6. INSERT new history row (snapshot current state, reason = "Reverted by admin")
 * 7. UPDATE sessionAnswers with history.original* values
 * 8. Recompute score
 * 9. UPDATE sessions with new score + null analyticsIngestedAt
 * 10. Audit log
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!isAdmin(session.user.level)) {
    return NextResponse.json(
      { error: "Only admins can revert corrections" },
      { status: 403 }
    );
  }

  const { id: sessionId } = await params;

  let data: { historyId: string };
  try {
    const body = await request.json();
    data = revertInputSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // 3. Load history entry — must belong to this session + tenant
        const historyRows = await tx
          .select()
          .from(sessionAnswerHistory)
          .where(
            and(
              eq(sessionAnswerHistory.id, data.historyId),
              eq(sessionAnswerHistory.sessionId, sessionId),
              eq(sessionAnswerHistory.tenantId, session.user.tenantId)
            )
          )
          .limit(1);

        if (historyRows.length === 0) {
          return { error: "NOT_FOUND" as const };
        }

        const historyEntry = historyRows[0];

        // 4. Load session — must be completed
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

        if (sessionRecord.status !== "completed") {
          return { error: "INVALID_STATUS" as const };
        }

        // 5. Load current sessionAnswers row
        const answerRows = await tx
          .select()
          .from(sessionAnswers)
          .where(
            and(
              eq(sessionAnswers.id, historyEntry.sessionAnswerId),
              eq(sessionAnswers.sessionId, sessionId)
            )
          )
          .limit(1);

        if (answerRows.length === 0) {
          return { error: "NOT_FOUND" as const };
        }

        const currentAnswer = answerRows[0];

        // 6. INSERT new history row — snapshot current state before revert
        await tx.insert(sessionAnswerHistory).values({
          sessionAnswerId: currentAnswer.id,
          sessionId,
          tenantId: session.user.tenantId,
          correctedById: session.user.id,
          originalAnswerText: currentAnswer.answerText,
          originalAnswerNumeric: currentAnswer.answerNumeric,
          originalAnswerJson: currentAnswer.answerJson,
          originalSkipped: currentAnswer.skipped,
          correctionReason: "Reverted by admin",
        });

        // 7. UPDATE sessionAnswers with history original values
        await tx
          .update(sessionAnswers)
          .set({
            answerText: historyEntry.originalAnswerText,
            answerNumeric: historyEntry.originalAnswerNumeric,
            answerJson: historyEntry.originalAnswerJson,
            skipped: historyEntry.originalSkipped,
            answeredAt: new Date(),
          })
          .where(eq(sessionAnswers.id, currentAnswer.id));

        // 8. Recompute session score
        const answersWithType = await tx
          .select({
            answerNumeric: sessionAnswers.answerNumeric,
            skipped: sessionAnswers.skipped,
            answerType: templateQuestions.answerType,
            scoreWeight: templateQuestions.scoreWeight,
          })
          .from(sessionAnswers)
          .innerJoin(
            templateQuestions,
            eq(sessionAnswers.questionId, templateQuestions.id)
          )
          .where(eq(sessionAnswers.sessionId, sessionId));

        const newScore = computeSessionScore(
          answersWithType.map((a) => ({
            answerType: a.answerType,
            answerNumeric: a.answerNumeric ? Number(a.answerNumeric) : null,
            skipped: a.skipped,
            scoreWeight: a.scoreWeight ? Number(a.scoreWeight) : 1,
          }))
        );

        // 9. UPDATE session with new score + null analyticsIngestedAt
        await tx
          .update(sessions)
          .set({
            sessionScore: newScore !== null ? String(newScore) : null,
            analyticsIngestedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(sessions.id, sessionId));

        // 10. Audit log
        await logAuditEvent(tx, {
          tenantId: session.user.tenantId,
          actorId: session.user.id,
          action: "session.correction_reverted",
          resourceType: "session",
          resourceId: sessionId,
          metadata: {
            historyId: data.historyId,
            answerId: historyEntry.sessionAnswerId,
          },
        });

        return { sessionId, newScore };
      }
    );

    if ("error" in result) {
      switch (result.error) {
        case "NOT_FOUND":
          return NextResponse.json(
            { error: "Session or history entry not found" },
            { status: 404 }
          );
        case "INVALID_STATUS":
          return NextResponse.json(
            { error: "Session is not completed — only completed sessions can be reverted" },
            { status: 409 }
          );
      }
    }

    return NextResponse.json({
      sessionId: result.sessionId,
      newScore: result.newScore,
    });
  } catch (error) {
    console.error("Failed to revert session correction:", error);
    return NextResponse.json(
      { error: "Failed to revert correction" },
      { status: 500 }
    );
  }
}
