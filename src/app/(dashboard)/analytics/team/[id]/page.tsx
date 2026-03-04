import { auth } from "@/lib/auth/config";
import { redirect, notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { withTenantContext } from "@/lib/db/tenant-context";
import { teams, teamMembers } from "@/lib/db/schema";
import {
  getTeamAverages,
  getTeamHeatmapData,
} from "@/lib/analytics/queries";
import { periodToDateRange } from "@/lib/analytics/period";
import { TeamAnalyticsClient } from "./client";

export default async function TeamAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id: teamId } = await params;
  const { user } = session;

  // Members cannot access team analytics
  if (user.role === "member") {
    redirect("/analytics");
  }

  const data = await withTenantContext(
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

      if (!team) return null;

      // Authorization: manager must be team lead or team manager
      if (user.role === "manager") {
        if (team.managerId !== user.id) {
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
            return null;
          }
        }
      }

      // Count members
      const members = await tx
        .select({ userId: teamMembers.userId })
        .from(teamMembers)
        .where(eq(teamMembers.teamId, teamId));

      // Default period: last 3 months
      const range = periodToDateRange("3mo");
      const startDate = range.startDate.toISOString().split("T")[0]!;
      const endDate = range.endDate.toISOString().split("T")[0]!;

      const [teamAverages, heatmapData] = await Promise.all([
        getTeamAverages(tx, teamId, startDate, endDate),
        getTeamHeatmapData(tx, teamId, startDate, endDate, false),
      ]);

      return {
        team: { id: team.id, name: team.name },
        memberCount: members.length,
        teamAverages,
        heatmapData,
      };
    },
  );

  if (!data) notFound();

  return (
    <TeamAnalyticsClient
      team={data.team}
      memberCount={data.memberCount}
      initialTeamAverages={data.teamAverages}
      initialHeatmapData={data.heatmapData}
      teamId={teamId}
    />
  );
}
