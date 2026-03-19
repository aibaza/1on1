import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { canManageSeries } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit/log";
import { createSeriesSchema } from "@/lib/validations/series";
import { scheduleSeriesNotifications } from "@/lib/notifications/scheduler";
import { meetingSeries, sessions, users, sessionAnswers, templateQuestions, talkingPoints } from "@/lib/db/schema";
import { eq, and, asc, sql, ne } from "drizzle-orm";
import { computeNextSessionDate } from "@/lib/utils/scheduling";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status");

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const conditions = [
          eq(meetingSeries.tenantId, session.user.tenantId),
        ];

        if (statusFilter) {
          conditions.push(
            eq(
              meetingSeries.status,
              statusFilter as "active" | "paused" | "archived"
            )
          );
        }

        // Role-based access control
        const userRole = session.user.role;
        const userId = session.user.id;

        if (userRole === "member") {
          conditions.push(eq(meetingSeries.reportId, userId));
        } else if (userRole === "manager") {
          conditions.push(
            sql`(${meetingSeries.managerId} = ${userId} OR ${meetingSeries.reportId} = ${userId})`
          );
        }
        // admin sees all -- no additional filter

        // Get all series with report info
        const seriesList = await tx
          .select({
            id: meetingSeries.id,
            managerId: meetingSeries.managerId,
            reportId: meetingSeries.reportId,
            cadence: meetingSeries.cadence,
            cadenceCustomDays: meetingSeries.cadenceCustomDays,
            defaultDurationMinutes: meetingSeries.defaultDurationMinutes,
            defaultTemplateId: meetingSeries.defaultTemplateId,
            preferredDay: meetingSeries.preferredDay,
            preferredTime: meetingSeries.preferredTime,
            status: meetingSeries.status,
            nextSessionAt: meetingSeries.nextSessionAt,
            createdAt: meetingSeries.createdAt,
            reportFirstName: users.firstName,
            reportLastName: users.lastName,
            reportAvatarUrl: users.avatarUrl,
          })
          .from(meetingSeries)
          .innerJoin(users, eq(meetingSeries.reportId, users.id))
          .where(and(...conditions))
          .orderBy(
            sql`CASE WHEN ${meetingSeries.nextSessionAt} IS NULL THEN 1 ELSE 0 END`,
            meetingSeries.nextSessionAt
          );

        // Get latest session for each series
        const seriesIds = seriesList.map((s) => s.id);
        if (seriesIds.length === 0) return [];

        const latestSessions = await tx
          .select({
            id: sessions.id,
            seriesId: sessions.seriesId,
            status: sessions.status,
            sessionNumber: sessions.sessionNumber,
            sessionScore: sessions.sessionScore,
            scheduledAt: sessions.scheduledAt,
          })
          .from(sessions)
          .where(
            sql`${sessions.seriesId} IN ${seriesIds} AND ${sessions.sessionNumber} = (
              SELECT MAX(s2.session_number) FROM "session" s2 WHERE s2.series_id = ${sessions.seriesId}
            )`
          );

        const latestSessionMap = new Map(
          latestSessions.map((s) => [s.seriesId, s])
        );

        // Fetch manager info for grouping
        const managerIds = [...new Set(seriesList.map((s) => s.managerId))];
        let managerMap = new Map<string, { id: string; firstName: string; lastName: string }>();
        if (managerIds.length > 0) {
          const managerUsers = await tx
            .select({
              id: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
            })
            .from(users)
            .where(sql`${users.id} IN ${managerIds}`);
          managerMap = new Map(managerUsers.map((u) => [u.id, u]));
        }

        // Fetch talking point counts for active (scheduled or in_progress) sessions
        const scheduledSessionIds = latestSessions
          .filter((s) => s.status === "scheduled" || s.status === "in_progress")
          .map((s) => s.id);

        const talkingPointCountMap = new Map<string, number>();
        if (scheduledSessionIds.length > 0) {
          const counts = await tx
            .select({
              sessionId: talkingPoints.sessionId,
              count: sql<number>`count(*)::int`,
            })
            .from(talkingPoints)
            .where(sql`${talkingPoints.sessionId} IN ${scheduledSessionIds}`)
            .groupBy(talkingPoints.sessionId);
          for (const c of counts) {
            talkingPointCountMap.set(c.sessionId, c.count);
          }
        }

        // Fetch AI assessment history and latest aiSummary (completed sessions ordered by session number)
        const scoreRows = await tx
          .select({
            seriesId: sessions.seriesId,
            aiAssessmentScore: sessions.aiAssessmentScore,
            aiSummary: sessions.aiSummary,
          })
          .from(sessions)
          .where(
            and(
              sql`${sessions.seriesId} IN ${seriesIds}`,
              eq(sessions.status, "completed"),
              sql`${sessions.aiAssessmentScore} IS NOT NULL`
            )
          )
          .orderBy(asc(sessions.sessionNumber));

        const assessmentHistoryMap = new Map<string, number[]>();
        const latestSummaryMap = new Map<string, { blurb: string; sentiment: string }>();
        for (const r of scoreRows) {
          const arr = assessmentHistoryMap.get(r.seriesId) ?? [];
          arr.push(r.aiAssessmentScore!);
          assessmentHistoryMap.set(r.seriesId, arr);
          if (r.aiSummary?.cardBlurb) {
            latestSummaryMap.set(r.seriesId, {
              blurb: r.aiSummary.cardBlurb,
              sentiment: r.aiSummary.overallSentiment,
            });
          }
        }

        // Fetch per-question numeric answer histories for weighted questions
        const questionRows = await tx
          .select({
            seriesId: sessions.seriesId,
            sessionNumber: sessions.sessionNumber,
            questionText: templateQuestions.questionText,
            scoreWeight: templateQuestions.scoreWeight,
            answerType: templateQuestions.answerType,
            answerNumeric: sessionAnswers.answerNumeric,
          })
          .from(sessionAnswers)
          .innerJoin(sessions, eq(sessionAnswers.sessionId, sessions.id))
          .innerJoin(templateQuestions, eq(sessionAnswers.questionId, templateQuestions.id))
          .where(
            and(
              sql`${sessions.seriesId} IN ${seriesIds}`,
              eq(sessions.status, "completed"),
              sql`CAST(${templateQuestions.scoreWeight} AS numeric) > 0.5`,
              sql`${templateQuestions.answerType} IN ('rating_1_5', 'rating_1_10', 'mood')`,
              sql`${sessionAnswers.answerNumeric} IS NOT NULL`
            )
          )
          .orderBy(asc(sessions.sessionNumber));

        const questionHistoriesMap = new Map<string, Map<string, { scoreWeight: number; values: number[] }>>();
        for (const r of questionRows) {
          let qMap = questionHistoriesMap.get(r.seriesId);
          if (!qMap) { qMap = new Map(); questionHistoriesMap.set(r.seriesId, qMap); }
          let entry = qMap.get(r.questionText);
          if (!entry) { entry = { scoreWeight: parseFloat(r.scoreWeight ?? "1"), values: [] }; qMap.set(r.questionText, entry); }
          const raw = parseFloat(r.answerNumeric!);
          const scaled = r.answerType === "rating_1_10" ? raw * 10 : raw * 20;
          entry.values.push(Math.min(100, scaled));
        }

        return seriesList.map((s) => {
          const latest = latestSessionMap.get(s.id);
          const qMap = questionHistoriesMap.get(s.id);
          const questionHistories = qMap
            ? Array.from(qMap.entries()).map(([questionText, { scoreWeight, values }]) => ({ questionText, scoreWeight, values }))
            : [];
          return {
            id: s.id,
            managerId: s.managerId,
            cadence: s.cadence,
            cadenceCustomDays: s.cadenceCustomDays,
            defaultDurationMinutes: s.defaultDurationMinutes,
            defaultTemplateId: s.defaultTemplateId,
            preferredDay: s.preferredDay,
            preferredTime: s.preferredTime,
            status: s.status,
            nextSessionAt: s.nextSessionAt?.toISOString() ?? null,
            createdAt: s.createdAt.toISOString(),
            manager: {
              id: s.managerId,
              firstName: managerMap.get(s.managerId)?.firstName ?? "",
              lastName: managerMap.get(s.managerId)?.lastName ?? "",
            },
            report: {
              id: s.reportId,
              firstName: s.reportFirstName,
              lastName: s.reportLastName,
              avatarUrl: s.reportAvatarUrl,
            },
            latestSession: latest
              ? {
                  id: latest.id,
                  status: latest.status,
                  sessionNumber: latest.sessionNumber,
                  sessionScore: latest.sessionScore,
                  scheduledAt: latest.scheduledAt?.toISOString() ?? null,
                  talkingPointCount: talkingPointCountMap.get(latest.id) ?? 0,
                }
              : null,
            latestSummary: latestSummaryMap.get(s.id) ?? null,
            assessmentHistory: assessmentHistoryMap.get(s.id) ?? [],
            questionHistories,
          };
        });
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch series:", error);
    return NextResponse.json(
      { error: "Failed to fetch series" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!canManageSeries(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const data = createSeriesSchema.parse(body);

    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Verify report is a direct report of the current user
        const report = await tx
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.id, data.reportId),
              eq(users.tenantId, session.user.tenantId),
              eq(users.isActive, true),
              eq(users.managerId, session.user.id)
            )
          )
          .limit(1);

        if (report.length === 0) {
          throw new Error("REPORT_NOT_FOUND");
        }

        // Check for existing non-archived series for same manager+report pair
        const existing = await tx
          .select({ id: meetingSeries.id })
          .from(meetingSeries)
          .where(
            and(
              eq(meetingSeries.tenantId, session.user.tenantId),
              eq(meetingSeries.managerId, session.user.id),
              eq(meetingSeries.reportId, data.reportId),
              ne(meetingSeries.status, "archived")
            )
          )
          .limit(1);

        if (existing.length > 0) {
          throw new Error("DUPLICATE_SERIES");
        }

        // Compute next session date
        const nextSessionAt = computeNextSessionDate(
          new Date(),
          data.cadence,
          data.cadenceCustomDays ?? null,
          data.preferredDay ?? null,
          true
        );

        const [series] = await tx
          .insert(meetingSeries)
          .values({
            tenantId: session.user.tenantId,
            managerId: session.user.id,
            reportId: data.reportId,
            cadence: data.cadence,
            cadenceCustomDays: data.cadenceCustomDays ?? null,
            defaultDurationMinutes: data.defaultDurationMinutes,
            defaultTemplateId: data.defaultTemplateId ?? null,
            preferredDay: data.preferredDay ?? null,
            preferredTime: data.preferredTime ?? null,
            nextSessionAt,
          })
          .returning();

        await logAuditEvent(tx, {
          tenantId: session.user.tenantId,
          actorId: session.user.id,
          action: "series_created",
          resourceType: "series",
          resourceId: series.id,
          metadata: {
            reportId: data.reportId,
            cadence: data.cadence,
          },
        });

        return series;
      }
    );

    // Schedule notifications for the first session (non-blocking)
    if (result.nextSessionAt) {
      // Fetch manager and report names for notification content
      const managerName = session.user.name || "Manager";
      const reportUser = await withTenantContext(
        session.user.tenantId,
        session.user.id,
        async (tx) => {
          const [u] = await tx
            .select({ firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(eq(users.id, data.reportId))
            .limit(1);
          return u;
        }
      );
      const reportName = reportUser
        ? `${reportUser.firstName} ${reportUser.lastName}`
        : "Report";

      scheduleSeriesNotifications({
        tenantId: session.user.tenantId,
        seriesId: result.id,
        managerId: session.user.id,
        reportId: data.reportId,
        nextSessionAt: result.nextSessionAt,
        reminderHoursBefore: 24,
        managerName,
        reportName,
      }).catch((err) =>
        console.error("Failed to schedule notifications for new series:", err)
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "REPORT_NOT_FOUND") {
        return NextResponse.json(
          { error: "Report user not found in your organization" },
          { status: 404 }
        );
      }
      if (error.message === "DUPLICATE_SERIES") {
        return NextResponse.json(
          { error: "An active series already exists for this manager-report pair" },
          { status: 409 }
        );
      }
      // DB unique constraint violation (e.g. RLS hid the existing row from our check)
      if ("code" in error && (error as Record<string, unknown>).code === "23505") {
        return NextResponse.json(
          { error: "An active series already exists for this manager-report pair" },
          { status: 409 }
        );
      }
      if (error.name === "ZodError") {
        return NextResponse.json(
          { error: "Invalid input", details: error },
          { status: 400 }
        );
      }
    }
    console.error("Failed to create series:", error);
    return NextResponse.json(
      { error: "Failed to create series" },
      { status: 500 }
    );
  }
}
