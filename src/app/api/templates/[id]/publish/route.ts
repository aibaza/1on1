import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { canManageTemplates } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit/log";
import { questionnaireTemplates, templateQuestions, templateVersions } from "@/lib/db/schema";
import { buildTemplateSnapshot } from "@/lib/templates/snapshot";
import { eq, and, sql } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
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
        const [template] = await tx
          .select({
            id: questionnaireTemplates.id,
            name: questionnaireTemplates.name,
            description: questionnaireTemplates.description,
            isPublished: questionnaireTemplates.isPublished,
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
          return { error: "Cannot publish an archived template", status: 400 };
        }

        const newPublishedState = !template.isPublished;

        // If publishing, ensure at least 1 non-archived question exists
        if (newPublishedState) {
          const [questionCount] = await tx
            .select({ count: sql<number>`cast(count(*) as int)` })
            .from(templateQuestions)
            .where(
              and(
                eq(templateQuestions.templateId, id),
                eq(templateQuestions.isArchived, false)
              )
            );

          if (questionCount.count === 0) {
            return {
              error:
                "Cannot publish a template with no questions. Add at least one question first.",
              status: 400,
            };
          }
        }

        await tx
          .update(questionnaireTemplates)
          .set({ isPublished: newPublishedState, updatedAt: new Date() })
          .where(eq(questionnaireTemplates.id, id));

        // Create version snapshot on publish
        if (newPublishedState) {
          const snapshot = await buildTemplateSnapshot(
            tx,
            id,
            template.name,
            template.description ?? null
          );

          // Get next version number (race-safe: UNIQUE constraint catches conflicts)
          const [maxVersion] = await tx
            .select({ max: sql<number>`coalesce(max(version_number), 0)` })
            .from(templateVersions)
            .where(eq(templateVersions.templateId, id));

          const nextVersion = (maxVersion?.max ?? 0) + 1;

          // Insert version snapshot
          await tx.insert(templateVersions).values({
            templateId: id,
            tenantId: session.user.tenantId,
            versionNumber: nextVersion,
            snapshot: snapshot,
            createdBy: session.user.id,
          });

          // Sync questionnaireTemplates.version with published version number
          await tx
            .update(questionnaireTemplates)
            .set({ version: nextVersion })
            .where(eq(questionnaireTemplates.id, id));
        }

        await logAuditEvent(tx, {
          tenantId: session.user.tenantId,
          actorId: session.user.id,
          action: newPublishedState
            ? "template_published"
            : "template_unpublished",
          resourceType: "template",
          resourceId: id,
          metadata: { templateName: template.name },
        });

        return { data: { isPublished: newPublishedState } };
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
    console.error("Failed to toggle publish status:", error);
    return NextResponse.json(
      { error: "Failed to toggle publish status" },
      { status: 500 }
    );
  }
}
