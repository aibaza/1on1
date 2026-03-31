import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { adminDb } from "@/lib/db";
import {
  users,
  accounts,
  authSessions,
  verificationTokens,
} from "@/lib/db/schema";

import { credentialsProvider } from "./providers/credentials";
import { signInCallback } from "./callbacks/sign-in";
import { jwtCallback } from "./callbacks/jwt";
import { sessionCallback } from "./callbacks/session";

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
    // allowDangerousEmailAccountLinking is required for the invite flow:
    // users are created via invite (credentials), then may sign in with OAuth.
    // This is safe because signInCallback blocks OAuth for non-existing users,
    // so only pre-invited users can link, and OAuth providers verify email ownership.
    Google({ allowDangerousEmailAccountLinking: true }),
    MicrosoftEntraID({ allowDangerousEmailAccountLinking: true }),
    credentialsProvider,
  ],
  callbacks: {
    signIn: signInCallback,
    jwt: jwtCallback,
    session: sessionCallback,
  },
} satisfies NextAuthConfig;

export const { handlers, signIn, signOut, auth } = NextAuth(config);
