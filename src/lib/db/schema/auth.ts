import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { users } from "./users";
import { userLevelEnum } from "./enums";

// OAuth account links (Google, Microsoft, etc.)
// Column property names must match @auth/drizzle-adapter expectations (snake_case for some)
export const accounts = pgTable(
  "account",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 255 }).notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
  ]
);

// Database sessions (required by Auth.js adapter even with JWT strategy)
// Named "auth_session" to avoid collision with app "session" table
export const authSessions = pgTable("auth_session", {
  sessionToken: varchar("session_token", { length: 255 }).primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

// Auth.js magic link tokens (adapter requirement)
export const verificationTokens = pgTable(
  "verification_token",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.identifier, table.token] }),
  ]
);

// Custom email verification tokens (24h expiry)
export const emailVerificationTokens = pgTable("email_verification_token", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Custom password reset tokens (1h expiry)
export const passwordResetTokens = pgTable("password_reset_token", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Invite tokens for user invitations (7-day expiry)
export const inviteTokens = pgTable(
  "invite_token",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    email: varchar("email", { length: 255 }).notNull(),
    level: userLevelEnum("level").notNull().default("member"),
    token: varchar("token", { length: 255 }).notNull().unique(),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("invite_token_tenant_email_idx").on(
      table.tenantId,
      table.email
    ),
  ]
);

export const inviteTokensRelations = relations(inviteTokens, ({ one }) => ({
  tenant: one(tenants, {
    fields: [inviteTokens.tenantId],
    references: [tenants.id],
  }),
  inviter: one(users, {
    fields: [inviteTokens.invitedBy],
    references: [users.id],
  }),
}));
