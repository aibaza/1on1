import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { aiNudges, meetingSeries, users } from "@/lib/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

/**
 * GET /api/nudges
 *
 * Returns non-dismissed nudges for the current user's tenant.
 * Only returns nudges for series where the user is the manager
 * (nudges are manager-only per locked decision).
 *
 * Query params:
 * - seriesId: filter to a specific series (optional)
 * - upcoming: if "true", only return nudges for sessions in the next 7 days
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const seriesId = url.searchParams.get("seriesId");
    const upcoming = url.searchParams.get("upcoming") === "true";

    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Build conditions: non-dismissed + manager on series
        const conditions = [
          eq(aiNudges.isDismissed, false),
          eq(aiNudges.tenantId, session.user.tenantId),
          eq(meetingSeries.managerId, session.user.id),
        ];

        if (seriesId) {
          conditions.push(eq(aiNudges.seriesId, seriesId));
        }

        if (upcoming) {
          const in7Days = new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          );
          conditions.push(
            gte(aiNudges.targetSessionAt, new Date())
          );
          // targetSessionAt <= in7Days handled via raw SQL for precision
          conditions.push(
            sql`${aiNudges.targetSessionAt} <= ${in7Days}`
          );
        }

        const rows = await tx
          .select({
            id: aiNudges.id,
            content: aiNudges.content,
            reason: aiNudges.reason,
            priority: aiNudges.priority,
            seriesId: aiNudges.seriesId,
            targetSessionAt: aiNudges.targetSessionAt,
            isDismissed: aiNudges.isDismissed,
            reportFirstName: users.firstName,
            reportLastName: users.lastName,
          })
          .from(aiNudges)
          .innerJoin(
            meetingSeries,
            eq(aiNudges.seriesId, meetingSeries.id)
          )
          .innerJoin(users, eq(meetingSeries.reportId, users.id))
          .where(and(...conditions))
          .orderBy(
            // Priority ordering: high first, then medium, then low
            sql`CASE ${aiNudges.priority} WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END`,
            aiNudges.targetSessionAt
          );

        return rows.map((row) => ({
          id: row.id,
          content: row.content,
          reason: row.reason,
          priority: row.priority,
          seriesId: row.seriesId,
          reportName: `${row.reportFirstName} ${row.reportLastName}`,
          targetSessionAt: row.targetSessionAt?.toISOString() ?? null,
          isDismissed: row.isDismissed,
        }));
      }
    );

    return NextResponse.json({ nudges: result });
  } catch (error) {
    console.error("Failed to fetch nudges:", error);
    return NextResponse.json(
      { error: "Failed to fetch nudges" },
      { status: 500 }
    );
  }
}
