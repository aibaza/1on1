import { eq, and, isNull, sql } from "drizzle-orm";
import type { TransactionClient } from "@/lib/db/tenant-context";
import {
  sessions,
  sessionAnswers,
  templateQuestions,
  templateSections,
  analyticsSnapshots,
} from "@/lib/db/schema";
import {
  METRIC_NAMES,
  SCORABLE_ANSWER_TYPES,
} from "./constants";

/**
 * Normalize a numeric answer to a 1-5 scale.
 *
 * - rating_1_5: already on 1-5 scale, return as-is
 * - rating_1_10: map [1,10] -> [1,5] via linear transform
 * - mood: treated as 1-5 scale (mood enum maps to 1-5)
 * - scale_custom: assume 1-5 for now
 */
function normalizeScore(value: number, answerType: string): number {
  if (answerType === "rating_1_10") {
    return ((value - 1) / 9) * 4 + 1;
  }
  return value;
}

/**
 * Get the first day of the month for a given date.
 */
function monthStart(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Get the last day of the month for a given date.
 */
function monthEnd(date: Date): string {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;
}

/**
 * Compute and store analytics snapshot for a completed session.
 *
 * Fetches the session, its answers with question metadata, computes per-category
 * averages and overall session score, then upserts into analytics_snapshot.
 *
 * Uses delete-then-insert instead of onConflictDoUpdate because the unique index
 * has nullable columns (userId, teamId, seriesId) and PostgreSQL treats NULLs
 * as distinct in unique indexes.
 *
 * All operations run within the provided transaction for atomicity.
 */
export async function computeSessionSnapshot(
  tx: TransactionClient,
  sessionId: string,
  tenantId: string,
  reportId: string,
  seriesId: string,
): Promise<void> {
  // 1. Fetch session with score and completedAt
  const [session] = await tx
    .select({
      id: sessions.id,
      sessionScore: sessions.sessionScore,
      completedAt: sessions.completedAt,
    })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.tenantId, tenantId)))
    .limit(1);

  if (!session || !session.completedAt) {
    throw new Error(`Session ${sessionId} not found or not completed`);
  }

  // 2. Fetch answers joined with template questions and sections for category mapping
  const answers = await tx
    .select({
      answerNumeric: sessionAnswers.answerNumeric,
      answerType: templateQuestions.answerType,
      sectionName: templateSections.name,
      skipped: sessionAnswers.skipped,
    })
    .from(sessionAnswers)
    .innerJoin(
      templateQuestions,
      eq(sessionAnswers.questionId, templateQuestions.id),
    )
    .innerJoin(
      templateSections,
      eq(templateQuestions.sectionId, templateSections.id),
    )
    .where(eq(sessionAnswers.sessionId, sessionId));

  // 3. Compute per-category averages
  const categoryScores: Record<string, { sum: number; count: number }> = {};

  for (const answer of answers) {
    if (answer.skipped || answer.answerNumeric === null) continue;
    if (!SCORABLE_ANSWER_TYPES.has(answer.answerType)) continue;

    const category = answer.sectionName.trim();
    if (!category) continue;

    const value = parseFloat(answer.answerNumeric);
    if (isNaN(value)) continue;

    const normalized = normalizeScore(value, answer.answerType);

    if (!categoryScores[category]) {
      categoryScores[category] = { sum: 0, count: 0 };
    }
    categoryScores[category].sum += normalized;
    categoryScores[category].count += 1;
  }

  // 4. Determine period boundaries (monthly)
  const completedAt = session.completedAt;
  const periodStart = monthStart(completedAt);
  const periodEnd = monthEnd(completedAt);

  // 5. Build metric rows to upsert
  const metricRows: Array<{
    metricName: string;
    metricValue: string;
    sampleCount: number;
  }> = [];

  // Session score
  if (session.sessionScore !== null) {
    metricRows.push({
      metricName: METRIC_NAMES.SESSION_SCORE,
      metricValue: session.sessionScore,
      sampleCount: 1,
    });
  }

  // Per-category averages (use section name directly as metricName)
  for (const [category, data] of Object.entries(categoryScores)) {
    metricRows.push({
      metricName: category,
      metricValue: (data.sum / data.count).toFixed(3),
      sampleCount: data.count,
    });
  }

  // 6. Delete existing rows matching this key set (NULL-safe), then insert fresh
  for (const metric of metricRows) {
    await tx
      .delete(analyticsSnapshots)
      .where(
        and(
          eq(analyticsSnapshots.tenantId, tenantId),
          eq(analyticsSnapshots.userId, reportId),
          isNull(analyticsSnapshots.teamId),
          eq(analyticsSnapshots.seriesId, seriesId),
          eq(analyticsSnapshots.periodType, "month"),
          eq(analyticsSnapshots.periodStart, periodStart),
          eq(analyticsSnapshots.metricName, metric.metricName),
        ),
      );

    await tx.insert(analyticsSnapshots).values({
      tenantId,
      userId: reportId,
      teamId: null,
      seriesId,
      periodType: "month",
      periodStart,
      periodEnd,
      metricName: metric.metricName,
      metricValue: metric.metricValue,
      sampleCount: metric.sampleCount,
    });
  }

  // 7. Mark session as ingested
  await tx
    .update(sessions)
    .set({ analyticsIngestedAt: sql`now()` })
    .where(eq(sessions.id, sessionId));
}
