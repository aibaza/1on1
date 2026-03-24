import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { canManageTemplates } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit/log";
import {
  questionnaireTemplates,
  templateSections,
  templateQuestions,
  templateLabelAssignments,
  templateVersions,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { TemplateVersionSnapshot } from "@/lib/templates/snapshot";

type RouteContext = { params: Promise<{ id: string; versionNumber: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  void request;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!canManageTemplates(session.user.level)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, versionNumber } = await params;
  const vNum = parseInt(versionNumber, 10);

  if (isNaN(vNum) || vNum < 1) {
    return NextResponse.json(
      { error: "Invalid version number" },
      { status: 400 }
    );
  }

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Verify template exists and is not archived
        const [template] = await tx
          .select({
            id: questionnaireTemplates.id,
            name: questionnaireTemplates.name,
            isArchived: questionnaireTemplates.isArchived,
          })
          .from(questionnaireTemplates)
          .where(
            and(
              eq(questionnaireTemplates.id, id),
              eq(questionnaireTemplates.tenantId, session.user.tenantId)
            )
          );

        if (!template) {
          return { error: "Template not found", status: 404 };
        }

        if (template.isArchived) {
          return { error: "Cannot restore to an archived template", status: 400 };
        }

        // Fetch the version snapshot
        const [version] = await tx
          .select({
            snapshot: templateVersions.snapshot,
          })
          .from(templateVersions)
          .where(
            and(
              eq(templateVersions.templateId, id),
              eq(templateVersions.versionNumber, vNum)
            )
          );

        if (!version) {
          return { error: "Version not found", status: 404 };
        }

        const snap = version.snapshot as TemplateVersionSnapshot;

        // Archive all current non-archived sections
        await tx
          .update(templateSections)
          .set({ isArchived: true })
          .where(
            and(
              eq(templateSections.templateId, id),
              eq(templateSections.isArchived, false)
            )
          );

        // Archive all current non-archived questions
        await tx
          .update(templateQuestions)
          .set({ isArchived: true })
          .where(
            and(
              eq(templateQuestions.templateId, id),
              eq(templateQuestions.isArchived, false)
            )
          );

        // Delete current label assignments
        await tx
          .delete(templateLabelAssignments)
          .where(eq(templateLabelAssignments.templateId, id));

        // Insert new sections from snapshot, building oldSectionId -> newSectionId map
        const sectionMap = new Map<string, string>();
        for (const s of snap.sections) {
          const [newSection] = await tx
            .insert(templateSections)
            .values({
              templateId: id,
              tenantId: session.user.tenantId,
              name: s.name,
              description: s.description,
              sortOrder: s.sortOrder,
              isArchived: false,
            })
            .returning();
          sectionMap.set(s.id, newSection.id);
        }

        // Insert new questions from snapshot (two-pass for conditional remapping)
        const questionMap = new Map<string, string>();

        // First pass: insert all questions with conditionalOnQuestionId: null
        for (const s of snap.sections) {
          const newSectionId = sectionMap.get(s.id);
          if (!newSectionId) continue;

          for (const q of s.questions) {
            const [newQuestion] = await tx
              .insert(templateQuestions)
              .values({
                templateId: id,
                sectionId: newSectionId,
                questionText: q.questionText,
                helpText: q.helpText,
                answerType: q.answerType as "text" | "rating_1_5" | "rating_1_10" | "yes_no" | "multiple_choice" | "mood" | "scale_custom",
                answerConfig: q.answerConfig,
                isRequired: q.isRequired,
                sortOrder: q.sortOrder,
                scoreWeight: q.scoreWeight,
                isArchived: false,
                conditionalOnQuestionId: null,
                conditionalOperator: q.conditionalOperator as "eq" | "neq" | "lt" | "gt" | "lte" | "gte" | null,
                conditionalValue: q.conditionalValue,
              })
              .returning();
            questionMap.set(q.id, newQuestion.id);
          }
        }

        // Second pass: remap conditionalOnQuestionId references
        for (const s of snap.sections) {
          for (const q of s.questions) {
            if (q.conditionalOnQuestionId) {
              const newQuestionId = questionMap.get(q.id);
              const newConditionalId = questionMap.get(
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
        }

        // Re-insert label assignments from snapshot
        if (snap.labelIds.length > 0) {
          await tx.insert(templateLabelAssignments).values(
            snap.labelIds.map((labelId) => ({ templateId: id, labelId }))
          );
        }

        // Set template as unpublished draft
        await tx
          .update(questionnaireTemplates)
          .set({ isPublished: false, updatedAt: new Date() })
          .where(eq(questionnaireTemplates.id, id));

        // Audit log
        await logAuditEvent(tx, {
          tenantId: session.user.tenantId,
          actorId: session.user.id,
          action: "template_version_restored",
          resourceType: "template",
          resourceId: id,
          metadata: {
            versionNumber: vNum,
            templateName: template.name,
          },
        });

        return { data: { success: true, restoredVersion: vNum } };
      }
    );

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Failed to restore template version:", error);
    return NextResponse.json(
      { error: "Failed to restore template version" },
      { status: 500 }
    );
  }
}
