import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { EditorialAnalyticsDashboard } from "@/components/analytics/editorial-analytics-dashboard";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { user } = session;

  // Members can only see their own analytics
  if (user.level === "member") {
    redirect(`/analytics/individual/${user.id}`);
  }

  return <EditorialAnalyticsDashboard currentUserLevel={session.user.level} />;
}
