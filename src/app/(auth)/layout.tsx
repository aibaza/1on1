import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { MarketingNav } from "@/app/(marketing)/_components/marketing-nav";
import { MarketingFooter } from "@/app/(marketing)/_components/marketing-footer";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (session) {
    redirect("/overview");
  }

  // Editorial login is a full-screen split layout — nav on top, footer below
  return (
    <div className="relative min-h-screen bg-[var(--background)] flex flex-col">
      <MarketingNav />
      <div className="flex-1">
        {children}
      </div>
      <MarketingFooter />
    </div>
  );
}
