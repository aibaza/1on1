import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { adminDb } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LogoutButton } from "@/components/auth/logout-button";
import { EmailVerificationBanner } from "@/components/auth/email-verification-banner";

export default async function OverviewPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { user } = session;

  const tenant = await adminDb.query.tenants.findFirst({
    where: eq(tenants.id, user.tenantId),
    columns: { name: true },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      {!user.emailVerified && <EmailVerificationBanner />}

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            Welcome{user.name ? `, ${user.name}` : ""}
          </CardTitle>
          <CardDescription>
            Here is your account overview.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role</span>
              <span className="capitalize">{user.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Organization</span>
              <span>{tenant?.name ?? "Unknown"}</span>
            </div>
          </div>

          <div className="pt-4">
            <LogoutButton />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
