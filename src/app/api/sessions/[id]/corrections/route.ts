import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { adminDb } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit/log";
import { computeSessionScore } from "@/lib/utils/scoring";
import { canCorrectSession } from "@/lib/auth/rbac";
import { correctionInputSchema } from "@/lib/validations/correction";
import { sendCorrectionEmails } from "@/lib/notifications/correction-email";
import {
  sessions,
  meetingSeries,
  sessionAnswers,
  sessionAnswerHistory,
  templateQuestions,
  users,
  tenants,
} from "@/lib/db/schema";

/**
 * POST /api/sessions/[id]/corrections
 *
 * Atomically corrects a session answer:
 * 1. Validates auth and request body
 * 2. Inside a single transaction:
 *    a. Loads session (must be completed)
 *    b. Loads series and checks RBAC (manager must own the series)
 *    c. Loads the answer (must belong to this session)
 *    d. Snapshots original answer into session_answer_history
 *    e. Updates the session_answer with new values
 *    f. Recomputes session score from all answers
 *    g. Updates session with new score and nullifies analyticsIngestedAt
 *    h. Writes audit log
 * 3. Returns { sessionId, newScore }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: sessionId } = await params;

  let data;
  try {
    const body = await request.json();
    data = correctionInputSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // a. Load session record
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

        // b. Status check: only completed sessions can be corrected
        if (sessionRecord.status !== "completed") {
          return { error: "INVALID_STATUS" as const };
        }

        // c. Load series
        const seriesRows = await tx
          .select()
          .from(meetingSeries)
          .where(eq(meetingSeries.id, sessionRecord.seriesId))
          .limit(1);

        if (seriesRows.length === 0) {
          return { error: "NOT_FOUND" as const };
        }

        const series = seriesRows[0];

        // d. RBAC check: admin can correct any, manager can only correct their own series
        if (!canCorrectSession(session.user.id, session.user.level, series)) {
          return { error: "FORBIDDEN" as const };
        }

        // e. Load the answer — must belong to this session
        const answerRows = await tx
          .select()
          .from(sessionAnswers)
          .where(
            and(
              eq(sessionAnswers.id, data.answerId),
              eq(sessionAnswers.sessionId, sessionId)
            )
          )
          .limit(1);

        if (answerRows.length === 0) {
          return { error: "NOT_FOUND" as const };
        }

        const answer = answerRows[0];

        // f. Answer ownership check (belt-and-suspenders)
        if (answer.sessionId !== sessionId) {
          return { error: "NOT_FOUND" as const };
        }

        // g. INSERT into sessionAnswerHistory (snapshot of original values)
        await tx.insert(sessionAnswerHistory).values({
          sessionAnswerId: answer.id,
          sessionId,
          tenantId: session.user.tenantId,
          correctedById: session.user.id,
          originalAnswerText: answer.answerText,
          originalAnswerNumeric: answer.answerNumeric,
          originalAnswerJson: answer.answerJson,
          originalSkipped: answer.skipped,
          correctionReason: data.reason,
        });

        // h. UPDATE sessionAnswers with new values
        await tx
          .update(sessionAnswers)
          .set({
            answerText: data.newAnswerText ?? null,
            answerNumeric:
              data.newAnswerNumeric != null
                ? String(data.newAnswerNumeric)
                : null,
            answerJson: data.newAnswerJson ?? null,
            skipped: data.skipped ?? false,
            answeredAt: new Date(),
          })
          .where(eq(sessionAnswers.id, answer.id));

        // i. SELECT all answers for session with their question type and weight
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

        // j. Recompute session score
        const newScore = computeSessionScore(
          answersWithType.map((a) => ({
            answerType: a.answerType,
            answerNumeric: a.answerNumeric ? Number(a.answerNumeric) : null,
            skipped: a.skipped,
            scoreWeight: a.scoreWeight ? Number(a.scoreWeight) : 1,
          }))
        );

        // k. UPDATE session: new score + invalidate analytics snapshot
        await tx
          .update(sessions)
          .set({
            sessionScore: newScore !== null ? String(newScore) : null,
            analyticsIngestedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(sessions.id, sessionId));

        // l. Audit log
        await logAuditEvent(tx, {
          tenantId: session.user.tenantId,
          actorId: session.user.id,
          action: "session.answer_corrected",
          resourceType: "session",
          resourceId: sessionId,
          metadata: {
            answerId: answer.id,
            questionId: answer.questionId,
            reason: data.reason,
            newScore,
          },
        });

        return {
          sessionId,
          newScore,
          reportId: series.reportId,
          managerId: series.managerId,
          sessionNumber: sessionRecord.sessionNumber,
        };
      }
    );

    if ("error" in result) {
      switch (result.error) {
        case "NOT_FOUND":
          return NextResponse.json(
            { error: "Session or answer not found" },
            { status: 404 }
          );
        case "INVALID_STATUS":
          return NextResponse.json(
            { error: "Session is not completed — only completed sessions can be corrected" },
            { status: 409 }
          );
        case "FORBIDDEN":
          return NextResponse.json(
            { error: "Not authorized to correct this session" },
            { status: 403 }
          );
      }
    }

    // Fire-and-forget: resolve email context then send correction notification emails
    (async () => {
      const tenantId = session.user.tenantId;

      // Fetch report user, manager user, active admins, and tenant locale
      const [reportRow, managerRow, tenantRow, adminRows] = await Promise.all([
        adminDb
          .select({ id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName, isActive: users.isActive })
          .from(users)
          .where(and(eq(users.id, result.reportId), eq(users.tenantId, tenantId)))
          .limit(1),
        adminDb
          .select({ id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName, isActive: users.isActive })
          .from(users)
          .where(and(eq(users.id, result.managerId), eq(users.tenantId, tenantId)))
          .limit(1),
        adminDb
          .select({ contentLanguage: tenants.contentLanguage })
          .from(tenants)
          .where(eq(tenants.id, tenantId))
          .limit(1),
        adminDb
          .select({ id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName, isActive: users.isActive })
          .from(users)
          .where(and(eq(users.tenantId, tenantId), eq(users.level, "admin"), eq(users.isActive, true))),
      ]);

      if (!reportRow[0] || !managerRow[0]) {
        console.error("[corrections] Could not resolve report/manager for email — skipping");
        return;
      }

      const locale = tenantRow[0]?.contentLanguage ?? "en";
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const sessionUrl = `${baseUrl}/sessions/${result.sessionId}`;

      await sendCorrectionEmails({
        tenantId,
        sessionId: result.sessionId,
        sessionNumber: result.sessionNumber,
        reportUser: reportRow[0],
        managerUser: managerRow[0],
        activeAdmins: adminRows,
        sessionUrl,
        locale,
      });
    })().catch((err) =>
      console.error("[corrections] Failed to send correction notification emails:", err)
    );

    return NextResponse.json({
      sessionId: result.sessionId,
      newScore: result.newScore,
    });
  } catch (error) {
    console.error("Failed to apply session correction:", error);
    return NextResponse.json(
      { error: "Failed to apply correction" },
      { status: 500 }
    );
  }
}
