import { cache } from "react";
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { adminDb } from "@/lib/db";
import { withTenantContext } from "@/lib/db/tenant-context";
import {
  feedbackMessages,
  feedbackReports,
  tenants,
  users,
} from "@/lib/db/schema";
import type { FeedbackThreadMessage } from "@/components/feedback/feedback-thread";
import type {
  AdminFeedbackListItem,
  AdminFeedbackListResponse,
} from "@/components/feedback/admin-ticket-list";
import type { AdminListFilters } from "@/lib/validations/feedback";

export interface MyFeedbackListItem {
  id: string;
  ticketNumber: number;
  type: "bug" | "suggestion";
  title: string;
  status:
    | "new"
    | "triaged"
    | "in_progress"
    | "awaiting_user"
    | "resolved"
    | "closed";
  createdAt: Date;
}

export const fetchMyFeedbackList = cache(
  async (tenantId: string, userId: string): Promise<MyFeedbackListItem[]> => {
    return withTenantContext(tenantId, userId, async (tx) => {
      return tx
        .select({
          id: feedbackReports.id,
          ticketNumber: feedbackReports.ticketNumber,
          type: feedbackReports.type,
          title: feedbackReports.title,
          status: feedbackReports.status,
          createdAt: feedbackReports.createdAt,
        })
        .from(feedbackReports)
        .where(
          and(
            eq(feedbackReports.tenantId, tenantId),
            eq(feedbackReports.userId, userId)
          )
        )
        .orderBy(desc(feedbackReports.createdAt));
    });
  }
);

type ReportRow = typeof feedbackReports.$inferSelect;

export interface MyFeedbackDetail {
  report: ReportRow;
  messages: FeedbackThreadMessage[];
}

export async function fetchMyFeedbackDetail(
  tenantId: string,
  userId: string,
  reportId: string,
  supportTeamLabel: string
): Promise<MyFeedbackDetail | null> {
  return withTenantContext(tenantId, userId, async (tx) => {
    const [reportRow] = await tx
      .select()
      .from(feedbackReports)
      .where(
        and(
          eq(feedbackReports.id, reportId),
          eq(feedbackReports.tenantId, tenantId),
          eq(feedbackReports.userId, userId)
        )
      )
      .limit(1);

    if (!reportRow) return null;

    const messageRows = await tx
      .select({
        id: feedbackMessages.id,
        body: feedbackMessages.body,
        authorType: feedbackMessages.authorType,
        authorId: feedbackMessages.authorId,
        isInternal: feedbackMessages.isInternal,
        createdAt: feedbackMessages.createdAt,
        authorName: users.name,
        authorFirstName: users.firstName,
        authorLastName: users.lastName,
        authorAvatarUrl: users.avatarUrl,
      })
      .from(feedbackMessages)
      .leftJoin(users, eq(users.id, feedbackMessages.authorId))
      .where(
        and(
          eq(feedbackMessages.feedbackId, reportRow.id),
          eq(feedbackMessages.tenantId, tenantId),
          eq(feedbackMessages.isInternal, false)
        )
      )
      .orderBy(asc(feedbackMessages.createdAt));

    const messages: FeedbackThreadMessage[] = messageRows.map((row) => {
      const isAdmin = row.authorType === "platform_admin";
      const fullName = [row.authorFirstName, row.authorLastName]
        .filter(Boolean)
        .join(" ")
        .trim();
      const name = isAdmin
        ? supportTeamLabel
        : row.authorName && row.authorName.trim().length > 0
          ? row.authorName
          : fullName.length > 0
            ? fullName
            : null;
      return {
        id: row.id,
        body: row.body,
        authorType: row.authorType,
        authorId: row.authorId,
        authorName: name,
        authorAvatarUrl: isAdmin ? null : row.authorAvatarUrl,
        isInternal: row.isInternal,
        createdAt: row.createdAt,
      };
    });

    return { report: reportRow, messages };
  });
}

export interface AdminListQueryResult {
  data: AdminFeedbackListResponse;
  tenants: { id: string; name: string }[];
}

export const fetchAdminFeedbackList = cache(
  async (
    filters: AdminListFilters,
    unknownFallback: string
  ): Promise<AdminListQueryResult> => {
    const conditions: SQL<unknown>[] = [];
    if (filters.status)
      conditions.push(eq(feedbackReports.status, filters.status));
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
      const needle = `%${filters.q}%`;
      const orClause = or(
        ilike(feedbackReports.title, needle),
        ilike(feedbackReports.description, needle)
      );
      if (orClause) conditions.push(orClause);
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const reporterUser = alias(users, "reporter_user");
    const assignedUser = alias(users, "assigned_user");
    const offset = (filters.page - 1) * filters.pageSize;

    const [rows, totalCountRows, tenantRows] = await Promise.all([
      adminDb
        .select({
          id: feedbackReports.id,
          ticketNumber: feedbackReports.ticketNumber,
          type: feedbackReports.type,
          title: feedbackReports.title,
          status: feedbackReports.status,
          priority: feedbackReports.priority,
          tags: feedbackReports.tags,
          createdAt: feedbackReports.createdAt,
          updatedAt: feedbackReports.updatedAt,
          tenantId: feedbackReports.tenantId,
          tenantName: tenants.name,
          reporterId: reporterUser.id,
          reporterName: reporterUser.name,
          reporterEmail: reporterUser.email,
          assignedId: assignedUser.id,
          assignedName: assignedUser.name,
          assignedEmail: assignedUser.email,
          assignedAvatar: assignedUser.avatarUrl,
        })
        .from(feedbackReports)
        .leftJoin(tenants, eq(tenants.id, feedbackReports.tenantId))
        .leftJoin(reporterUser, eq(reporterUser.id, feedbackReports.userId))
        .leftJoin(
          assignedUser,
          eq(assignedUser.id, feedbackReports.assignedToUserId)
        )
        .where(whereClause)
        .orderBy(desc(feedbackReports.updatedAt))
        .limit(filters.pageSize)
        .offset(offset),
      adminDb
        .select({ count: sql<number>`count(*)::int` })
        .from(feedbackReports)
        .where(whereClause),
      adminDb
        .select({ id: tenants.id, name: tenants.name })
        .from(tenants)
        .orderBy(tenants.name),
    ]);

    const total = totalCountRows[0]?.count ?? 0;

    const items: AdminFeedbackListItem[] = rows.map((r) => ({
      id: r.id,
      ticketNumber: r.ticketNumber,
      type: r.type,
      title: r.title,
      status: r.status,
      priority: r.priority,
      tags: r.tags ?? [],
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      reporter: r.reporterId
        ? {
            id: r.reporterId,
            name: r.reporterName,
            email: r.reporterEmail,
          }
        : null,
      tenant: r.tenantId
        ? { id: r.tenantId, name: r.tenantName ?? unknownFallback }
        : null,
      assignedTo: r.assignedId
        ? {
            id: r.assignedId,
            name: r.assignedName,
            email: r.assignedEmail,
            avatarUrl: r.assignedAvatar,
          }
        : null,
    }));

    return {
      data: {
        items,
        total,
        page: filters.page,
        pageSize: filters.pageSize,
      },
      tenants: tenantRows,
    };
  }
);
