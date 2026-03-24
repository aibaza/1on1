import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { withTenantContext } from "@/lib/db/tenant-context";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { AccountClient } from "./account-client";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("account");

  const [user] = await withTenantContext(
    session.user.tenantId,
    session.user.id,
    async (tx) => {
      return tx
        .select({
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          avatarUrl: users.avatarUrl,
          avatarSeed: users.avatarSeed,
          level: users.level,
          emailVerified: users.emailVerified,
        })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);
    }
  );

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
          avatarUrl: user.avatarUrl,
          avatarSeed: user.avatarSeed,
          level: user.level,
          emailVerified: !!user.emailVerified,
        }}
      />
    </div>
  );
}
