import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { withTenantContext } from "@/lib/db/tenant-context";
import { teams, teamMembers, users } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { getDesignPreference } from "@/lib/design-preference.server";
import { PeopleTabs } from "@/components/people/people-tabs";
import { TeamsGrid } from "./teams-grid";
import { EditorialTeamsGrid } from "./editorial-teams-grid";

export default async function TeamsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("people");
  const designPref = await getDesignPreference();
  const isEditorial = designPref === "editorial";

  const data = await withTenantContext(
    session.user.tenantId,
    session.user.id,
    async (tx) => {
      // Fetch all teams with member counts
      const teamsWithCounts = await tx
        .select({
          id: teams.id,
          name: teams.name,
          description: teams.description,
          managerId: teams.managerId,
          createdAt: teams.createdAt,
          memberCount: sql<number>`cast(count(${teamMembers.id}) as int)`,
        })
        .from(teams)
        .leftJoin(teamMembers, eq(teamMembers.teamId, teams.id))
        .where(eq(teams.tenantId, session.user.tenantId))
        .groupBy(teams.id)
        .orderBy(teams.name);

      // Get manager info
      const managerIds = [
        ...new Set(
          teamsWithCounts
            .map((t) => t.managerId)
            .filter((id): id is string => id !== null)
        ),
      ];

      const managers =
        managerIds.length > 0
          ? await tx
              .select({
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
                avatarUrl: users.avatarUrl,
              })
              .from(users)
              .where(
                sql`${users.id} IN ${managerIds.length > 0 ? sql`(${sql.join(managerIds.map((id) => sql`${id}`), sql`, `)})` : sql`(NULL)`}`
              )
          : [];

      const managerMap = new Map(managers.map((m) => [m.id, m]));

      const teamList = teamsWithCounts.map((t) => {
        const manager = t.managerId ? managerMap.get(t.managerId) : null;
        return {
          id: t.id,
          name: t.name,
          description: t.description,
          managerId: t.managerId,
          managerName: manager
            ? `${manager.firstName} ${manager.lastName}`
            : null,
          managerAvatarUrl: manager?.avatarUrl ?? null,
          memberCount: t.memberCount,
          createdAt: t.createdAt.toISOString(),
        };
      });

      // Fetch all active users for team create dialog
      const allUsers = await tx
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(users)
        .where(and(eq(users.tenantId, session.user.tenantId), eq(users.isActive, true)))
        .orderBy(users.lastName, users.firstName);

      return { teams: teamList, users: allUsers };
    }
  );

  if (isEditorial) {
    return (
      <EditorialTeamsGrid
        initialTeams={data.teams}
        users={data.users}
        currentUserRole={session.user.role}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <PeopleTabs>
        <TeamsGrid
          initialTeams={data.teams}
          users={data.users}
          currentUserRole={session.user.role}
        />
      </PeopleTabs>
    </div>
  );
}
