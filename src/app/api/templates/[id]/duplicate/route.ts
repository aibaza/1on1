import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { canManageTemplates } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit/log";
import {
  questionnaireTemplates,
  templateQuestions,
  templateSections,
  templateLabelAssignments,
  templateLabels,
} from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  void request; // unused but required by Next.js route handler signature
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!canManageTemplates(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Fetch source template
        const [source] = await tx
          .select()
          .from(questionnaireTemplates)
          .where(
            and(
              eq(questionnaireTemplates.id, id),
              eq(questionnaireTemplates.tenantId, session.user.tenantId)
            )
          );

        if (!source) {
          return { error: "Template not found", status: 404 };
        }

        // Fetch non-archived sections
        const sourceSections = await tx
          .select()
          .from(templateSections)
          .where(
            and(
              eq(templateSections.templateId, id),
              eq(templateSections.isArchived, false)
            )
          )
          .orderBy(asc(templateSections.sortOrder));

        // Fetch non-archived questions
        const sourceQuestions = await tx
          .select()
          .from(templateQuestions)
          .where(
            and(
              eq(templateQuestions.templateId, id),
              eq(templateQuestions.isArchived, false)
            )
          )
          .orderBy(asc(templateQuestions.sortOrder));

        // Fetch label assignments
        const sourceLabels = await tx
          .select()
          .from(templateLabelAssignments)
          .where(eq(templateLabelAssignments.templateId, id));

        // Create duplicate template
        const [newTemplate] = await tx
          .insert(questionnaireTemplates)
          .values({
            tenantId: session.user.tenantId,
            name: `${source.name} (Copy)`,
            description: source.description,
            isDefault: false,
            isPublished: false,
            isArchived: false,
            createdBy: session.user.id,
            version: 1,
          })
          .returning();

        // Duplicate sections, building oldSectionId -> newSectionId map
        const oldToNewSectionMap = new Map<string, string>();
        for (const s of sourceSections) {
          const [newSection] = await tx
            .insert(templateSections)
            .values({
              templateId: newTemplate.id,
              tenantId: session.user.tenantId,
              name: s.name,
              description: s.description,
              sortOrder: s.sortOrder,
              isArchived: false,
            })
            .returning();
          oldToNewSectionMap.set(s.id, newSection.id);
        }

        // Copy questions with new UUIDs, building oldId->newId map for conditional remapping
        const oldToNewQuestionMap = new Map<string, string>();

        // First pass: insert all questions to get new IDs
        for (const q of sourceQuestions) {
          const newSectionId = oldToNewSectionMap.get(q.sectionId);
          if (!newSectionId) continue;

          const [newQuestion] = await tx
            .insert(templateQuestions)
            .values({
              templateId: newTemplate.id,
              sectionId: newSectionId,
              questionText: q.questionText,
              helpText: q.helpText,
              answerType: q.answerType,
              answerConfig: q.answerConfig,
              isRequired: q.isRequired,
              sortOrder: q.sortOrder,
              isArchived: false,
              // Set conditional fields to null initially; remap in second pass
              conditionalOnQuestionId: null,
              conditionalOperator: q.conditionalOperator,
              conditionalValue: q.conditionalValue,
            })
            .returning();

          oldToNewQuestionMap.set(q.id, newQuestion.id);
        }

        // Second pass: remap conditionalOnQuestionId references
        for (const q of sourceQuestions) {
          if (q.conditionalOnQuestionId) {
            const newQuestionId = oldToNewQuestionMap.get(q.id);
            const newConditionalId = oldToNewQuestionMap.get(
              q.conditionalOnQuestionId
            );
            if (newQuestionId && newConditionalId) {
              await tx
                .update(templateQuestions)
                .set({ conditionalOnQuestionId: newConditionalId })
                .where(eq(templateQuestions.id, newQuestionId));
            }
          }
        }

        // Duplicate label assignments
        if (sourceLabels.length > 0) {
          await tx.insert(templateLabelAssignments).values(
            sourceLabels.map((la) => ({
              templateId: newTemplate.id,
              labelId: la.labelId,
            }))
          );
        }

        await logAuditEvent(tx, {
          tenantId: session.user.tenantId,
          actorId: session.user.id,
          action: "template_duplicated",
          resourceType: "template",
          resourceId: newTemplate.id,
          metadata: {
            sourceTemplateId: id,
            sourceTemplateName: source.name,
          },
        });

        // Fetch the complete new template with sections and questions
        const newSections = await tx
          .select()
          .from(templateSections)
          .where(eq(templateSections.templateId, newTemplate.id))
          .orderBy(asc(templateSections.sortOrder));

        const newQuestions = await tx
          .select()
          .from(templateQuestions)
          .where(eq(templateQuestions.templateId, newTemplate.id))
          .orderBy(asc(templateQuestions.sortOrder));

        const questionsBySection = new Map<string, typeof newQuestions>();
        for (const q of newQuestions) {
          if (!questionsBySection.has(q.sectionId)) {
            questionsBySection.set(q.sectionId, []);
          }
          questionsBySection.get(q.sectionId)!.push(q);
        }

        const newLabels = await tx
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
          .where(eq(templateLabelAssignments.templateId, newTemplate.id));

        return {
          data: {
            ...newTemplate,
            createdAt: newTemplate.createdAt.toISOString(),
            updatedAt: newTemplate.updatedAt.toISOString(),
            labels: newLabels,
            sections: newSections.map((s) => ({
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
          },
        };
      }
    );

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error("Failed to duplicate template:", error);
    return NextResponse.json(
      { error: "Failed to duplicate template" },
      { status: 500 }
    );
  }
}
