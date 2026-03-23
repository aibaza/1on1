import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { EditorialTeamAnalytics } from "./editorial-team-analytics";

type PageProps = { params: Promise<{ id: string }> };

export default async function TeamAnalyticsPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id: managerId } = await params;

  // For now, only editorial view
  return <EditorialTeamAnalytics managerId={managerId} />;
}
