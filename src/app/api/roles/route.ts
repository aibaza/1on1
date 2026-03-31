import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { requireLevel } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit/log";
import { createJobRoleSchema } from "@/lib/validations/role";
import { jobRoles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/roles
 *
 * List all job roles for the tenant.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        return tx
          .select({
            id: jobRoles.id,
            name: jobRoles.name,
            description: jobRoles.description,
            createdAt: jobRoles.createdAt,
          })
          .from(jobRoles)
          .where(eq(jobRoles.tenantId, session.user.tenantId))
          .orderBy(jobRoles.name);
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch roles:", error);
    return NextResponse.json(
      { error: "Failed to fetch roles" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/roles
 *
 * Create a new job role. Admin only.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const levelError = requireLevel(session.user.level, "admin");
  if (levelError) return levelError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const data = createJobRoleSchema.parse(body);

    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const [role] = await tx
          .insert(jobRoles)
          .values({
            tenantId: session.user.tenantId,
            name: data.name,
            description: data.description ?? null,
          })
          .returning();

        await logAuditEvent(tx, {
          tenantId: session.user.tenantId,
          actorId: session.user.id,
          action: "job_role_created",
          resourceType: "job_role",
          resourceId: role.id,
          metadata: { name: data.name },
        });

        return role;
      }
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to create role:", error);
    return NextResponse.json(
      { error: "Failed to create role" },
      { status: 500 }
    );
  }
}
