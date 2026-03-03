import { auth } from "@/lib/auth/config";
import { SessionProvider } from "next-auth/react";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense-in-depth: validate session server-side even if proxy.ts should
  // have already redirected unauthenticated users (CVE-2025-29927 mitigation)
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <SessionProvider session={session}>
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-end border-b px-4 py-2">
          <ThemeToggle />
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </SessionProvider>
  );
}
