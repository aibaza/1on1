import { auth } from "@/lib/auth/config";
import { redirect, notFound } from "next/navigation";
import { withTenantContext } from "@/lib/db/tenant-context";
import { canManageSeries } from "@/lib/auth/rbac";
import { meetingSeries, users, questionnaireTemplates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { EditorialSeriesForm } from "@/components/series/editorial-series-form";
import { getTranslations } from "next-intl/server";

export default async function EditSeriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations("sessions");
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!canManageSeries(session.user.level)) {
    redirect("/sessions");
  }

  const { id } = await params;

  const data = await withTenantContext(
    session.user.tenantId,
    session.user.id,
    async (tx) => {
      const [series] = await tx
        .select()
        .from(meetingSeries)
        .where(
          and(
            eq(meetingSeries.id, id),
            eq(meetingSeries.tenantId, session.user.tenantId)
          )
        )
        .limit(1);

      if (!series) return null;

      // Only the manager of the series can edit
      if (series.managerId !== session.user.id && session.user.level !== "admin") {
        return null;
      }

      const [[report], templatesList] = await Promise.all([
        tx
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
          })
          .from(users)
          .where(eq(users.id, series.reportId))
          .limit(1),
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
        series: {
          id: series.id,
          reportId: series.reportId,
          reportName: report ? `${report.firstName} ${report.lastName}` : "",
          cadence: series.cadence,
          cadenceCustomDays: series.cadenceCustomDays,
          defaultTemplateId: series.defaultTemplateId,
          preferredDay: series.preferredDay,
          preferredTime: series.preferredTime,
          defaultDurationMinutes: series.defaultDurationMinutes,
          nextSessionAt: series.nextSessionAt?.toISOString() ?? null,
        },
        templates: templatesList,
      };
    }
  );

  if (!data) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="mb-12">
        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-foreground mb-2">
          {t("detail.editSeries")}
        </h1>
        <p className="text-muted-foreground text-lg">
          {t("detail.editSeriesDesc")}
        </p>
      </header>

      <EditorialSeriesForm
        userGroups={[]}
        templates={data.templates}
        editData={data.series}
      />
    </div>
  );
}
