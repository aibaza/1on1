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
  sessions,
} from "@/lib/db/schema";
import { eq, and, asc, sql } from "drizzle-orm";

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
          ...template,
          createdAt: template.createdAt.toISOString(),
          updatedAt: template.updatedAt.toISOString(),
          questions: questions.map((q) => ({
            ...q,
            createdAt: q.createdAt.toISOString(),
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

  if (!canManageTemplates(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Determine if this is a batch save (with questions) or metadata-only update
  const isBatchSave =
    typeof body === "object" &&
    body !== null &&
    "questions" in body;

  try {
    if (isBatchSave) {
      // Full batch save: template metadata + all questions
      const data = saveTemplateSchema.parse(body);

      // Validate answer configs for all questions
      for (const q of data.questions) {
        const configError = validateAnswerConfig(q.answerType, q.answerConfig);
        if (configError) {
          return NextResponse.json(
            { error: `Question "${q.questionText}": ${configError}` },
            { status: 400 }
          );
        }
      }

      // Validate conditional logic across all questions
      const conditionalError = validateConditionalLogic(
        data.questions.map((q, i) => ({
          id: q.id,
          questionText: q.questionText,
          sortOrder: q.sortOrder ?? i,
          answerType: q.answerType,
          conditionalOnQuestionId: q.conditionalOnQuestionId,
          conditionalOperator: q.conditionalOperator,
          conditionalValue: q.conditionalValue,
        }))
      );
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

          // Get current non-archived questions to detect changes
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

          // Determine if questions have changed
          const currentIds = new Set(currentQuestions.map((q) => q.id));
          const incomingIds = new Set(
            data.questions.filter((q) => q.id).map((q) => q.id!)
          );
          const questionsChanged =
            currentQuestions.length !== data.questions.length ||
            [...currentIds].some((cid) => !incomingIds.has(cid)) ||
            data.questions.some((q) => !q.id);

          let newVersion = template.version;

          if (isUsedInSessions && questionsChanged) {
            // Versioning: increment version, archive all old questions, insert new
            newVersion = template.version + 1;

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

            // Insert all questions as new rows with new UUIDs
            for (const q of data.questions) {
              await tx.insert(templateQuestions).values({
                templateId: id,
                questionText: q.questionText,
                helpText: q.helpText ?? null,
                category: q.category,
                answerType: q.answerType,
                answerConfig: q.answerConfig,
                isRequired: q.isRequired,
                sortOrder: q.sortOrder,
                conditionalOnQuestionId:
                  resolveRefForInsert(q.conditionalOnQuestionId),
                conditionalOperator: q.conditionalOperator ?? null,
                conditionalValue: q.conditionalValue ?? null,
              });
            }
          } else {
            // Not used in sessions -- update in place (upsert pattern)
            // Archive questions that were removed
            for (const cq of currentQuestions) {
              if (!incomingIds.has(cq.id)) {
                await tx
                  .update(templateQuestions)
                  .set({ isArchived: true })
                  .where(eq(templateQuestions.id, cq.id));
              }
            }

            // Update existing and insert new questions
            for (const q of data.questions) {
              if (q.id && currentIds.has(q.id)) {
                // Update existing question
                await tx
                  .update(templateQuestions)
                  .set({
                    questionText: q.questionText,
                    helpText: q.helpText ?? null,
                    category: q.category,
                    answerType: q.answerType,
                    answerConfig: q.answerConfig,
                    isRequired: q.isRequired,
                    sortOrder: q.sortOrder,
                    conditionalOnQuestionId:
                      resolveRefForInsert(q.conditionalOnQuestionId),
                    conditionalOperator: q.conditionalOperator ?? null,
                    conditionalValue: q.conditionalValue ?? null,
                  })
                  .where(eq(templateQuestions.id, q.id));
              } else {
                // Insert new question
                await tx.insert(templateQuestions).values({
                  templateId: id,
                  questionText: q.questionText,
                  helpText: q.helpText ?? null,
                  category: q.category,
                  answerType: q.answerType,
                  answerConfig: q.answerConfig,
                  isRequired: q.isRequired,
                  sortOrder: q.sortOrder,
                  conditionalOnQuestionId:
                    q.conditionalOnQuestionId ?? null,
                  conditionalOperator: q.conditionalOperator ?? null,
                  conditionalValue: q.conditionalValue ?? null,
                });
              }
            }
          }

          // Resolve q-{index} temporary conditional references to real UUIDs
          const hasTemporaryRefs = data.questions.some(
            (q) => q.conditionalOnQuestionId?.match(/^q-\d+$/)
          );
          if (hasTemporaryRefs) {
            // Fetch all current (non-archived) questions ordered by sortOrder
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

            // Build sortOrder → UUID map
            const indexToId = new Map<number, string>();
            for (const rq of resolvedQuestions) {
              indexToId.set(rq.sortOrder, rq.id);
            }

            // Update rows that have temporary refs
            for (const rq of resolvedQuestions) {
              const original = data.questions.find((q) => q.sortOrder === rq.sortOrder);
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

          // Update template metadata
          const [updated] = await tx
            .update(questionnaireTemplates)
            .set({
              name: data.name,
              description: data.description ?? null,
              category: data.category,
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
              questionsChanged,
              isUsedInSessions,
            },
          });

          // Return template with updated questions
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

          return {
            data: {
              ...updated,
              createdAt: updated.createdAt.toISOString(),
              updatedAt: updated.updatedAt.toISOString(),
              questions: updatedQuestions.map((q) => ({
                ...q,
                createdAt: q.createdAt.toISOString(),
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
          if (data.category !== undefined)
            updatePayload.category = data.category;

          const [updated] = await tx
            .update(questionnaireTemplates)
            .set(updatePayload)
            .where(eq(questionnaireTemplates.id, id))
            .returning();

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
              ...(data.category !== undefined && {
                newCategory: data.category,
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
    if (error instanceof Error && error.name === "ZodError") {
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

  if (!canManageTemplates(session.user.role)) {
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
