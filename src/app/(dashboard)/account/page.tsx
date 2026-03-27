import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { withTenantContext } from "@/lib/db/tenant-context";
import { users, calendarConnections } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { adminDb } from "@/lib/db";
import { AccountClient } from "./account-client";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("account");

  const [user, calendarConn] = await Promise.all([
    withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const rows = await tx
          .select({
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            jobTitle: users.jobTitle,
            avatarUrl: users.avatarUrl,
            avatarSeed: users.avatarSeed,
            level: users.level,
            emailVerified: users.emailVerified,
          })
          .from(users)
          .where(eq(users.id, session.user.id))
          .limit(1);
        return rows[0] ?? null;
      }
    ),
    // Calendar connections are not tenant-scoped — query with adminDb
    adminDb
      .select({
        provider: calendarConnections.provider,
        providerEmail: calendarConnections.providerEmail,
        enabled: calendarConnections.enabled,
      })
      .from(calendarConnections)
      .where(
        and(
          eq(calendarConnections.userId, session.user.id),
          eq(calendarConnections.provider, "google")
        )
      )
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  if (!user) redirect("/login");

  return (
    <div className="pb-12 px-4 md:px-12">
      <header className="mb-12">
        <h1 className="text-4xl font-headline font-extrabold text-foreground tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          {user.firstName} {user.lastName}
        </p>
      </header>

      <AccountClient
        user={{
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          jobTitle: user.jobTitle,
          avatarUrl: user.avatarUrl,
          avatarSeed: user.avatarSeed,
          level: user.level,
          emailVerified: !!user.emailVerified,
        }}
        canEditJobTitle={session.user.level === "admin" || session.user.level === "manager"}
        calendarConnection={
          calendarConn
            ? {
                provider: calendarConn.provider,
                email: calendarConn.providerEmail,
                enabled: calendarConn.enabled,
              }
            : null
        }
      />
    </div>
  );
}
