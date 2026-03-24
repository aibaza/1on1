import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { adminDb } from "@/lib/db";
import {
  users,
  accounts,
  authSessions,
  verificationTokens,
} from "@/lib/db/schema";
import bcrypt from "bcryptjs";
import { signInSchema } from "@/lib/validations/auth";

const config = {
  trustHost: true,
  // Cast adapter to work around @auth/core version mismatch between
  // next-auth and @auth/drizzle-adapter (0.41.0 vs 0.41.1)
  adapter: DrizzleAdapter(adminDb, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: authSessions,
    verificationTokensTable: verificationTokens,
  }) as NextAuthConfig["adapter"],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google,
    MicrosoftEntraID,
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      authorize: async (credentials) => {
        const { email, password } =
          await signInSchema.parseAsync(credentials);

        // Look up user by email (no tenant context during login)
        const user = await adminDb.query.users.findFirst({
          where: (u, { eq, and }) =>
            and(eq(u.email, email), eq(u.isActive, true)),
        });

        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        // Fetch tenant for content language (stored in settings.preferredLanguage JSONB)
        const tenant = await adminDb.query.tenants.findFirst({
          where: (t, { eq }) => eq(t.id, user.tenantId),
          columns: { settings: true },
        });
        const tenantSettings = (tenant?.settings ?? {}) as Record<string, unknown>;

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          tenantId: user.tenantId,
          level: user.level,
          emailVerified: user.emailVerified,
          uiLanguage: user.language ?? "en",
          contentLanguage: (tenantSettings.preferredLanguage as string | undefined) ?? "en",
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
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
    },
    async jwt({ token, user, trigger }) {
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

      // Support language switching without re-login
      if (trigger === "update" && token.userId) {
        const dbUser = await adminDb.query.users.findFirst({
          where: (u, { eq }) => eq(u.id, token.userId),
          columns: { language: true, tenantId: true },
        });
        if (dbUser) {
          token.uiLanguage = dbUser.language ?? "en";
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
    },
    async session({ session, token }) {
      session.user.id = token.userId;
      session.user.tenantId = token.tenantId;
      session.user.level = token.level;
      session.user.emailVerified = token.emailVerified;
      session.user.uiLanguage = token.uiLanguage;
      session.user.contentLanguage = token.contentLanguage;

      // Overlay session with impersonated user when admin has set the cookie
      if (token.level === "admin") {
        try {
          const { cookies } = await import("next/headers");
          const cookieStore = await cookies();
          const impersonateCookie = cookieStore.get("1on1_impersonate");
          if (impersonateCookie?.value) {
            const targetUser = await adminDb.query.users.findFirst({
              where: (u, { eq, and }) =>
                and(
                  eq(u.id, impersonateCookie.value),
                  eq(u.tenantId, token.tenantId),
                  eq(u.isActive, true)
                ),
            });
            if (targetUser && targetUser.level !== "admin") {
              session.user.impersonatedBy = {
                id: token.userId,
                name: (token.name as string) ?? "",
              };
              session.user.id = targetUser.id;
              session.user.level = targetUser.level;
              session.user.emailVerified = targetUser.emailVerified;
              session.user.uiLanguage = targetUser.language ?? "en";
              session.user.name = `${targetUser.firstName} ${targetUser.lastName}`;
              session.user.email = targetUser.email ?? "";
            }
          }
        } catch {
          // cookies() unavailable in this context (e.g. static generation) — skip
        }
      }

      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, signIn, signOut, auth } = NextAuth(config);
