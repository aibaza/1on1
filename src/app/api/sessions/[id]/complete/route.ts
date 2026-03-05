import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { logAuditEvent } from "@/lib/audit/log";
import { computeSessionScore } from "@/lib/utils/scoring";
import { computeNextSessionDate } from "@/lib/utils/scheduling";
import { runAIPipelineDirect } from "@/lib/ai/pipeline";
import { scheduleSeriesNotifications } from "@/lib/notifications/scheduler";
import {
  sessions,
  meetingSeries,
  sessionAnswers,
  templateQuestions,
  users,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * POST /api/sessions/[id]/complete
 *
 * Completes a session:
 * 1. Validates the user is the manager on the series
 * 2. Verifies session is in_progress
 * 3. Fetches all answers with their question answerType
 * 4. Computes session score (normalized average of numeric answers)
 * 5. Marks session as completed with score and duration
 * 6. Computes and sets next_session_at on the series
 * 7. Logs audit event
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

        // Verify session is in_progress
        if (sessionRecord.status !== "in_progress") {
          return { error: "INVALID_STATUS" as const };
        }

        // Fetch the series to verify manager and get cadence info
        const seriesRows = await tx
          .select()
          .from(meetingSeries)
          .where(eq(meetingSeries.id, sessionRecord.seriesId))
          .limit(1);

        if (seriesRows.length === 0) {
          return { error: "NOT_FOUND" as const };
        }

        const series = seriesRows[0];

        // Only the manager on the series can complete a session
        if (session.user.id !== series.managerId) {
          return { error: "FORBIDDEN" as const };
        }

        // Fetch all answers for this session with their question's answerType and weight
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

        // Compute session score with per-question weights
        const scoreInput = answersWithType.map((a) => ({
          answerType: a.answerType,
          answerNumeric: a.answerNumeric ? Number(a.answerNumeric) : null,
          skipped: a.skipped,
          scoreWeight: a.scoreWeight ? Number(a.scoreWeight) : 1,
        }));
        const sessionScore = computeSessionScore(scoreInput);

        // Compute duration in minutes
        const now = new Date();
        let durationMinutes: number | null = null;
        if (sessionRecord.startedAt) {
          durationMinutes = Math.round(
            (now.getTime() - sessionRecord.startedAt.getTime()) / 60000
          );
        }

        // Update session: mark completed with AI status pending
        await tx
          .update(sessions)
          .set({
            status: "completed",
            completedAt: now,
            sessionScore: sessionScore !== null ? String(sessionScore) : null,
            durationMinutes,
            aiStatus: "pending",
            updatedAt: now,
          })
          .where(eq(sessions.id, sessionId));

        // Compute next session date
        const nextSessionAt = computeNextSessionDate(
          now,
          series.cadence,
          series.cadenceCustomDays,
          series.preferredDay
        );

        // Update series: set next_session_at
        await tx
          .update(meetingSeries)
          .set({
            nextSessionAt,
            updatedAt: now,
          })
          .where(eq(meetingSeries.id, series.id));

        // Fetch manager and report names for notification scheduling
        const [managerUser] = await tx
          .select({ firstName: users.firstName, lastName: users.lastName })
          .from(users)
          .where(eq(users.id, series.managerId))
          .limit(1);
        const [reportUser] = await tx
          .select({ firstName: users.firstName, lastName: users.lastName })
          .from(users)
          .where(eq(users.id, series.reportId))
          .limit(1);

        const managerName = managerUser
          ? `${managerUser.firstName} ${managerUser.lastName}`
          : "Manager";
        const reportName = reportUser
          ? `${reportUser.firstName} ${reportUser.lastName}`
          : "Report";

        // Audit log
        await logAuditEvent(tx, {
          tenantId: session.user.tenantId,
          actorId: session.user.id,
          action: "session_completed",
          resourceType: "session",
          resourceId: sessionId,
          metadata: {
            sessionScore,
            sessionNumber: sessionRecord.sessionNumber,
            durationMinutes,
          },
        });

        return {
          sessionId,
          score: sessionScore,
          nextSessionAt: nextSessionAt.toISOString(),
          seriesId: series.id,
          managerId: series.managerId,
          reportId: series.reportId,
          managerName,
          reportName,
          reminderHoursBefore: series.reminderHoursBefore,
        };
      }
    );

    if ("error" in result) {
      switch (result.error) {
        case "NOT_FOUND":
          return NextResponse.json(
            { error: "Session not found" },
            { status: 404 }
          );
        case "INVALID_STATUS":
          return NextResponse.json(
            { error: "Session is not in progress" },
            { status: 400 }
          );
        case "FORBIDDEN":
          return NextResponse.json(
            { error: "Only the manager can complete a session" },
            { status: 403 }
          );
      }
    }

    // Fire-and-forget: run AI pipeline directly
    // Do NOT await -- session completion must never be blocked by AI
    runAIPipelineDirect({
      sessionId: result.sessionId,
      seriesId: result.seriesId,
      tenantId: session.user.tenantId,
      managerId: result.managerId,
      reportId: result.reportId,
    }).catch((err) =>
      console.error("Failed to run AI pipeline:", err)
    );

    // Schedule notifications for the next session (non-blocking)
    scheduleSeriesNotifications({
      tenantId: session.user.tenantId,
      seriesId: result.seriesId,
      managerId: result.managerId,
      reportId: result.reportId,
      nextSessionAt: new Date(result.nextSessionAt),
      reminderHoursBefore: result.reminderHoursBefore ?? 24,
      managerName: result.managerName,
      reportName: result.reportName,
    }).catch((err) =>
      console.error("Failed to schedule notifications:", err)
    );

    return NextResponse.json({
      sessionId: result.sessionId,
      score: result.score,
      nextSessionAt: result.nextSessionAt,
    });
  } catch (error) {
    console.error("Failed to complete session:", error);
    return NextResponse.json(
      { error: "Failed to complete session" },
      { status: 500 }
    );
  }
}
