import type { NextAuthConfig } from "next-auth";
import { adminDb } from "@/lib/db";

type SignInParams = Parameters<NonNullable<NonNullable<NextAuthConfig["callbacks"]>["signIn"]>>[0];

export async function signInCallback({ user, account }: SignInParams) {
  // Block OAuth sign-in for users without existing records
  if (
    account?.provider === "google" ||
    account?.provider === "microsoft-entra-id"
  ) {
    const existingUser = await adminDb.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, user.email!),
    });

    if (!existingUser) {
      // OAuth users must be invited first or register org with credentials
      return false;
    }

    // Set language claims for OAuth users (contentLanguage from settings.preferredLanguage)
    const tenant = await adminDb.query.tenants.findFirst({
      where: (t, { eq }) => eq(t.id, existingUser.tenantId),
      columns: { settings: true },
    });
    const oauthTenantSettings = (tenant?.settings ?? {}) as Record<string, unknown>;
    user.uiLanguage = existingUser.language ?? "en";
    user.contentLanguage = (oauthTenantSettings.preferredLanguage as string | undefined) ?? "en";

    return true;
  }
  return true;
}
