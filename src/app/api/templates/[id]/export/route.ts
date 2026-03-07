import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { canManageTemplates } from "@/lib/auth/rbac";
import { buildExportPayload } from "@/lib/templates/export-schema";
import {
  questionnaireTemplates,
  templateSections,
  templateQuestions,
} from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/templates/[id]/export
 *
 * Returns a tenant-neutral JSON export of the template as a downloadable file.
 * The output matches the TemplateExport interface from @/lib/templates/export-schema.
 *
 * RBAC: admin or manager only (canManageTemplates).
 * Auth gate: 401 for unauthenticated, 403 for member role.
 * Export is a read operation — no audit log entry.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Not authenticated", { status: 401 });
  }

  if (!canManageTemplates(session.user.role)) {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Fetch the template row
        const [template] = await tx
          .select()
          .from(questionnaireTemplates)
          .where(
            and(
              eq(questionnaireTemplates.id, id),
              eq(questionnaireTemplates.tenantId, session.user.tenantId)
            )
          );

        if (!template) return null;

        // Fetch non-archived sections ordered by sortOrder
        const sectionRows = await tx
          .select()
          .from(templateSections)
          .where(
            and(
              eq(templateSections.templateId, id),
              eq(templateSections.isArchived, false)
            )
          )
          .orderBy(asc(templateSections.sortOrder));

        // Fetch non-archived questions ordered by sortOrder
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

        // Group questions by sectionId
        const questionsBySection = new Map<string, typeof questions>();
        for (const q of questions) {
          if (!questionsBySection.has(q.sectionId)) {
            questionsBySection.set(q.sectionId, []);
          }
          questionsBySection.get(q.sectionId)!.push(q);
        }

        return {
          template,
          sections: sectionRows.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            sortOrder: s.sortOrder,
            questions: (questionsBySection.get(s.id) ?? []).map((q) => ({
              id: q.id,
              sectionId: q.sectionId,
              templateId: q.templateId,
              questionText: q.questionText,
              helpText: q.helpText,
              answerType: q.answerType,
              answerConfig: q.answerConfig,
              isRequired: q.isRequired,
              sortOrder: q.sortOrder,
              scoreWeight: q.scoreWeight,
              conditionalOnQuestionId: q.conditionalOnQuestionId,
              conditionalOperator: q.conditionalOperator,
              conditionalValue: q.conditionalValue,
              isArchived: q.isArchived,
              createdAt: q.createdAt.toISOString(),
            })),
          })),
        };
      }
    );

    if (!result) {
      return new Response("Not found", { status: 404 });
    }

    const { template, sections } = result;

    // Build the tenant-neutral export payload
    const exported = buildExportPayload(
      { name: template.name, description: template.description, sections },
      session.user.contentLanguage
    );

    // Generate a safe filename: lowercase slug + version
    const slug = template.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const filename = `${slug}-v${template.version}.json`;

    return new Response(JSON.stringify(exported, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[templates/export] Error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
