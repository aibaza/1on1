import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { withTenantContext } from "@/lib/db/tenant-context";
import { canManageSeries } from "@/lib/auth/rbac";
import {
  users,
  questionnaireTemplates,
  teamMembers,
  teams,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { SeriesForm } from "@/components/series/series-form";

export default async function NewSeriesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!canManageSeries(session.user.role)) {
    redirect("/sessions");
  }

  const { usersList, templatesList, membershipsList } = await withTenantContext(
    session.user.tenantId,
    session.user.id,
    async (tx) => {
      const [userRows, templateRows] = await Promise.all([
        tx
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          })
          .from(users)
          .where(
            and(
              eq(users.tenantId, session.user.tenantId),
              eq(users.isActive, true),
              eq(users.managerId, session.user.id)
            )
          )
          .orderBy(users.lastName, users.firstName),
        tx
          .select({
            id: questionnaireTemplates.id,
            name: questionnaireTemplates.name,
          })
          .from(questionnaireTemplates)
          .where(
            and(
              eq(questionnaireTemplates.tenantId, session.user.tenantId),
              eq(questionnaireTemplates.isPublished, true),
              eq(questionnaireTemplates.isArchived, false)
            )
          )
          .orderBy(questionnaireTemplates.name),
      ]);

      // Fetch team memberships for these users
      const membershipRows = userRows.length > 0
        ? await tx
            .select({
              userId: teamMembers.userId,
              teamName: teams.name,
            })
            .from(teamMembers)
            .innerJoin(teams, eq(teamMembers.teamId, teams.id))
            .where(eq(teams.tenantId, session.user.tenantId))
        : [];

      return {
        usersList: userRows,
        templatesList: templateRows,
        membershipsList: membershipRows,
      };
    }
  );

  // Build a map of userId -> team names
  const userTeams = new Map<string, string[]>();
  const reportIds = new Set(usersList.map((u) => u.id));
  for (const m of membershipsList) {
    if (!reportIds.has(m.userId)) continue;
    const existing = userTeams.get(m.userId) ?? [];
    existing.push(m.teamName);
    userTeams.set(m.userId, existing);
  }

  // Group users by team for the select dropdown
  // Users can be in multiple teams — place them in each group
  // Users with no team go into "No Team"
  const teamGroups = new Map<string, typeof usersList>();
  const usersWithTeam = new Set<string>();

  for (const user of usersList) {
    const teamNames = userTeams.get(user.id);
    if (teamNames && teamNames.length > 0) {
      usersWithTeam.add(user.id);
      for (const teamName of teamNames) {
        const group = teamGroups.get(teamName) ?? [];
        group.push(user);
        teamGroups.set(teamName, group);
      }
    }
  }

  // Add users without any team
  const noTeamUsers = usersList.filter((u) => !usersWithTeam.has(u.id));
  if (noTeamUsers.length > 0) {
    teamGroups.set("No Team", noTeamUsers);
  }

  // Sort groups alphabetically, but put "No Team" last
  const sortedGroups = [...teamGroups.entries()].sort(([a], [b]) => {
    if (a === "No Team") return 1;
    if (b === "No Team") return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          New Meeting Series
        </h1>
        <p className="text-muted-foreground">
          Set up a recurring 1:1 meeting with a team member.
        </p>
      </div>

      <SeriesForm
        userGroups={sortedGroups}
        templates={templatesList}
      />
    </div>
  );
}
