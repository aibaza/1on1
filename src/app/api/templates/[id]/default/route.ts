import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { isAdmin } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit/log";
import { questionnaireTemplates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  void request; // unused but required by Next.js route handler signature
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Only admins can set org default (not managers)
  if (!isAdmin(session.user.level)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Verify template exists and belongs to tenant
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
          return { error: "Cannot set an archived template as default", status: 400 };
        }

        // Atomically unset all current defaults and set the new one
        // Both happen in the same transaction (withTenantContext wraps in tx)
        await tx
          .update(questionnaireTemplates)
          .set({ isDefault: false })
          .where(
            and(
              eq(questionnaireTemplates.tenantId, session.user.tenantId),
              eq(questionnaireTemplates.isDefault, true)
            )
          );

        await tx
          .update(questionnaireTemplates)
          .set({ isDefault: true, updatedAt: new Date() })
          .where(eq(questionnaireTemplates.id, id));

        await logAuditEvent(tx, {
          tenantId: session.user.tenantId,
          actorId: session.user.id,
          action: "template_set_default",
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
    console.error("Failed to set default template:", error);
    return NextResponse.json(
      { error: "Failed to set default template" },
      { status: 500 }
    );
  }
}
