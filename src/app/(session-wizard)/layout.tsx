import { auth } from "@/lib/auth/config";
import { SessionProvider } from "next-auth/react";
import { redirect } from "next/navigation";
import { QueryProvider } from "@/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";

export default async function WizardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense-in-depth: validate session server-side even if proxy.ts should
  // have already redirected unauthenticated users
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <SessionProvider session={session}>
      <QueryProvider>
        <div className="flex min-h-screen flex-col bg-[var(--background)]">{children}</div>
        <Toaster />
      </QueryProvider>
    </SessionProvider>
  );
}
