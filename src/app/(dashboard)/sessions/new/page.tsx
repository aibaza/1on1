import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { withTenantContext } from "@/lib/db/tenant-context";
import { canManageSeries } from "@/lib/auth/rbac";
import { users, questionnaireTemplates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { SeriesForm } from "@/components/series/series-form";

export default async function NewSeriesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!canManageSeries(session.user.role)) {
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
              eq(users.isActive, true)
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

      return { usersList: userRows, templatesList: templateRows };
    }
  );

  // Filter out the current user from the report selection (you don't have 1:1s with yourself)
  const availableReports = usersList.filter(
    (u) => u.id !== session.user.id
  );

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

      <SeriesForm users={availableReports} templates={templatesList} />
    </div>
  );
}
