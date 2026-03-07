import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
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
  if (!canManageTemplates(session.user.role)) {
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

  // 7-8. Atomic insert inside withTenantContext
  try {
    const created = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Conflict check: name must be unique among non-archived templates
        const existing = await tx
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

        if (existing.length > 0) {
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

        // Insert sections, build sortOrder → sectionId map
        const sectionIdBySortOrder = new Map<number, string>();
        for (const section of importedPayload.sections) {
          const [sec] = await tx
            .insert(templateSections)
            .values({
              templateId: template.id,
              tenantId: session.user.tenantId,
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
              ? (questionIdBySortOrder.get(q.conditionalOnQuestionSortOrder) ??
                null)
              : null;

          const [inserted] = await tx
            .insert(templateQuestions)
            .values({
              templateId: template.id,
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

        // Audit log inside the transaction so it rolls back on failure
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

    return NextResponse.json(
      { templateId: created.id, name: created.name },
      { status: 201 }
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
