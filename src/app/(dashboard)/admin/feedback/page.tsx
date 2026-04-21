import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { auth } from "@/lib/auth/config";
import { isSuperAdmin } from "@/lib/auth/super-admin";
import { fetchAdminFeedbackList } from "@/lib/queries/feedback";
import {
  adminListFiltersSchema,
  type AdminListFilters,
} from "@/lib/validations/feedback";
import { FeedbackMasterDetailShell } from "@/components/feedback/feedback-master-detail-shell";
import { AdminTicketList } from "@/components/feedback/admin-ticket-list";
import { AdminDetailEmpty } from "@/components/feedback/reporter-ticket-detail";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function toSingle(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function AdminFeedbackPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (!isSuperAdmin(session.user.email)) {
    redirect("/overview");
  }

  const tList = await getTranslations("feedback.admin.list");

  const rawParams = await searchParams;
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

  const { data, tenants } = await fetchAdminFeedbackList(
    filters,
    tList("unknown")
  );

  return (
    <FeedbackMasterDetailShell
      hasSelection={false}
      list={
        <AdminTicketList
          initialData={data}
          tenants={tenants}
          selectedId={null}
        />
      }
      detail={<AdminDetailEmpty />}
    />
  );
}
