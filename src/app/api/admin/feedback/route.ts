import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { eq, and, desc, sql, or, ilike } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { isSuperAdmin } from "@/lib/auth/super-admin";
import { adminDb } from "@/lib/db";
import { feedbackReports, tenants, users } from "@/lib/db/schema";
import { adminListFiltersSchema } from "@/lib/validations/feedback";

/**
 * GET /api/admin/feedback — cross-tenant list of feedback reports for the
 * platform admin console. Supports status/priority/type/tenant/assignee/q
 * filters plus pagination.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!isSuperAdmin(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let filters;
  try {
    filters = adminListFiltersSchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query", details: err },
        { status: 400 }
      );
    }
    throw err;
  }

  const conditions = [] as ReturnType<typeof eq>[];
  if (filters.status) conditions.push(eq(feedbackReports.status, filters.status));
  if (filters.priority)
    conditions.push(eq(feedbackReports.priority, filters.priority));
  if (filters.type) conditions.push(eq(feedbackReports.type, filters.type));
  if (filters.tenantId)
    conditions.push(eq(feedbackReports.tenantId, filters.tenantId));
  if (filters.assignedToUserId)
    conditions.push(
      eq(feedbackReports.assignedToUserId, filters.assignedToUserId)
    );
  if (filters.q) {
    const term = `%${filters.q}%`;
    const search = or(
      ilike(feedbackReports.title, term),
      ilike(feedbackReports.description, term)
    );
    if (search) conditions.push(search as unknown as ReturnType<typeof eq>);
  }

  const whereClause =
    conditions.length > 0 ? and(...conditions) : undefined;

  try {
    const offset = (filters.page - 1) * filters.pageSize;

    const items = await adminDb
      .select({
        id: feedbackReports.id,
        ticketNumber: feedbackReports.ticketNumber,
        tenantId: feedbackReports.tenantId,
        tenantName: tenants.name,
        userId: feedbackReports.userId,
        reporterFirstName: users.firstName,
        reporterLastName: users.lastName,
        reporterEmail: users.email,
        type: feedbackReports.type,
        title: feedbackReports.title,
        status: feedbackReports.status,
        priority: feedbackReports.priority,
        tags: feedbackReports.tags,
        assignedToUserId: feedbackReports.assignedToUserId,
        createdAt: feedbackReports.createdAt,
        updatedAt: feedbackReports.updatedAt,
      })
      .from(feedbackReports)
      .leftJoin(tenants, eq(feedbackReports.tenantId, tenants.id))
      .leftJoin(users, eq(feedbackReports.userId, users.id))
      .where(whereClause)
      .orderBy(desc(feedbackReports.createdAt))
      .limit(filters.pageSize)
      .offset(offset);

    const totalRows = await adminDb
      .select({ count: sql<number>`count(*)::int` })
      .from(feedbackReports)
      .where(whereClause);
    const total = totalRows[0]?.count ?? 0;

    return NextResponse.json({
      items,
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    });
  } catch (err) {
    console.error("Failed to list admin feedback:", err);
    return NextResponse.json(
      { error: "Failed to list feedback" },
      { status: 500 }
    );
  }
}
