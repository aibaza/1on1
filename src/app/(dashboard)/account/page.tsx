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
          role: users.role,
        })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);
    }
  );

  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8 px-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("description")}</p>
      </div>

      <AccountClient
        user={{
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          avatarUrl: user.avatarUrl,
          avatarSeed: user.avatarSeed,
          role: user.role,
        }}
      />
    </div>
  );
}
