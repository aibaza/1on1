import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { withTenantContext } from "@/lib/db/tenant-context";
import { users } from "@/lib/db/schema";
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

  const teams = await withTenantContext(
    session.user.tenantId,
    session.user.id,
    async (tx) => {
      // Derive teams from managers with direct reports
      const managersWithReports = await tx
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          avatarUrl: users.avatarUrl,
          teamName: users.teamName,
          memberCount: sql<number>`(SELECT COUNT(*) FROM "user" u2 WHERE u2.manager_id = ${users.id} AND u2.is_active = true AND u2.tenant_id = ${users.tenantId})::int`,
        })
        .from(users)
        .where(
          and(
            eq(users.tenantId, session.user.tenantId),
            eq(users.isActive, true),
            sql`EXISTS (SELECT 1 FROM "user" u2 WHERE u2.manager_id = ${users.id} AND u2.is_active = true AND u2.tenant_id = ${users.tenantId})`
          )
        )
        .orderBy(users.lastName, users.firstName);

      return managersWithReports.map((m) => ({
        managerId: m.id,
        teamName: m.teamName ?? `${m.firstName} ${m.lastName}`,
        managerName: `${m.firstName} ${m.lastName}`,
        managerAvatarUrl: m.avatarUrl,
        memberCount: m.memberCount,
      }));
    }
  );

  if (isEditorial) {
    return <EditorialTeamsGrid initialTeams={teams} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <PeopleTabs>
        <TeamsGrid initialTeams={teams} />
      </PeopleTabs>
    </div>
  );
}
