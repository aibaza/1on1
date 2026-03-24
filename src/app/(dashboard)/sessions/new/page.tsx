import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { withTenantContext } from "@/lib/db/tenant-context";
import { canManageSeries } from "@/lib/auth/rbac";
import {
  users,
  questionnaireTemplates,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { SeriesForm } from "@/components/series/series-form";
import { getTranslations } from "next-intl/server";

export default async function NewSeriesPage() {
  const t = await getTranslations("sessions");
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!canManageSeries(session.user.level)) {
    redirect("/sessions");
  }

  const { usersList, templatesList } = await withTenantContext(
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

      return {
        usersList: userRows,
        templatesList: templateRows,
      };
    }
  );

  // Group users — all direct reports are in the manager's team
  const teamGroups = new Map<string, typeof usersList>();

  if (usersList.length > 0) {
    // All users fetched are direct reports of the current user
    const teamLabel = t("noTeam");
    teamGroups.set(teamLabel, usersList);
  }

  // Sort groups alphabetically
  const sortedGroups = [...teamGroups.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("newSeriesTitle")}
        </h1>
        <p className="text-muted-foreground">
          {t("newSeriesDesc")}
        </p>
      </div>

      <SeriesForm
        userGroups={sortedGroups}
        templates={templatesList}
      />
    </div>
  );
}
