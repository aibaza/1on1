import { auth } from "@/lib/auth/config";
import { redirect, notFound } from "next/navigation";
import { withTenantContext } from "@/lib/db/tenant-context";
import { questionnaireTemplates, templateQuestions } from "@/lib/db/schema";
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

      const questions = await tx
        .select()
        .from(templateQuestions)
        .where(
          and(
            eq(templateQuestions.templateId, id),
            eq(templateQuestions.isArchived, false)
          )
        )
        .orderBy(asc(templateQuestions.sortOrder));

      return {
        ...tmpl,
        createdAt: tmpl.createdAt.toISOString(),
        updatedAt: tmpl.updatedAt.toISOString(),
        questions: questions.map((q) => ({
          ...q,
          createdAt: q.createdAt.toISOString(),
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
      userRole={session.user.role}
    />
  );
}
