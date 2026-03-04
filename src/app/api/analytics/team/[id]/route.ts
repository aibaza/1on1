import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { teams, teamMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  getTeamAverages,
  getTeamHeatmapData,
} from "@/lib/analytics/queries";
import { periodToDateRange } from "@/lib/analytics/period";

/**
 * GET /api/analytics/team/[id]
 *
 * Returns team analytics data (aggregated scores + heatmap).
 * Query params:
 *   - period: preset string (30d, 3mo, 6mo, 1yr)
 *   - startDate, endDate: ISO date strings for custom range
 *   - anonymize: "true" to replace names with "Member N"
 *
 * Auth: user must be team lead, manager of team members, or admin.
 * Members cannot access team analytics.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: teamId } = await params;
  const { user } = session;

  // Members cannot access team analytics
  if (user.role === "member") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await withTenantContext(
      user.tenantId,
      user.id,
      async (tx) => {
        // Verify team exists
        const [team] = await tx
          .select({
            id: teams.id,
            name: teams.name,
            managerId: teams.managerId,
          })
          .from(teams)
          .where(eq(teams.id, teamId))
          .limit(1);

        if (!team) {
          return { error: "not_found" } as const;
        }

        // Authorization: manager must be team lead or admin
        if (user.role === "manager") {
          // Check if user is team manager
          if (team.managerId !== user.id) {
            // Check if user is a member with lead role
            const membership = await tx
              .select({ role: teamMembers.role })
              .from(teamMembers)
              .where(
                and(
                  eq(teamMembers.teamId, teamId),
                  eq(teamMembers.userId, user.id),
                ),
              )
              .limit(1);

            if (membership.length === 0 || membership[0]!.role !== "lead") {
              return { error: "forbidden" } as const;
            }
          }
        }

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

        // Count team members
        const members = await tx
          .select({ userId: teamMembers.userId })
          .from(teamMembers)
          .where(eq(teamMembers.teamId, teamId));

        // Fetch analytics in parallel
        const [teamAverages, heatmapData] = await Promise.all([
          getTeamAverages(tx, teamId, startDate, endDate),
          getTeamHeatmapData(tx, teamId, startDate, endDate, anonymize),
        ]);

        return {
          team: { id: team.id, name: team.name },
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
