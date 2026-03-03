import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { requireRole } from "@/lib/auth/rbac";
import { auditLog, users } from "@/lib/db/schema";
import { eq, and, gte, lte, like, or, sql, count } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const roleError = requireRole(session.user.role, "admin");
  if (roleError) return roleError;

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const search = searchParams.get("search");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const offset = (page - 1) * limit;

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Build WHERE conditions
        const conditions = [eq(auditLog.tenantId, session.user.tenantId)];

        if (action) {
          conditions.push(eq(auditLog.action, action));
        }
        if (from) {
          conditions.push(gte(auditLog.createdAt, new Date(from)));
        }
        if (to) {
          // Set to end of day
          const toDate = new Date(to);
          toDate.setHours(23, 59, 59, 999);
          conditions.push(lte(auditLog.createdAt, toDate));
        }
        if (search) {
          const searchPattern = `%${search}%`;
          conditions.push(
            or(
              like(auditLog.action, searchPattern),
              like(auditLog.resourceType, searchPattern)
            )!
          );
        }

        const whereClause = and(...conditions);

        // Get total count
        const [totalResult] = await tx
          .select({ value: count() })
          .from(auditLog)
          .where(whereClause);

        const total = totalResult.value;
        const totalPages = Math.ceil(total / limit);

        // Get entries with actor info
        const entries = await tx
          .select({
            id: auditLog.id,
            actorId: auditLog.actorId,
            actorFirstName: users.firstName,
            actorLastName: users.lastName,
            actorEmail: users.email,
            action: auditLog.action,
            resourceType: auditLog.resourceType,
            resourceId: auditLog.resourceId,
            metadata: auditLog.metadata,
            ipAddress: auditLog.ipAddress,
            createdAt: auditLog.createdAt,
          })
          .from(auditLog)
          .leftJoin(users, eq(auditLog.actorId, users.id))
          .where(whereClause)
          .orderBy(sql`${auditLog.createdAt} DESC`)
          .limit(limit)
          .offset(offset);

        return {
          entries: entries.map((e) => ({
            id: e.id,
            actorName:
              e.actorFirstName && e.actorLastName
                ? `${e.actorFirstName} ${e.actorLastName}`
                : "System",
            actorEmail: e.actorEmail ?? null,
            action: e.action,
            resourceType: e.resourceType,
            resourceId: e.resourceId,
            metadata: e.metadata,
            ipAddress: e.ipAddress,
            createdAt: e.createdAt.toISOString(),
          })),
          total,
          page,
          totalPages,
        };
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch audit log:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit log" },
      { status: 500 }
    );
  }
}
