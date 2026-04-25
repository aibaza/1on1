import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { withTenantContext } from "@/lib/db/tenant-context";
import { canManageSeries } from "@/lib/auth/rbac";
import {
  users,
  questionnaireTemplates,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { EditorialSeriesForm } from "@/components/series/editorial-series-form";
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
            jobTitle: users.jobTitle,
            avatarUrl: users.avatarUrl,
            level: users.level,
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
    const teamLabel = t("noTeam");
    teamGroups.set(teamLabel, usersList);
  }

  const sortedGroups = [...teamGroups.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="mb-12">
        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-foreground mb-2">
          {t("newSeriesTitle")}
        </h1>
        <p className="text-muted-foreground text-lg">
          {t("newSeriesDesc")}
        </p>
      </header>

      <EditorialSeriesForm
        userGroups={sortedGroups}
        templates={templatesList}
      />
    </div>
  );
}
