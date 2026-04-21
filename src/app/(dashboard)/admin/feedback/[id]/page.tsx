import { auth } from "@/lib/auth/config";
import { redirect, notFound } from "next/navigation";
import { isSuperAdmin } from "@/lib/auth/super-admin";
import { adminDb } from "@/lib/db";
import { feedbackMessages, feedbackReports } from "@/lib/db/schema/feedback";
import { tenants } from "@/lib/db/schema/tenants";
import { users } from "@/lib/db/schema/users";
import { asc, eq, inArray } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import {
  adminListFiltersSchema,
  type AdminListFilters,
} from "@/lib/validations/feedback";
import { fetchAdminFeedbackList } from "@/lib/queries/feedback";
import {
  AdminFeedbackDetail,
  type AdminFeedbackReport,
  type AdminFeedbackReporter,
  type AdminFeedbackTenant,
} from "@/components/feedback/admin-feedback-detail";
import type { AdminThreadMessage } from "@/components/feedback/admin-thread";
import type { AssigneeOption } from "@/components/feedback/admin-controls-panel";
import { FeedbackMasterDetailShell } from "@/components/feedback/feedback-master-detail-shell";
import { AdminTicketList } from "@/components/feedback/admin-ticket-list";

const SUPERADMIN_EMAILS = (
  process.env.SUPERADMIN_EMAILS || "ciprian.dobrea@gmail.com"
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function toSingle(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function AdminFeedbackDetailPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const rawParams = await searchParams;
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!isSuperAdmin(session.user.email)) {
    redirect("/overview");
  }

  const tList = await getTranslations("feedback.admin.list");

  const parsed = adminListFiltersSchema.safeParse({
    status: toSingle(rawParams.status),
    priority: toSingle(rawParams.priority),
    type: toSingle(rawParams.type),
    tenantId: toSingle(rawParams.tenantId),
    assignedToUserId: toSingle(rawParams.assignedToUserId),
    q: toSingle(rawParams.q),
    page: toSingle(rawParams.page),
    pageSize: toSingle(rawParams.pageSize),
  });
  const filters: AdminListFilters = parsed.success
    ? parsed.data
    : { page: 1, pageSize: 25 };

  const [{ data: listData, tenants: tenantOptions }, [report]] =
    await Promise.all([
      fetchAdminFeedbackList(filters, tList("unknown")),
      adminDb
        .select()
        .from(feedbackReports)
        .where(eq(feedbackReports.id, id))
        .limit(1),
    ]);

  if (!report) {
    notFound();
  }

  const [messages, reporterRows, tenantRows, superAdminRows] =
    await Promise.all([
      adminDb
        .select()
        .from(feedbackMessages)
        .where(eq(feedbackMessages.feedbackId, report.id))
        .orderBy(asc(feedbackMessages.createdAt)),
      adminDb
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(eq(users.id, report.userId))
        .limit(1),
      adminDb
        .select({ id: tenants.id, name: tenants.name, slug: tenants.slug })
        .from(tenants)
        .where(eq(tenants.id, report.tenantId))
        .limit(1),
      SUPERADMIN_EMAILS.length > 0
        ? adminDb
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
              avatarUrl: users.avatarUrl,
            })
            .from(users)
            .where(inArray(users.email, SUPERADMIN_EMAILS))
        : Promise.resolve([] as AssigneeOption[]),
    ]);

  const reporter: AdminFeedbackReporter | null = reporterRows[0]
    ? {
        id: reporterRows[0].id,
        name: reporterRows[0].name,
        email: reporterRows[0].email,
        avatarUrl: reporterRows[0].avatarUrl,
      }
    : null;

  const tenant: AdminFeedbackTenant | null = tenantRows[0]
    ? {
        id: tenantRows[0].id,
        name: tenantRows[0].name,
        slug: tenantRows[0].slug,
      }
    : null;

  const assigneesById = new Map<string, AssigneeOption>();
  for (const a of superAdminRows) {
    if (!assigneesById.has(a.id)) {
      assigneesById.set(a.id, {
        id: a.id,
        name: a.name,
        email: a.email,
        avatarUrl: a.avatarUrl,
      });
    }
  }
  const assignees = Array.from(assigneesById.values());

  const reportData: AdminFeedbackReport = {
    id: report.id,
    ticketNumber: report.ticketNumber,
    type: report.type,
    title: report.title,
    description: report.description,
    status: report.status,
    priority: report.priority,
    tags: report.tags ?? [],
    screenshotUrl: report.screenshotUrl,
    pageUrl: report.pageUrl,
    viewport: report.viewport,
    userAgent: report.userAgent,
    assignedToUserId: report.assignedToUserId,
    closeReason: report.closeReason,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
    resolvedAt: report.resolvedAt ? report.resolvedAt.toISOString() : null,
  };

  const initialMessages: AdminThreadMessage[] = messages.map((m) => ({
    id: m.id,
    body: m.body,
    authorType: m.authorType,
    authorId: m.authorId,
    isInternal: m.isInternal,
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <FeedbackMasterDetailShell
      hasSelection
      list={
        <AdminTicketList
          initialData={listData}
          tenants={tenantOptions}
          selectedId={report.id}
        />
      }
      detail={
        <AdminFeedbackDetail
          reportData={reportData}
          initialMessages={initialMessages}
          reporter={reporter}
          tenant={tenant}
          assignees={assignees}
        />
      }
    />
  );
}
