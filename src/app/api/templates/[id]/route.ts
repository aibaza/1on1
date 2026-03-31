import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { canManageTemplates } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit/log";
import {
  updateTemplateSchema,
  saveTemplateSchema,
  validateAnswerConfig,
  validateConditionalLogic,
} from "@/lib/validations/template";
import {
  questionnaireTemplates,
  templateQuestions,
  templateSections,
  templateLabelAssignments,
  templateLabels,
  sessions,
} from "@/lib/db/schema";
import { eq, and, asc, sql, inArray } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
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

        // Group questions by section
        const questionsBySection = new Map<string, typeof questions>();
        for (const q of questions) {
          if (!questionsBySection.has(q.sectionId)) {
            questionsBySection.set(q.sectionId, []);
          }
          questionsBySection.get(q.sectionId)!.push(q);
        }

        // Fetch labels
        const labelRows = await tx
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
          .where(eq(templateLabelAssignments.templateId, id));

        return {
          ...template,
          createdAt: template.createdAt.toISOString(),
          updatedAt: template.updatedAt.toISOString(),
          labels: labelRows,
          sections: sectionRows.map((s) => ({
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

    if (!result) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch template:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!canManageTemplates(session.user.level)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Determine if this is a batch save (with sections) or metadata-only update
  const isBatchSave =
    typeof body === "object" &&
    body !== null &&
    "sections" in body;

  try {
    if (isBatchSave) {
      // Full batch save: template metadata + sections + questions
      const data = saveTemplateSchema.parse(body);

      // Flatten all questions across sections for validation (assign global sortOrder)
      let globalIndex = 0;
      const allQuestions: Array<{
        id?: string;
        questionText: string;
        sortOrder: number;
        answerType: string;
        answerConfig: Record<string, unknown>;
        conditionalOnQuestionId?: string | null;
        conditionalOperator?: string | null;
        conditionalValue?: string | null;
      }> = [];

      for (const section of data.sections) {
        for (const q of section.questions) {
          allQuestions.push({
            ...q,
            sortOrder: globalIndex,
          });
          globalIndex++;
        }
      }

      // Validate answer configs
      for (const q of allQuestions) {
        const configError = validateAnswerConfig(q.answerType, q.answerConfig);
        if (configError) {
          return NextResponse.json(
            { error: `Question "${q.questionText}": ${configError}` },
            { status: 400 }
          );
        }
      }

      // Validate conditional logic across all questions
      const conditionalError = validateConditionalLogic(allQuestions);
      if (conditionalError) {
        return NextResponse.json(
          { error: conditionalError },
          { status: 400 }
        );
      }

      // Helper: null out q-{index} temporary refs (not valid UUIDs for DB insert)
      const resolveRefForInsert = (ref: string | null | undefined): string | null => {
        if (!ref) return null;
        return ref.match(/^q-\d+$/) ? null : ref;
      };

      const result = await withTenantContext(
        session.user.tenantId,
        session.user.id,
        async (tx) => {
          const [template] = await tx
            .select({
              id: questionnaireTemplates.id,
              version: questionnaireTemplates.version,
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

          // Check if template has been used in any session
          const [sessionCount] = await tx
            .select({ count: sql<number>`cast(count(*) as int)` })
            .from(sessions)
            .where(eq(sessions.templateId, id));

          const isUsedInSessions = sessionCount.count > 0;

          // Get current non-archived sections and questions
          const currentSections = await tx
            .select()
            .from(templateSections)
            .where(
              and(
                eq(templateSections.templateId, id),
                eq(templateSections.isArchived, false)
              )
            );
          const currentQuestions = await tx
            .select()
            .from(templateQuestions)
            .where(
              and(
                eq(templateQuestions.templateId, id),
                eq(templateQuestions.isArchived, false)
              )
            )
            .orderBy(asc(templateQuestions.sortOrder));

          // Determine if content changed
          const currentSectionIds = new Set(currentSections.map((s) => s.id));
          const currentQuestionIds = new Set(currentQuestions.map((q) => q.id));
          const incomingSectionIds = new Set(
            data.sections.filter((s) => s.id).map((s) => s.id!)
          );
          const incomingQuestionIds = new Set(
            data.sections
              .flatMap((s) => s.questions)
              .filter((q) => q.id)
              .map((q) => q.id!)
          );

          const contentChanged =
            currentSections.length !== data.sections.length ||
            currentQuestions.length !== allQuestions.length ||
            [...currentSectionIds].some((sid) => !incomingSectionIds.has(sid)) ||
            [...currentQuestionIds].some((qid) => !incomingQuestionIds.has(qid)) ||
            data.sections.some((s) => !s.id) ||
            data.sections.some((s) => s.questions.some((q) => !q.id));

          let newVersion = template.version;

          if (isUsedInSessions && contentChanged) {
            // Versioning: increment version, archive old sections & questions, insert new
            newVersion = template.version + 1;

            // Archive all current non-archived questions
            if (currentQuestions.length > 0) {
              await tx
                .update(templateQuestions)
                .set({ isArchived: true })
                .where(
                  and(
                    eq(templateQuestions.templateId, id),
                    eq(templateQuestions.isArchived, false)
                  )
                );
            }

            // Archive all current non-archived sections
            if (currentSections.length > 0) {
              await tx
                .update(templateSections)
                .set({ isArchived: true })
                .where(
                  and(
                    eq(templateSections.templateId, id),
                    eq(templateSections.isArchived, false)
                  )
                );
            }

            // Insert all sections and questions as new rows
            for (const section of data.sections) {
              const [newSection] = await tx
                .insert(templateSections)
                .values({
                  templateId: id,
                  tenantId: session.user.tenantId,
                  name: section.name,
                  description: section.description ?? null,
                  sortOrder: section.sortOrder,
                })
                .returning();

              for (const q of section.questions) {
                await tx.insert(templateQuestions).values({
                  templateId: id,
                  sectionId: newSection.id,
                  questionText: q.questionText,
                  helpText: q.helpText ?? null,
                  answerType: q.answerType,
                  answerConfig: q.answerConfig,
                  isRequired: q.isRequired,
                  sortOrder: q.sortOrder,
                  conditionalOnQuestionId:
                    resolveRefForInsert(q.conditionalOnQuestionId),
                  conditionalOperator: q.conditionalOperator ?? null,
                  conditionalValue: q.conditionalValue ?? null,
                  scoreWeight: q.scoreWeight !== undefined ? String(q.scoreWeight) : "1",
                });
              }
            }
          } else {
            // Not used in sessions (or no content change) -- upsert sections/questions

            // Archive removed sections
            for (const cs of currentSections) {
              if (!incomingSectionIds.has(cs.id)) {
                await tx
                  .update(templateSections)
                  .set({ isArchived: true })
                  .where(eq(templateSections.id, cs.id));
              }
            }

            // Archive removed questions
            for (const cq of currentQuestions) {
              if (!incomingQuestionIds.has(cq.id)) {
                await tx
                  .update(templateQuestions)
                  .set({ isArchived: true })
                  .where(eq(templateQuestions.id, cq.id));
              }
            }

            // Upsert sections and their questions
            for (const section of data.sections) {
              let sectionId: string;

              if (section.id && currentSectionIds.has(section.id)) {
                // Update existing section
                await tx
                  .update(templateSections)
                  .set({
                    name: section.name,
                    description: section.description ?? null,
                    sortOrder: section.sortOrder,
                  })
                  .where(eq(templateSections.id, section.id));
                sectionId = section.id;
              } else {
                // Insert new section
                const [newSection] = await tx
                  .insert(templateSections)
                  .values({
                    templateId: id,
                    tenantId: session.user.tenantId,
                    name: section.name,
                    description: section.description ?? null,
                    sortOrder: section.sortOrder,
                  })
                  .returning();
                sectionId = newSection.id;
              }

              // Upsert questions within this section
              for (const q of section.questions) {
                if (q.id && currentQuestionIds.has(q.id)) {
                  await tx
                    .update(templateQuestions)
                    .set({
                      sectionId,
                      questionText: q.questionText,
                      helpText: q.helpText ?? null,
                      answerType: q.answerType,
                      answerConfig: q.answerConfig,
                      isRequired: q.isRequired,
                      sortOrder: q.sortOrder,
                      conditionalOnQuestionId:
                        resolveRefForInsert(q.conditionalOnQuestionId),
                      conditionalOperator: q.conditionalOperator ?? null,
                      conditionalValue: q.conditionalValue ?? null,
                      scoreWeight: q.scoreWeight !== undefined ? String(q.scoreWeight) : "1",
                    })
                    .where(eq(templateQuestions.id, q.id));
                } else {
                  await tx.insert(templateQuestions).values({
                    templateId: id,
                    sectionId,
                    questionText: q.questionText,
                    helpText: q.helpText ?? null,
                    answerType: q.answerType,
                    answerConfig: q.answerConfig,
                    isRequired: q.isRequired,
                    sortOrder: q.sortOrder,
                    conditionalOnQuestionId:
                      resolveRefForInsert(q.conditionalOnQuestionId),
                    conditionalOperator: q.conditionalOperator ?? null,
                    conditionalValue: q.conditionalValue ?? null,
                    scoreWeight: q.scoreWeight !== undefined ? String(q.scoreWeight) : "1",
                  });
                }
              }
            }
          }

          // Resolve q-{index} temporary conditional references to real UUIDs
          const hasTemporaryRefs = allQuestions.some(
            (q) => q.conditionalOnQuestionId?.match(/^q-\d+$/)
          );
          if (hasTemporaryRefs) {
            const resolvedQuestions = await tx
              .select({ id: templateQuestions.id, sortOrder: templateQuestions.sortOrder })
              .from(templateQuestions)
              .where(
                and(
                  eq(templateQuestions.templateId, id),
                  eq(templateQuestions.isArchived, false)
                )
              )
              .orderBy(asc(templateQuestions.sortOrder));

            const indexToId = new Map<number, string>();
            for (const rq of resolvedQuestions) {
              indexToId.set(rq.sortOrder, rq.id);
            }

            for (const rq of resolvedQuestions) {
              const original = allQuestions.find((q) => q.sortOrder === rq.sortOrder);
              if (original?.conditionalOnQuestionId?.match(/^q-\d+$/)) {
                const refIndex = parseInt(original.conditionalOnQuestionId.replace("q-", ""), 10);
                const realId = indexToId.get(refIndex);
                if (realId) {
                  await tx
                    .update(templateQuestions)
                    .set({ conditionalOnQuestionId: realId })
                    .where(eq(templateQuestions.id, rq.id));
                }
              }
            }
          }

          // Sync label assignments
          if (data.labelIds !== undefined) {
            // Delete existing assignments
            await tx
              .delete(templateLabelAssignments)
              .where(eq(templateLabelAssignments.templateId, id));

            // Insert new assignments
            if (data.labelIds.length > 0) {
              await tx.insert(templateLabelAssignments).values(
                data.labelIds.map((labelId) => ({
                  templateId: id,
                  labelId,
                }))
              );
            }
          }

          // Update template metadata
          const [updated] = await tx
            .update(questionnaireTemplates)
            .set({
              name: data.name,
              description: data.description ?? null,
              version: newVersion,
              updatedAt: new Date(),
            })
            .where(eq(questionnaireTemplates.id, id))
            .returning();

          await logAuditEvent(tx, {
            tenantId: session.user.tenantId,
            actorId: session.user.id,
            action: "template_updated",
            resourceType: "template",
            resourceId: id,
            metadata: {
              version: newVersion,
              contentChanged,
              isUsedInSessions,
            },
          });

          // Return template with updated sections, questions, labels
          const updatedSections = await tx
            .select()
            .from(templateSections)
            .where(
              and(
                eq(templateSections.templateId, id),
                eq(templateSections.isArchived, false)
              )
            )
            .orderBy(asc(templateSections.sortOrder));

          const updatedQuestions = await tx
            .select()
            .from(templateQuestions)
            .where(
              and(
                eq(templateQuestions.templateId, id),
                eq(templateQuestions.isArchived, false)
              )
            )
            .orderBy(asc(templateQuestions.sortOrder));

          const questionsBySection = new Map<string, typeof updatedQuestions>();
          for (const q of updatedQuestions) {
            if (!questionsBySection.has(q.sectionId)) {
              questionsBySection.set(q.sectionId, []);
            }
            questionsBySection.get(q.sectionId)!.push(q);
          }

          const updatedLabels = await tx
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
            .where(eq(templateLabelAssignments.templateId, id));

          return {
            data: {
              ...updated,
              createdAt: updated.createdAt.toISOString(),
              updatedAt: updated.updatedAt.toISOString(),
              labels: updatedLabels,
              sections: updatedSections.map((s) => ({
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

      return NextResponse.json(result.data);
    } else {
      // Metadata-only update (backward compatible)
      const data = updateTemplateSchema.parse(body);

      const result = await withTenantContext(
        session.user.tenantId,
        session.user.id,
        async (tx) => {
          const [template] = await tx
            .select({ id: questionnaireTemplates.id })
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

          const updatePayload: Record<string, unknown> = {
            updatedAt: new Date(),
          };

          if (data.name !== undefined) updatePayload.name = data.name;
          if (data.description !== undefined)
            updatePayload.description = data.description;

          const [updated] = await tx
            .update(questionnaireTemplates)
            .set(updatePayload)
            .where(eq(questionnaireTemplates.id, id))
            .returning();

          // Sync label assignments if provided
          if (data.labelIds !== undefined) {
            await tx
              .delete(templateLabelAssignments)
              .where(eq(templateLabelAssignments.templateId, id));

            if (data.labelIds.length > 0) {
              await tx.insert(templateLabelAssignments).values(
                data.labelIds.map((labelId) => ({
                  templateId: id,
                  labelId,
                }))
              );
            }
          }

          await logAuditEvent(tx, {
            tenantId: session.user.tenantId,
            actorId: session.user.id,
            action: "template_updated",
            resourceType: "template",
            resourceId: id,
            metadata: {
              ...(data.name !== undefined && { newName: data.name }),
              ...(data.description !== undefined && {
                newDescription: data.description,
              }),
            },
          });

          return { data: updated };
        }
      );

      if ("error" in result) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status }
        );
      }

      return NextResponse.json(result.data);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to update template:", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to update template", detail },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!canManageTemplates(session.user.level)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const [template] = await tx
          .select({
            id: questionnaireTemplates.id,
            name: questionnaireTemplates.name,
            isDefault: questionnaireTemplates.isDefault,
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

        // If this template is the default, unset it first
        if (template.isDefault) {
          await tx
            .update(questionnaireTemplates)
            .set({ isDefault: false })
            .where(eq(questionnaireTemplates.id, id));
        }

        // Soft delete: archive the template
        await tx
          .update(questionnaireTemplates)
          .set({ isArchived: true, updatedAt: new Date() })
          .where(eq(questionnaireTemplates.id, id));

        await logAuditEvent(tx, {
          tenantId: session.user.tenantId,
          actorId: session.user.id,
          action: "template_archived",
          resourceType: "template",
          resourceId: id,
          metadata: { templateName: template.name },
        });

        return { success: true };
      }
    );

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to archive template:", error);
    return NextResponse.json(
      { error: "Failed to archive template" },
      { status: 500 }
    );
  }
}
