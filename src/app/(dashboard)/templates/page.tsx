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
import { TemplateList } from "@/components/templates/template-list";

export default async function TemplatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
        <p className="text-sm text-muted-foreground">
          Manage questionnaire templates for your 1:1 sessions
        </p>
      </div>

      <TemplateList
        initialTemplates={templates}
        currentUserRole={session.user.role}
      />
    </div>
  );
}
