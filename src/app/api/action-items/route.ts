import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { isAdmin } from "@/lib/auth/rbac";
import {
  actionItems,
  sessions,
  meetingSeries,
  users,
} from "@/lib/db/schema";
import { eq, or, and, asc, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

/**
 * GET /api/action-items
 *
 * Returns all open action items across all series the user participates in
 * (as manager or report), or all series if the user is an admin.
 *
 * Items are sorted by dueDate ASC (NULLS LAST) so overdue items appear first.
 * Includes assignee name, series info, and session number for display.
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
        const assignee = alias(users, "assignee");
        const report = alias(users, "report");

        // Build the base query with all JOINs
        const baseConditions = [
          eq(actionItems.tenantId, session.user.tenantId),
          or(
            eq(actionItems.status, "open"),
            eq(actionItems.status, "in_progress"),
            eq(actionItems.status, "completed")
          ),
        ];

        // Non-admin users can only see items from series they participate in
        if (!isAdmin(session.user.level)) {
          baseConditions.push(
            or(
              eq(meetingSeries.managerId, session.user.id),
              eq(meetingSeries.reportId, session.user.id)
            )!
          );
        }

        const items = await tx
          .select({
            id: actionItems.id,
            title: actionItems.title,
            description: actionItems.description,
            status: actionItems.status,
            dueDate: actionItems.dueDate,
            category: actionItems.category,
            assigneeId: actionItems.assigneeId,
            createdAt: actionItems.createdAt,
            sessionId: actionItems.sessionId,
            // From JOINs
            assigneeFirstName: assignee.firstName,
            assigneeLastName: assignee.lastName,
            seriesId: meetingSeries.id,
            sessionNumber: sessions.sessionNumber,
            reportId: meetingSeries.reportId,
            reportFirstName: report.firstName,
            reportLastName: report.lastName,
            managerId: meetingSeries.managerId,
          })
          .from(actionItems)
          .innerJoin(sessions, eq(actionItems.sessionId, sessions.id))
          .innerJoin(meetingSeries, eq(sessions.seriesId, meetingSeries.id))
          .innerJoin(assignee, eq(actionItems.assigneeId, assignee.id))
          .innerJoin(report, eq(meetingSeries.reportId, report.id))
          .where(and(...baseConditions))
          .orderBy(
            sql`${actionItems.dueDate} ASC NULLS LAST`,
            asc(actionItems.createdAt)
          );

        return items.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          status: item.status,
          dueDate: item.dueDate,
          category: item.category,
          assigneeId: item.assigneeId,
          assigneeFirstName: item.assigneeFirstName,
          assigneeLastName: item.assigneeLastName,
          createdAt: item.createdAt.toISOString(),
          sessionId: item.sessionId,
          sessionNumber: item.sessionNumber,
          seriesId: item.seriesId,
          reportId: item.reportId,
          reportFirstName: item.reportFirstName,
          reportLastName: item.reportLastName,
          managerId: item.managerId,
        }));
      }
    );

    return NextResponse.json({ actionItems: result });
  } catch (error) {
    console.error("Failed to fetch action items:", error);
    return NextResponse.json(
      { error: "Failed to fetch action items" },
      { status: 500 }
    );
  }
}
