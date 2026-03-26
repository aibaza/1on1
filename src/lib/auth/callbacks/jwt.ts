import type { JWT } from "next-auth/jwt";
import type { User } from "next-auth";
import { adminDb } from "@/lib/db";

export async function jwtCallback({
  token,
  user,
  trigger,
}: {
  token: JWT;
  user?: User;
  trigger?: "signIn" | "signUp" | "update";
}) {
  if (user) {
    token.tenantId = user.tenantId;
    token.level = user.level;
    token.userId = user.id!;
    token.emailVerified = user.emailVerified ?? null;
    token.uiLanguage = user.uiLanguage ?? "en";
    token.contentLanguage = user.contentLanguage ?? "en";
  }

  // Backward compat: handle old JWT tokens that still carry "role"
  if (!token.level && (token as Record<string, unknown>).role) {
    token.level = (token as Record<string, unknown>).role as string;
  }

  // Support language switching and avatar updates without re-login
  if (trigger === "update" && token.userId) {
    const dbUser = await adminDb.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, token.userId),
      columns: { language: true, tenantId: true, avatarUrl: true },
    });
    if (dbUser) {
      token.uiLanguage = dbUser.language ?? "en";
      token.picture = dbUser.avatarUrl ?? null;
      const tenant = await adminDb.query.tenants.findFirst({
        where: (t, { eq }) => eq(t.id, dbUser.tenantId),
        columns: { settings: true },
      });
      const jwtTenantSettings = (tenant?.settings ?? {}) as Record<string, unknown>;
      token.contentLanguage = (jwtTenantSettings.preferredLanguage as string | undefined) ?? "en";
    }
  }

  // Re-check DB when email is still unverified -- once verified, stays cached
  if (!token.emailVerified && token.userId) {
    const dbUser = await adminDb.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, token.userId),
      columns: { emailVerified: true },
    });
    if (dbUser?.emailVerified) {
      token.emailVerified = dbUser.emailVerified;
    }
  }

  return token;
}
