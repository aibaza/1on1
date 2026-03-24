import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { withTenantContext } from "@/lib/db/tenant-context";
import { users, inviteTokens } from "@/lib/db/schema";
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
          level: users.level,
          jobTitle: users.jobTitle,
          avatarUrl: users.avatarUrl,
          managerId: users.managerId,
          teamName: users.teamName,
          isActive: users.isActive,
          invitedAt: users.invitedAt,
          inviteAcceptedAt: users.inviteAcceptedAt,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.tenantId, session.user.tenantId))
        .orderBy(users.lastName, users.firstName);

      // Build maps for manager names and team names
      const userMap = new Map(
        allUsers.map((u) => [u.id, `${u.firstName} ${u.lastName}`])
      );
      const managerTeamNameMap = new Map(
        allUsers
          .filter((u) => u.teamName)
          .map((u) => [u.id, u.teamName!])
      );

      // Derive available teams list from managers with direct reports
      const managerSet = new Map<string, string>();
      for (const u of allUsers) {
        if (u.managerId && userMap.has(u.managerId)) {
          const teamName = managerTeamNameMap.get(u.managerId) ?? userMap.get(u.managerId)!;
          managerSet.set(u.managerId, teamName);
        }
      }
      const allTeams = Array.from(managerSet.entries())
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name));

      // Fetch pending invites (not accepted, not expired)
      const pendingInvites = await tx
        .select({
          id: inviteTokens.id,
          email: inviteTokens.email,
          level: inviteTokens.level,
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
        level: u.level,
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
        teamName: u.managerId ? (managerTeamNameMap.get(u.managerId) ?? userMap.get(u.managerId) ?? null) : null,
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
          level: inv.level,
          jobTitle: null,
          avatarUrl: null,
          managerId: null,
          managerName: null,
          isActive: false,
          status: "pending" as const,
          teamName: null,
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
          isAdmin={session.user.level === "admin"}
        />
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </div>
          {session.user.level === "admin" && <InviteButton />}
        </div>
      )}

      {isEditorial ? (
        <>
          <EditorialPeopleList
            initialData={data.users}
            currentUserLevel={session.user.level}
            currentUserId={session.user.id}
            availableTeams={data.teams}
          />
          {(session.user.level === "admin" || session.user.level === "manager") && (
            <TeamStructure users={data.users} currentUserId={session.user.id} currentUserLevel={session.user.level} />
          )}
        </>
      ) : (
        <PeopleTabs>
          <PeopleTable
            initialData={data.users}
            currentUserLevel={session.user.level}
            currentUserId={session.user.id}
            availableTeams={data.teams}
          />
        </PeopleTabs>
      )}
    </div>
  );
}
