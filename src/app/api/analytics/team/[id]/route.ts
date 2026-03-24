import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  getTeamAverages,
  getTeamHeatmapData,
} from "@/lib/analytics/queries";
import { periodToDateRange } from "@/lib/analytics/period";

/**
 * GET /api/analytics/team/[managerId]
 *
 * Returns team analytics data (aggregated scores + heatmap) for a manager's
 * direct reports (derived team).
 *
 * Query params:
 *   - period: preset string (30d, 3mo, 6mo, 1yr)
 *   - startDate, endDate: ISO date strings for custom range
 *   - anonymize: "true" to replace names with "Member N"
 *
 * Auth: user must be the manager or admin. Members cannot access.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: managerId } = await params;
  const { user } = session;

  // Members cannot access team analytics
  if (user.level === "member") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Managers can only view their own team
  if (user.level === "manager" && user.id !== managerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await withTenantContext(
      user.tenantId,
      user.id,
      async (tx) => {
        // Verify manager exists in tenant
        const [manager] = await tx
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            teamName: users.teamName,
          })
          .from(users)
          .where(
            and(eq(users.id, managerId), eq(users.tenantId, user.tenantId))
          )
          .limit(1);

        if (!manager) {
          return { error: "not_found" } as const;
        }

        // Count direct reports
        const members = await tx
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.managerId, managerId), eq(users.isActive, true)));

        // Parse query params
        const url = new URL(request.url);
        const period = url.searchParams.get("period") ?? "3mo";
        const customStart = url.searchParams.get("startDate");
        const customEnd = url.searchParams.get("endDate");
        const anonymize = url.searchParams.get("anonymize") === "true";

        let startDate: string;
        let endDate: string;

        if (customStart && customEnd) {
          startDate = customStart;
          endDate = customEnd;
        } else {
          const range = periodToDateRange(period);
          startDate = range.startDate.toISOString().split("T")[0]!;
          endDate = range.endDate.toISOString().split("T")[0]!;
        }

        // Fetch analytics in parallel
        const [teamAverages, heatmapData] = await Promise.all([
          getTeamAverages(tx, managerId, startDate, endDate, anonymize),
          getTeamHeatmapData(tx, managerId, startDate, endDate, anonymize),
        ]);

        const defaultName = `${manager.firstName} ${manager.lastName}`;
        return {
          team: {
            managerId: manager.id,
            name: manager.teamName ?? defaultName,
          },
          memberCount: members.length,
          teamAverages,
          heatmapData,
        };
      },
    );

    if ("error" in result) {
      if (result.error === "not_found") {
        return NextResponse.json({ error: "Team not found" }, { status: 404 });
      }
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[analytics/team] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
