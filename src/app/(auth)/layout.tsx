import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { getDesignPreference } from "@/lib/design-preference.server";
import { PublicNav } from "@/app/(marketing)/_components/public-nav";
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

  const designPref = await getDesignPreference();

  // Editorial login is a full-screen split layout — nav on top, footer below
  if (designPref === "editorial") {
    return (
      <div className="relative min-h-screen bg-[var(--background)] flex flex-col">
        <PublicNav />
        <div className="flex-1">
          {children}
        </div>
        <MarketingFooter />
      </div>
    );
  }

  // Classic: centered card layout with nav + footer
  return (
    <div className="relative min-h-screen bg-background flex flex-col">
      <PublicNav />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
      <MarketingFooter />
    </div>
  );
}
