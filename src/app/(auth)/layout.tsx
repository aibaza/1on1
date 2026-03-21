import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { getDesignPreference } from "@/lib/design-preference.server";

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

  // Editorial login is a full-screen split layout — no wrapper needed
  if (designPref === "editorial") {
    return (
      <div className="relative min-h-screen bg-[var(--background)]">
        <div className="absolute right-4 top-4 z-50">
          <ThemeToggle />
        </div>
        {children}
      </div>
    );
  }

  // Classic: centered card layout
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo className="h-10" />
        </div>
        {children}
      </div>
    </div>
  );
}
