import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (session) {
    redirect("/overview");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
