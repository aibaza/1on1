import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { withTenantContext, type TransactionClient } from "@/lib/db/tenant-context";
import { canManageTemplates } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit/log";
import {
  templateImportSchema,
  formatImportErrors,
} from "@/lib/templates/import-schema";
import {
  questionnaireTemplates,
  templateSections,
  templateQuestions,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Local error class for name conflicts — thrown inside transaction so
// withTenantContext rolls back and we can distinguish it from DB errors.
// ---------------------------------------------------------------------------
class ConflictError extends Error {
  conflictName: string;
  constructor(name: string) {
    super("conflict");
    this.name = "ConflictError";
    this.conflictName = name;
  }
}

/**
 * POST /api/templates/import
 *
 * Accepts { payload: unknown, importName: string }.
 * Validates the payload against templateImportSchema, then atomically inserts
 * the template, its sections, and all questions in a single transaction.
 *
 * RBAC: admin or manager only (canManageTemplates).
 * Returns 201 { templateId, name } on success.
 * Returns 422 { errors: ImportError[] } on schema validation failure.
 * Returns 409 { conflict: true, name } when importName already exists.
 */
export async function POST(request: Request) {
  // 1. Auth check
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 2. RBAC check
  if (!canManageTemplates(session.user.level)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3. Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // 4. Validate importName
  const rawImportName =
    body !== null &&
    typeof body === "object" &&
    "importName" in body &&
    typeof (body as Record<string, unknown>).importName === "string"
      ? ((body as Record<string, unknown>).importName as string).trim()
      : "";

  if (!rawImportName) {
    return NextResponse.json(
      { error: "importName is required" },
      { status: 400 }
    );
  }
  const importName = rawImportName;

  // 5. schemaVersion early check for a better error message
  const rawPayload =
    body !== null && typeof body === "object" && "payload" in body
      ? (body as Record<string, unknown>).payload
      : undefined;

  if (
    typeof rawPayload === "object" &&
    rawPayload !== null &&
    "schemaVersion" in rawPayload
  ) {
    const v = (rawPayload as Record<string, unknown>).schemaVersion;
    if (v !== 1) {
      return NextResponse.json(
        {
          errors: [
            {
              path: "schemaVersion",
              message: `Schema version ${String(v)} is not supported. Only version 1 is supported.`,
            },
          ],
        },
        { status: 422 }
      );
    }
  }

  // 6. Full schema validation
  const result = templateImportSchema.safeParse(rawPayload);
  if (!result.success) {
    return NextResponse.json(
      { errors: formatImportErrors(result.error) },
      { status: 422 }
    );
  }
  const importedPayload = result.data;

  // Optional: update an existing template instead of creating a new one
  const targetTemplateId =
    body !== null &&
    typeof body === "object" &&
    "targetTemplateId" in body &&
    typeof (body as Record<string, unknown>).targetTemplateId === "string"
      ? ((body as Record<string, unknown>).targetTemplateId as string)
      : null;

  // Helper: insert sections + questions under a given templateId, returning the template row
  async function insertSectionsAndQuestions(
    tx: TransactionClient,
    templateId: string,
    tenantId: string
  ) {
    const sectionIdBySortOrder = new Map<number, string>();
    for (const section of importedPayload.sections) {
      const [sec] = await tx
        .insert(templateSections)
        .values({
          templateId,
          tenantId,
          name: section.name,
          description: section.description ?? null,
          sortOrder: section.sortOrder,
        })
        .returning();
      sectionIdBySortOrder.set(section.sortOrder, sec.id);
    }

    // Flatten questions across all sections, sorted by global sortOrder.
    // conditionalOnQuestionSortOrder references this global flat list.
    const allQuestions = importedPayload.sections
      .flatMap((s) =>
        s.questions.map((q) => ({ ...q, sectionSortOrder: s.sortOrder }))
      )
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const questionIdBySortOrder = new Map<number, string>();
    for (const q of allQuestions) {
      const sectionId = sectionIdBySortOrder.get(q.sectionSortOrder)!;
      const conditionalOnQuestionId =
        q.conditionalOnQuestionSortOrder !== null
          ? (questionIdBySortOrder.get(q.conditionalOnQuestionSortOrder) ?? null)
          : null;

      const [inserted] = await tx
        .insert(templateQuestions)
        .values({
          templateId,
          sectionId,
          questionText: q.questionText,
          helpText: q.helpText ?? null,
          answerType: q.answerType,
          answerConfig: q.answerConfig ?? {},
          isRequired: q.isRequired,
          sortOrder: q.sortOrder,
          scoreWeight: String(q.scoreWeight),
          conditionalOnQuestionId,
          conditionalOperator: q.conditionalOperator ?? null,
          conditionalValue: q.conditionalValue ?? null,
        })
        .returning();

      questionIdBySortOrder.set(q.sortOrder, inserted.id);
    }
  }

  // 7-8. Atomic insert/update inside withTenantContext
  try {
    const created = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        if (targetTemplateId) {
          // Update mode: replace content of an existing template
          const [existing] = await tx
            .select({ id: questionnaireTemplates.id })
            .from(questionnaireTemplates)
            .where(
              and(
                eq(questionnaireTemplates.id, targetTemplateId),
                eq(questionnaireTemplates.tenantId, session.user.tenantId),
                eq(questionnaireTemplates.isArchived, false)
              )
            )
            .limit(1);

          if (!existing) {
            return NextResponse.json(
              { error: "Template not found" },
              { status: 404 }
            );
          }

          // Archive all existing non-archived sections and questions
          await tx
            .update(templateSections)
            .set({ isArchived: true })
            .where(
              and(
                eq(templateSections.templateId, targetTemplateId),
                eq(templateSections.isArchived, false)
              )
            );
          await tx
            .update(templateQuestions)
            .set({ isArchived: true })
            .where(
              and(
                eq(templateQuestions.templateId, targetTemplateId),
                eq(templateQuestions.isArchived, false)
              )
            );

          // Insert fresh sections and questions
          await insertSectionsAndQuestions(tx, targetTemplateId, session.user.tenantId);

          // Update template header
          const [updated] = await tx
            .update(questionnaireTemplates)
            .set({
              name: importName,
              description: importedPayload.description ?? null,
              updatedAt: new Date(),
            })
            .where(eq(questionnaireTemplates.id, targetTemplateId))
            .returning();

          await logAuditEvent(tx, {
            tenantId: session.user.tenantId,
            actorId: session.user.id,
            action: "template_updated",
            resourceType: "template",
            resourceId: targetTemplateId,
            metadata: {
              name: importName,
              sourceLanguage: importedPayload.language,
              via: "ai_editor",
            },
          });

          return updated;
        }

        // Create mode: conflict check + insert new template
        const conflictCheck = await tx
          .select({ id: questionnaireTemplates.id })
          .from(questionnaireTemplates)
          .where(
            and(
              eq(questionnaireTemplates.tenantId, session.user.tenantId),
              eq(questionnaireTemplates.name, importName),
              eq(questionnaireTemplates.isArchived, false)
            )
          )
          .limit(1);

        if (conflictCheck.length > 0) {
          throw new ConflictError(importName);
        }

        // Insert template header
        const [template] = await tx
          .insert(questionnaireTemplates)
          .values({
            tenantId: session.user.tenantId,
            name: importName,
            description: importedPayload.description ?? null,
            createdBy: session.user.id,
            isPublished: false,
            isDefault: false,
          })
          .returning();

        await insertSectionsAndQuestions(tx, template.id, session.user.tenantId);

        await logAuditEvent(tx, {
          tenantId: session.user.tenantId,
          actorId: session.user.id,
          action: "template_imported",
          resourceType: "template",
          resourceId: template.id,
          metadata: {
            name: template.name,
            sourceLanguage: importedPayload.language,
          },
        });

        return template;
      }
    );

    if (created instanceof NextResponse) return created;

    return NextResponse.json(
      { templateId: created.id, name: created.name },
      { status: targetTemplateId ? 200 : 201 }
    );
  } catch (error) {
    if (error instanceof ConflictError) {
      return NextResponse.json(
        { conflict: true, name: error.conflictName },
        { status: 409 }
      );
    }
    // Use z.ZodError instanceof (not string comparison) — fixes known codebase pattern
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { errors: formatImportErrors(error) },
        { status: 422 }
      );
    }
    console.error("[templates/import] Error:", error);
    return NextResponse.json(
      { error: "Failed to import template" },
      { status: 500 }
    );
  }
}
