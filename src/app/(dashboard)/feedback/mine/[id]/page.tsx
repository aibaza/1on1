import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { auth } from "@/lib/auth/config";
import {
  fetchMyFeedbackDetail,
  fetchMyFeedbackList,
} from "@/lib/queries/feedback";
import { FeedbackMasterDetailShell } from "@/components/feedback/feedback-master-detail-shell";
import { ReporterTicketList } from "@/components/feedback/reporter-ticket-list";
import { ReporterTicketDetail } from "@/components/feedback/reporter-ticket-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MyFeedbackDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const tThread = await getTranslations("feedback.admin.thread");
  const locale = await getLocale();

  const [items, detail] = await Promise.all([
    fetchMyFeedbackList(session.user.tenantId, session.user.id),
    fetchMyFeedbackDetail(
      session.user.tenantId,
      session.user.id,
      id,
      tThread("supportTeam")
    ),
  ]);

  if (!detail) {
    notFound();
  }

  const screenshotSrc = detail.report.screenshotUrl
    ? `/api/feedback/screenshots/${detail.report.id}`
    : null;

  return (
    <FeedbackMasterDetailShell
      hasSelection
      list={<ReporterTicketList items={items} selectedId={detail.report.id} />}
      detail={
        <ReporterTicketDetail
          detail={detail}
          locale={locale}
          screenshotSrc={screenshotSrc}
        />
      }
    />
  );
}
