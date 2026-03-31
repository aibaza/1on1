import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { requireLevel } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit/log";
import { updateJobRoleSchema } from "@/lib/validations/role";
import { jobRoles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/roles/[id]
 */
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
        const [role] = await tx
          .select()
          .from(jobRoles)
          .where(
            and(eq(jobRoles.id, id), eq(jobRoles.tenantId, session.user.tenantId))
          );

        return role ?? null;
      }
    );

    if (!result) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch role:", error);
    return NextResponse.json(
      { error: "Failed to fetch role" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/roles/[id]
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const levelError = requireLevel(session.user.level, "admin");
  if (levelError) return levelError;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const data = updateJobRoleSchema.parse(body);

    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const [existing] = await tx
          .select({ id: jobRoles.id })
          .from(jobRoles)
          .where(
            and(eq(jobRoles.id, id), eq(jobRoles.tenantId, session.user.tenantId))
          );

        if (!existing) return { error: "Role not found", status: 404 };

        const [updated] = await tx
          .update(jobRoles)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(jobRoles.id, id))
          .returning();

        await logAuditEvent(tx, {
          tenantId: session.user.tenantId,
          actorId: session.user.id,
          action: "job_role_updated",
          resourceType: "job_role",
          resourceId: id,
          metadata: data,
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to update role:", error);
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/roles/[id]
 */
export async function DELETE(request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const levelError = requireLevel(session.user.level, "admin");
  if (levelError) return levelError;

  const { id } = await params;

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const [existing] = await tx
          .select({ id: jobRoles.id, name: jobRoles.name })
          .from(jobRoles)
          .where(
            and(eq(jobRoles.id, id), eq(jobRoles.tenantId, session.user.tenantId))
          );

        if (!existing) return { error: "Role not found", status: 404 };

        await tx.delete(jobRoles).where(eq(jobRoles.id, id));

        await logAuditEvent(tx, {
          tenantId: session.user.tenantId,
          actorId: session.user.id,
          action: "job_role_deleted",
          resourceType: "job_role",
          resourceId: id,
          metadata: { name: existing.name },
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
    console.error("Failed to delete role:", error);
    return NextResponse.json(
      { error: "Failed to delete role" },
      { status: 500 }
    );
  }
}
