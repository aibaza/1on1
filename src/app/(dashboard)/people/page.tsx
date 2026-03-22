import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { withTenantContext } from "@/lib/db/tenant-context";
import { users, teams, teamMembers, inviteTokens } from "@/lib/db/schema";
import { eq, and, gt, isNull, sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { PeopleTabs } from "@/components/people/people-tabs";
import { PeopleTable } from "@/components/people/people-table";
import { EditorialPeopleList } from "@/components/people/editorial-people-list";
import { InviteButton } from "@/components/people/invite-button";
import { EditorialPeopleHeader } from "./editorial-people-header";
import { TeamStructure } from "@/components/people/team-structure";
import { getDesignPreference } from "@/lib/design-preference.server";
import type { UserRow } from "@/components/people/people-table-columns";

export default async function PeoplePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("people");

  const data = await withTenantContext(
    session.user.tenantId,
    session.user.id,
    async (tx) => {
      // Fetch all users in the tenant
      const allUsers = await tx
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: users.role,
          jobTitle: users.jobTitle,
          avatarUrl: users.avatarUrl,
          managerId: users.managerId,
          isActive: users.isActive,
          invitedAt: users.invitedAt,
          inviteAcceptedAt: users.inviteAcceptedAt,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.tenantId, session.user.tenantId))
        .orderBy(users.lastName, users.firstName);

      // Build a map of user ID -> name for manager names
      const userMap = new Map(
        allUsers.map((u) => [u.id, `${u.firstName} ${u.lastName}`])
      );

      // Fetch team memberships for all users
      const memberships = await tx
        .select({
          userId: teamMembers.userId,
          teamId: teams.id,
          teamName: teams.name,
        })
        .from(teamMembers)
        .innerJoin(teams, eq(teamMembers.teamId, teams.id))
        .where(eq(teams.tenantId, session.user.tenantId));

      // Group teams by user
      const userTeamsMap = new Map<string, { id: string; name: string }[]>();
      for (const m of memberships) {
        const existing = userTeamsMap.get(m.userId) ?? [];
        existing.push({ id: m.teamId, name: m.teamName });
        userTeamsMap.set(m.userId, existing);
      }

      // Get all unique teams for filter dropdown
      const allTeams = await tx
        .select({ id: teams.id, name: teams.name })
        .from(teams)
        .where(eq(teams.tenantId, session.user.tenantId))
        .orderBy(teams.name);

      // Fetch pending invites (not accepted, not expired)
      const pendingInvites = await tx
        .select({
          id: inviteTokens.id,
          email: inviteTokens.email,
          role: inviteTokens.role,
          invitedAt: inviteTokens.createdAt,
        })
        .from(inviteTokens)
        .where(
          and(
            eq(inviteTokens.tenantId, session.user.tenantId),
            isNull(inviteTokens.acceptedAt),
            gt(inviteTokens.expiresAt, sql`now()`)
          )
        );

      const existingEmails = new Set(allUsers.map((u) => u.email));

      // Map users to UserRow shape
      const userRows: UserRow[] = allUsers.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        role: u.role,
        jobTitle: u.jobTitle,
        avatarUrl: u.avatarUrl,
        managerId: u.managerId,
        managerName: u.managerId ? (userMap.get(u.managerId) ?? null) : null,
        isActive: u.isActive,
        status: !u.isActive
          ? ("deactivated" as const)
          : u.inviteAcceptedAt || !u.invitedAt
            ? ("active" as const)
            : ("pending" as const),
        teams: userTeamsMap.get(u.id) ?? [],
        invitedAt: u.invitedAt?.toISOString() ?? null,
        createdAt: u.createdAt.toISOString(),
      }));

      // Add pending invites that don't have user records yet
      const pendingRows: UserRow[] = pendingInvites
        .filter((inv) => !existingEmails.has(inv.email))
        .map((inv) => ({
          id: inv.id,
          firstName: "",
          lastName: "",
          email: inv.email,
          role: inv.role,
          jobTitle: null,
          avatarUrl: null,
          managerId: null,
          managerName: null,
          isActive: false,
          status: "pending" as const,
          teams: [],
          invitedAt: inv.invitedAt.toISOString(),
          createdAt: inv.invitedAt.toISOString(),
        }));

      return {
        users: [...userRows, ...pendingRows],
        teams: allTeams,
      };
    }
  );

  const designPref = await getDesignPreference();
  const isEditorial = designPref === "editorial";

  return (
    <div className={isEditorial ? "space-y-8" : "space-y-6"}>
      {isEditorial ? (
        <EditorialPeopleHeader
          memberCount={data.users.length}
          isAdmin={session.user.role === "admin"}
        />
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </div>
          {session.user.role === "admin" && <InviteButton />}
        </div>
      )}

      {isEditorial ? (
        <>
          <EditorialPeopleList
            initialData={data.users}
            currentUserRole={session.user.role}
            currentUserId={session.user.id}
            availableTeams={data.teams}
          />
          {(session.user.role === "admin" || session.user.role === "manager") && (
            <TeamStructure users={data.users} />
          )}
        </>
      ) : (
        <PeopleTabs>
          <PeopleTable
            initialData={data.users}
            currentUserRole={session.user.role}
            currentUserId={session.user.id}
            availableTeams={data.teams}
          />
        </PeopleTabs>
      )}
    </div>
  );
}
