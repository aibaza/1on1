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

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          tenantId: user.tenantId,
          role: user.role,
          emailVerified: user.emailVerified,
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

        return true;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.tenantId = user.tenantId;
        token.role = user.role;
        token.userId = user.id!;
        token.emailVerified = user.emailVerified ?? null;
      }

      // Re-check DB when email is still unverified — once verified, stays cached
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
    session({ session, token }) {
      session.user.id = token.userId;
      session.user.tenantId = token.tenantId;
      session.user.role = token.role;
      session.user.emailVerified = token.emailVerified;
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, signIn, signOut, auth } = NextAuth(config);
