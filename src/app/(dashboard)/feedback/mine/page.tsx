import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/config";
import { fetchMyFeedbackList } from "@/lib/queries/feedback";
import { FeedbackMasterDetailShell } from "@/components/feedback/feedback-master-detail-shell";
import { ReporterTicketList } from "@/components/feedback/reporter-ticket-list";
import { ReporterDetailEmpty } from "@/components/feedback/reporter-ticket-detail";

export default async function MyFeedbackPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const items = await fetchMyFeedbackList(
    session.user.tenantId,
    session.user.id
  );

  return (
    <FeedbackMasterDetailShell
      hasSelection={false}
      list={<ReporterTicketList items={items} selectedId={null} />}
      detail={<ReporterDetailEmpty />}
    />
  );
}
