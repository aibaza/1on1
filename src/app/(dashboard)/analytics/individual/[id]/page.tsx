import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { EditorialIndividualAnalytics } from "./editorial-individual-analytics";

type PageProps = { params: Promise<{ id: string }> };

export default async function IndividualAnalyticsPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id: userId } = await params;
  return <EditorialIndividualAnalytics userId={userId} />;
}
