import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
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
import { EditorialActionItemsPage } from "@/components/action-items/editorial-action-items-page";

export default async function ActionItemsRoute() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const data = await withTenantContext(
    session.user.tenantId,
    session.user.id,
    async (tx) => {
      const assignee = alias(users, "assignee");
      const report = alias(users, "report");

      const baseConditions = [
        eq(actionItems.tenantId, session.user.tenantId),
        or(
          eq(actionItems.status, "open"),
          eq(actionItems.status, "in_progress"),
          eq(actionItems.status, "completed")
        ),
      ];

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

  return <EditorialActionItemsPage initialItems={data} currentUserId={session.user.id} />;
}
