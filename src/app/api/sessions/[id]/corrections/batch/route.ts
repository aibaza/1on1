import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { eq, and, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { adminDb } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit/log";
import { computeSessionScore } from "@/lib/utils/scoring";
import { canCorrectSession } from "@/lib/auth/rbac";
import { batchCorrectionInputSchema } from "@/lib/validations/correction";
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
 * POST /api/sessions/[id]/corrections/batch
 *
 * Atomically corrects multiple session answers in a single transaction.
 * Mirrors the single correction route but operates on an array of answers.
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
    data = batchCorrectionInputSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Reject duplicate answerIds in batch
  const answerIds = data.corrections.map((c) => c.answerId);
  const uniqueIds = new Set(answerIds);
  if (uniqueIds.size !== answerIds.length) {
    return NextResponse.json(
      { error: "Duplicate answerId in batch" },
      { status: 400 }
    );
  }

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Load session record
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

        // Status check: only completed sessions can be corrected
        if (sessionRecord.status !== "completed") {
          return { error: "INVALID_STATUS" as const };
        }

        // Load series
        const seriesRows = await tx
          .select()
          .from(meetingSeries)
          .where(eq(meetingSeries.id, sessionRecord.seriesId))
          .limit(1);

        if (seriesRows.length === 0) {
          return { error: "NOT_FOUND" as const };
        }

        const series = seriesRows[0];

        // RBAC check
        if (!canCorrectSession(session.user.id, session.user.role, series)) {
          return { error: "FORBIDDEN" as const };
        }

        // Bulk-load all target answers
        const answerRows = await tx
          .select()
          .from(sessionAnswers)
          .where(
            and(
              inArray(sessionAnswers.id, answerIds),
              eq(sessionAnswers.sessionId, sessionId)
            )
          );

        // Verify all requested answers belong to this session
        if (answerRows.length !== answerIds.length) {
          return { error: "NOT_FOUND" as const };
        }

        const answerMap = new Map(answerRows.map((a) => [a.id, a]));

        // For each correction: snapshot + update
        for (const correction of data.corrections) {
          const answer = answerMap.get(correction.answerId);
          if (!answer) {
            return { error: "NOT_FOUND" as const };
          }

          // INSERT snapshot into sessionAnswerHistory
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

          // UPDATE sessionAnswers with new values
          await tx
            .update(sessionAnswers)
            .set({
              answerText: correction.newAnswerText ?? null,
              answerNumeric:
                correction.newAnswerNumeric != null
                  ? String(correction.newAnswerNumeric)
                  : null,
              answerJson: correction.newAnswerJson ?? null,
              skipped: correction.skipped ?? false,
              answeredAt: new Date(),
            })
            .where(eq(sessionAnswers.id, answer.id));
        }

        // Recompute session score from all answers
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

        // Update session score + invalidate analytics snapshot
        await tx
          .update(sessions)
          .set({
            sessionScore: newScore !== null ? String(newScore) : null,
            analyticsIngestedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(sessions.id, sessionId));

        // Single audit log entry for the batch
        await logAuditEvent(tx, {
          tenantId: session.user.tenantId,
          actorId: session.user.id,
          action: "session.answers_batch_corrected",
          resourceType: "session",
          resourceId: sessionId,
          metadata: {
            correctionCount: data.corrections.length,
            answerIds,
            reason: data.reason,
            newScore,
          },
        });

        return {
          sessionId,
          newScore,
          correctionCount: data.corrections.length,
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

    // Fire-and-forget: send correction notification emails
    (async () => {
      const tenantId = session.user.tenantId;

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
          .where(and(eq(users.tenantId, tenantId), eq(users.role, "admin"), eq(users.isActive, true))),
      ]);

      if (!reportRow[0] || !managerRow[0]) {
        console.error("[corrections/batch] Could not resolve report/manager for email — skipping");
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
      console.error("[corrections/batch] Failed to send correction notification emails:", err)
    );

    return NextResponse.json({
      sessionId: result.sessionId,
      newScore: result.newScore,
      correctionCount: result.correctionCount,
    });
  } catch (error) {
    console.error("Failed to apply batch session corrections:", error);
    return NextResponse.json(
      { error: "Failed to apply corrections" },
      { status: 500 }
    );
  }
}
