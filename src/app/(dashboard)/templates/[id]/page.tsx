import { auth } from "@/lib/auth/config";
import { redirect, notFound } from "next/navigation";
import { withTenantContext } from "@/lib/db/tenant-context";
import {
  questionnaireTemplates,
  templateQuestions,
  templateSections,
  templateLabelAssignments,
  templateLabels,
} from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { TemplateEditor } from "@/components/templates/template-editor";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TemplateDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const template = await withTenantContext(
    session.user.tenantId,
    session.user.id,
    async (tx) => {
      const [tmpl] = await tx
        .select()
        .from(questionnaireTemplates)
        .where(
          and(
            eq(questionnaireTemplates.id, id),
            eq(questionnaireTemplates.tenantId, session.user.tenantId)
          )
        );

      if (!tmpl) return null;

      const [questions, sections, labelRows] = await Promise.all([
        tx
          .select()
          .from(templateQuestions)
          .where(
            and(
              eq(templateQuestions.templateId, id),
              eq(templateQuestions.isArchived, false)
            )
          )
          .orderBy(asc(templateQuestions.sortOrder)),
        tx
          .select()
          .from(templateSections)
          .where(
            and(
              eq(templateSections.templateId, id),
              eq(templateSections.isArchived, false)
            )
          )
          .orderBy(asc(templateSections.sortOrder)),
        tx
          .select({
            id: templateLabels.id,
            name: templateLabels.name,
            color: templateLabels.color,
          })
          .from(templateLabelAssignments)
          .innerJoin(
            templateLabels,
            eq(templateLabelAssignments.labelId, templateLabels.id)
          )
          .where(eq(templateLabelAssignments.templateId, id)),
      ]);

      // Group questions by section
      const questionsBySection = new Map<string, typeof questions>();
      for (const q of questions) {
        const arr = questionsBySection.get(q.sectionId) ?? [];
        arr.push(q);
        questionsBySection.set(q.sectionId, arr);
      }

      return {
        id: tmpl.id,
        tenantId: tmpl.tenantId,
        name: tmpl.name,
        description: tmpl.description,
        isDefault: tmpl.isDefault,
        isPublished: tmpl.isPublished,
        isArchived: tmpl.isArchived,
        createdBy: tmpl.createdBy,
        version: tmpl.version,
        createdAt: tmpl.createdAt.toISOString(),
        updatedAt: tmpl.updatedAt.toISOString(),
        labels: labelRows,
        sections: sections.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          sortOrder: s.sortOrder,
          createdAt: s.createdAt.toISOString(),
          questions: (questionsBySection.get(s.id) ?? []).map((q) => ({
            ...q,
            createdAt: q.createdAt.toISOString(),
          })),
        })),
      };
    }
  );

  if (!template) {
    notFound();
  }

  return (
    <TemplateEditor
      template={template}
      userLevel={session.user.level}
    />
  );
}
