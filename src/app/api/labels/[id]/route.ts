import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { canManageTemplates } from "@/lib/auth/rbac";
import { labelSchema } from "@/lib/validations/template";
import { templateLabels } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

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

  try {
    const data = labelSchema.partial().parse(body);

    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const [label] = await tx
          .select({ id: templateLabels.id })
          .from(templateLabels)
          .where(
            and(
              eq(templateLabels.id, id),
              eq(templateLabels.tenantId, session.user.tenantId)
            )
          );

        if (!label) {
          return { error: "Label not found", status: 404 };
        }

        const updatePayload: Record<string, unknown> = {};
        if (data.name !== undefined) updatePayload.name = data.name;
        if (data.color !== undefined) updatePayload.color = data.color;

        const [updated] = await tx
          .update(templateLabels)
          .set(updatePayload)
          .where(eq(templateLabels.id, id))
          .returning();

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
  } catch (error) {
    console.error("Failed to update label:", error);
    return NextResponse.json(
      { error: "Failed to update label" },
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
        const [label] = await tx
          .select({ id: templateLabels.id })
          .from(templateLabels)
          .where(
            and(
              eq(templateLabels.id, id),
              eq(templateLabels.tenantId, session.user.tenantId)
            )
          );

        if (!label) {
          return { error: "Label not found", status: 404 };
        }

        // Delete label (cascade removes assignments via FK)
        await tx
          .delete(templateLabels)
          .where(eq(templateLabels.id, id));

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
    console.error("Failed to delete label:", error);
    return NextResponse.json(
      { error: "Failed to delete label" },
      { status: 500 }
    );
  }
}
