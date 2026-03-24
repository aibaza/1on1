import { auth } from "@/lib/auth/config";
import { redirect, notFound } from "next/navigation";
import { canManageTemplates } from "@/lib/auth/rbac";
import { withTenantContext } from "@/lib/db/tenant-context";
import {
  questionnaireTemplates,
  templateSections,
  templateQuestions,
} from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { buildExportPayload } from "@/lib/templates/export-schema";
import { AiEditorShell } from "@/components/templates/ai-editor/ai-editor-shell";
import type { AiChatMessage, AiVersionSnapshot } from "@/lib/ai/editor-types";

type PageProps = { params: Promise<{ id: string }> };

export default async function ExistingTemplateAiEditorPage({
  params,
}: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canManageTemplates(session.user.level)) redirect("/templates");

  const { id } = await params;
  const contentLanguage = session.user.contentLanguage ?? "en";

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

      const [sections, questions] = await Promise.all([
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
          .select()
          .from(templateQuestions)
          .where(
            and(
              eq(templateQuestions.templateId, id),
              eq(templateQuestions.isArchived, false)
            )
          )
          .orderBy(asc(templateQuestions.sortOrder)),
      ]);

      const questionsBySection = new Map<string, typeof questions>();
      for (const q of questions) {
        const arr = questionsBySection.get(q.sectionId) ?? [];
        arr.push(q);
        questionsBySection.set(q.sectionId, arr);
      }

      return {
        ...tmpl,
        sections: sections.map((s) => ({
          ...s,
          questions: questionsBySection.get(s.id) ?? [],
        })),
        aiChatHistory: tmpl.aiChatHistory as AiChatMessage[] | null,
        aiVersionHistory: tmpl.aiVersionHistory as AiVersionSnapshot[] | null,
      };
    }
  );

  if (!template) notFound();

  const exportPayload = buildExportPayload(template, contentLanguage);

  return (
    <AiEditorShell
      initialTemplate={exportPayload}
      templateId={id}
      contentLanguage={contentLanguage}
      userLevel={session.user.level}
      initialChatHistory={template.aiChatHistory}
      initialVersionHistory={template.aiVersionHistory}
    />
  );
}
