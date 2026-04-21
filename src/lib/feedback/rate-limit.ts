import "server-only";
import { sql } from "drizzle-orm";
import { adminDb } from "@/lib/db";
import { feedbackReports } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";

/**
 * Throws `new Error("RATE_LIMITED")` when the user has already created
 * 5 or more feedback reports in the past hour.
 */
export async function assertUnderReportLimit(userId: string): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const rows = await adminDb
    .select({ count: sql<number>`count(*)::int` })
    .from(feedbackReports)
    .where(
      and(
        eq(feedbackReports.userId, userId),
        gt(feedbackReports.createdAt, oneHourAgo)
      )
    );

  const count = rows[0]?.count ?? 0;
  if (count >= 5) {
    throw new Error("RATE_LIMITED");
  }
}
