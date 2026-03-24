import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { withTenantContext } from "@/lib/db/tenant-context";
import {
  questionnaireTemplates,
  templateQuestions,
  templateLabelAssignments,
  templateLabels,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { TemplateList } from "@/components/templates/template-list";
import { EditorialTemplateList } from "@/components/templates/editorial-template-list";
import { getDesignPreference } from "@/lib/design-preference.server";

export default async function TemplatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("templates");

  const templates = await withTenantContext(
    session.user.tenantId,
    session.user.id,
    async (tx) => {
      const results = await tx
        .select({
          id: questionnaireTemplates.id,
          name: questionnaireTemplates.name,
          description: questionnaireTemplates.description,
          isDefault: questionnaireTemplates.isDefault,
          isPublished: questionnaireTemplates.isPublished,
          isArchived: questionnaireTemplates.isArchived,
          version: questionnaireTemplates.version,
          createdAt: questionnaireTemplates.createdAt,
          questionCount:
            sql<number>`cast(count(${templateQuestions.id}) as int)`,
        })
        .from(questionnaireTemplates)
        .leftJoin(
          templateQuestions,
          and(
            eq(templateQuestions.templateId, questionnaireTemplates.id),
            eq(templateQuestions.isArchived, false)
          )
        )
        .where(
          and(
            eq(questionnaireTemplates.tenantId, session.user.tenantId),
            eq(questionnaireTemplates.isArchived, false)
          )
        )
        .groupBy(questionnaireTemplates.id)
        .orderBy(questionnaireTemplates.name);

      // Fetch labels for all templates
      const allLabels = await tx
        .select({
          templateId: templateLabelAssignments.templateId,
          labelId: templateLabels.id,
          labelName: templateLabels.name,
          labelColor: templateLabels.color,
        })
        .from(templateLabelAssignments)
        .innerJoin(
          templateLabels,
          eq(templateLabelAssignments.labelId, templateLabels.id)
        )
        .where(
          eq(templateLabels.tenantId, session.user.tenantId)
        );

      const labelsByTemplate = new Map<string, Array<{ id: string; name: string; color: string | null }>>();
      for (const l of allLabels) {
        if (!labelsByTemplate.has(l.templateId)) {
          labelsByTemplate.set(l.templateId, []);
        }
        labelsByTemplate.get(l.templateId)!.push({
          id: l.labelId,
          name: l.labelName,
          color: l.labelColor,
        });
      }

      return results.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        labels: labelsByTemplate.get(t.id) ?? [],
      }));
    }
  );

  const designPref = await getDesignPreference();
  const isEditorial = designPref === "editorial";

  return (
    <div className={isEditorial ? "space-y-10" : "space-y-6"}>
      <div>
        <h1 className={isEditorial ? "text-3xl font-extrabold tracking-tight font-headline" : "text-2xl font-semibold tracking-tight"}>
          {t("title")}
        </h1>
        <p className={isEditorial ? "text-muted-foreground text-base font-medium mt-2 max-w-xl leading-relaxed" : "text-sm text-muted-foreground"}>
          {t("description")}
        </p>
      </div>

      {isEditorial ? (
        <EditorialTemplateList
          initialTemplates={templates}
          currentUserLevel={session.user.level}
          contentLanguage={session.user.contentLanguage ?? "en"}
        />
      ) : (
        <TemplateList
          initialTemplates={templates}
          currentUserLevel={session.user.level}
          contentLanguage={session.user.contentLanguage ?? "en"}
        />
      )}
    </div>
  );
}
