import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { canManageTemplates } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit/log";
import { createTemplateSchema } from "@/lib/validations/template";
import {
  questionnaireTemplates,
  templateQuestions,
  templateLabelAssignments,
  templateLabels,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const includeArchived = searchParams.get("include_archived") === "true";

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const baseConditions = [
          eq(questionnaireTemplates.tenantId, session.user.tenantId),
        ];

        if (!includeArchived) {
          baseConditions.push(
            eq(questionnaireTemplates.isArchived, false)
          );
        }

        const templates = await tx
          .select({
            id: questionnaireTemplates.id,
            name: questionnaireTemplates.name,
            description: questionnaireTemplates.description,
            isDefault: questionnaireTemplates.isDefault,
            isPublished: questionnaireTemplates.isPublished,
            isArchived: questionnaireTemplates.isArchived,
            version: questionnaireTemplates.version,
            createdAt: questionnaireTemplates.createdAt,
            questionCount:
              sql<number>`cast(count(${templateQuestions.id}) as int)`,
          })
          .from(questionnaireTemplates)
          .leftJoin(
            templateQuestions,
            and(
              eq(templateQuestions.templateId, questionnaireTemplates.id),
              eq(templateQuestions.isArchived, false)
            )
          )
          .where(and(...baseConditions))
          .groupBy(questionnaireTemplates.id)
          .orderBy(questionnaireTemplates.name);

        // Fetch labels for all templates
        const templateIds = templates.map((t) => t.id);
        const labelsByTemplate = new Map<
          string,
          Array<{ id: string; name: string; color: string | null }>
        >();

        if (templateIds.length > 0) {
          const assignments = await tx
            .select({
              templateId: templateLabelAssignments.templateId,
              labelId: templateLabels.id,
              labelName: templateLabels.name,
              labelColor: templateLabels.color,
            })
            .from(templateLabelAssignments)
            .innerJoin(
              templateLabels,
              eq(templateLabelAssignments.labelId, templateLabels.id)
            );

          for (const a of assignments) {
            if (!labelsByTemplate.has(a.templateId)) {
              labelsByTemplate.set(a.templateId, []);
            }
            labelsByTemplate.get(a.templateId)!.push({
              id: a.labelId,
              name: a.labelName,
              color: a.labelColor,
            });
          }
        }

        return templates.map((t) => ({
          ...t,
          createdAt: t.createdAt.toISOString(),
          labels: labelsByTemplate.get(t.id) ?? [],
        }));
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!canManageTemplates(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const data = createTemplateSchema.parse(body);

    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const [template] = await tx
          .insert(questionnaireTemplates)
          .values({
            tenantId: session.user.tenantId,
            name: data.name,
            description: data.description ?? null,
            createdBy: session.user.id,
          })
          .returning();

        // Create label assignments if provided
        if (data.labelIds && data.labelIds.length > 0) {
          await tx.insert(templateLabelAssignments).values(
            data.labelIds.map((labelId) => ({
              templateId: template.id,
              labelId,
            }))
          );
        }

        await logAuditEvent(tx, {
          tenantId: session.user.tenantId,
          actorId: session.user.id,
          action: "template_created",
          resourceType: "template",
          resourceId: template.id,
          metadata: { templateName: data.name },
        });

        return template;
      }
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to create template:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
