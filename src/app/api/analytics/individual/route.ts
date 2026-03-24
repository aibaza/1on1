import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import {
  withTenantContext,
  type TransactionClient,
} from "@/lib/db/tenant-context";
import { sessions, meetingSeries, actionItems, users } from "@/lib/db/schema";
import { eq, and, or, sql, desc, inArray } from "drizzle-orm";

/**
 * GET /api/analytics/individual?userId=UUID
 *
 * Returns detailed analytics for a single person: score history,
 * action-item stats, streak, and trend.
 *
 * Auth:
 *  - Admin: any user in the tenant
 *  - Manager: themselves or their direct reports (series.managerId = currentUser)
 *  - Member: themselves only
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "Missing required query parameter: userId" },
      { status: 400 },
    );
  }

  const { user } = session;

  try {
    const result = await withTenantContext(
      user.tenantId,
      user.id,
      async (tx) => {
        // ── 1. Validate user exists in same tenant & get info ──────────
        const [targetUser] = await tx
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            jobTitle: users.jobTitle,
            avatarUrl: users.avatarUrl,
            level: users.level,
          })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (!targetUser) {
          return { error: "not_found" } as const;
        }

        // ── Authorization ──────────────────────────────────────────────
        if (user.level === "member" && user.id !== userId) {
          return { error: "forbidden" } as const;
        }

        if (user.level === "manager" && user.id !== userId) {
          const series = await tx
            .select({ id: meetingSeries.id })
            .from(meetingSeries)
            .where(
              and(
                eq(meetingSeries.managerId, user.id),
                eq(meetingSeries.reportId, userId),
              ),
            )
            .limit(1);

          if (series.length === 0) {
            return { error: "forbidden" } as const;
          }
        }

        // ── 2. Find series where user is the report ────────────────────
        const reportSeries = await tx
          .select({ id: meetingSeries.id })
          .from(meetingSeries)
          .where(eq(meetingSeries.reportId, userId));

        const seriesIds = reportSeries.map((s) => s.id);

        // ── Empty state: no series means no sessions ───────────────────
        if (seriesIds.length === 0) {
          // Still need action items (could be assigned outside sessions)
          const actionStats = await getActionItemStats(tx, userId);
          const openItems = await getOpenActionItems(tx, userId);

          return {
            user: targetUser,
            currentScore: null,
            avgScore: null,
            trend: 0,
            totalSessions: 0,
            scoreHistory: [],
            actionItems: actionStats,
            openActionItems: openItems,
            streak: 0,
          };
        }

        // ── 3. Fetch all completed sessions for this report ────────────
        const completedSessions = await tx
          .select({
            id: sessions.id,
            sessionNumber: sessions.sessionNumber,
            sessionScore: sessions.sessionScore,
            completedAt: sessions.completedAt,
            durationMinutes: sessions.durationMinutes,
            aiSummary: sessions.aiSummary,
          })
          .from(sessions)
          .where(
            and(
              inArray(sessions.seriesId, seriesIds),
              eq(sessions.status, "completed"),
            ),
          )
          .orderBy(desc(sessions.completedAt));

        const totalSessions = completedSessions.length;

        // ── 4. currentScore ────────────────────────────────────────────
        const currentScore =
          totalSessions > 0 && completedSessions[0]!.sessionScore != null
            ? Number(completedSessions[0]!.sessionScore)
            : null;

        // ── 5. avgScore ────────────────────────────────────────────────
        const scores = completedSessions
          .map((s) => (s.sessionScore != null ? Number(s.sessionScore) : null))
          .filter((v): v is number => v !== null);

        const avgScore =
          scores.length > 0
            ? Math.round(
                (scores.reduce((a, b) => a + b, 0) / scores.length) * 100,
              ) / 100
            : null;

        // ── 6. trend (90-day window) ───────────────────────────────────
        const now = new Date();
        const d90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        const d180 = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

        const currentPeriodScores: number[] = [];
        const previousPeriodScores: number[] = [];

        for (const s of completedSessions) {
          if (!s.completedAt || s.sessionScore == null) continue;
          const t = new Date(s.completedAt).getTime();
          const score = Number(s.sessionScore);
          if (t >= d90.getTime()) {
            currentPeriodScores.push(score);
          } else if (t >= d180.getTime()) {
            previousPeriodScores.push(score);
          }
        }

        const avg = (arr: number[]) =>
          arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

        const currentAvg = avg(currentPeriodScores);
        const previousAvg = avg(previousPeriodScores);

        const trend =
          currentAvg !== null && previousAvg !== null
            ? Math.round((currentAvg - previousAvg) * 100) / 100
            : 0;

        // ── 7. scoreHistory (last 10, chronological) ───────────────────
        const last10 = completedSessions.slice(0, 10).reverse();
        const scoreHistory = last10.map((s) => {
          const summary = s.aiSummary as {
            cardBlurb?: string;
            overallSentiment?: string;
          } | null;
          return {
            sessionId: s.id,
            sessionNumber: s.sessionNumber,
            score: s.sessionScore != null ? Number(s.sessionScore) : 0,
            date: s.completedAt
              ? new Date(s.completedAt).toISOString()
              : new Date().toISOString(),
            durationMinutes: s.durationMinutes,
            aiSnippet: summary?.cardBlurb ?? null,
          };
        });

        // ── 8 & 9. Action items ────────────────────────────────────────
        const [actionStats, openItems] = await Promise.all([
          getActionItemStats(tx, userId),
          getOpenActionItems(tx, userId),
        ]);

        // ── 10. Streak ─────────────────────────────────────────────────
        let streak = 0;
        const maxGapMs = 21 * 24 * 60 * 60 * 1000; // 21 days

        for (let i = 0; i < completedSessions.length; i++) {
          const s = completedSessions[i]!;
          if (!s.completedAt) break;

          if (i === 0) {
            streak = 1;
            continue;
          }

          const prev = completedSessions[i - 1]!;
          if (!prev.completedAt) break;

          const gap =
            new Date(prev.completedAt).getTime() -
            new Date(s.completedAt).getTime();

          if (gap <= maxGapMs) {
            streak++;
          } else {
            break;
          }
        }

        return {
          user: targetUser,
          currentScore,
          avgScore,
          trend,
          totalSessions,
          scoreHistory,
          actionItems: actionStats,
          openActionItems: openItems,
          streak,
        };
      },
    );

    if ("error" in result) {
      if (result.error === "forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (result.error === "not_found") {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[analytics/individual] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ── Helper: action item stats ────────────────────────────────────────────────

async function getActionItemStats(tx: TransactionClient, userId: string) {
  const today = new Date().toISOString().split("T")[0]!;

  const rows = await tx
    .select({
      status: actionItems.status,
      dueDate: actionItems.dueDate,
    })
    .from(actionItems)
    .where(eq(actionItems.assigneeId, userId));

  // Exclude cancelled
  const nonCancelled = rows.filter((r) => r.status !== "cancelled");
  const total = nonCancelled.length;
  const completed = nonCancelled.filter(
    (r) => r.status === "completed",
  ).length;
  const open = nonCancelled.filter(
    (r) => r.status === "open" || r.status === "in_progress",
  ).length;
  const overdue = nonCancelled.filter(
    (r) =>
      (r.status === "open" || r.status === "in_progress") &&
      r.dueDate != null &&
      r.dueDate < today,
  ).length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, open, overdue, completionRate };
}

// ── Helper: open action items list ───────────────────────────────────────────

async function getOpenActionItems(tx: TransactionClient, userId: string) {
  const rows = await tx
    .select({
      id: actionItems.id,
      title: actionItems.title,
      dueDate: actionItems.dueDate,
      sessionId: actionItems.sessionId,
    })
    .from(actionItems)
    .where(
      and(
        eq(actionItems.assigneeId, userId),
        or(
          eq(actionItems.status, "open"),
          eq(actionItems.status, "in_progress"),
        ),
      ),
    )
    .orderBy(sql`${actionItems.dueDate} ASC NULLS LAST`)
    .limit(10);

  // Get session numbers for these items
  if (rows.length === 0) return [];

  const sessionIds = [...new Set(rows.map((r) => r.sessionId))];
  const sessionRows = await tx
    .select({
      id: sessions.id,
      sessionNumber: sessions.sessionNumber,
    })
    .from(sessions)
    .where(inArray(sessions.id, sessionIds));

  const sessionMap = new Map(sessionRows.map((s) => [s.id, s.sessionNumber]));

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    dueDate: r.dueDate,
    sessionNumber: sessionMap.get(r.sessionId) ?? 0,
  }));
}
