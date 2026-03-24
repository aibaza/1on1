import {
  pgTable,
  uuid,
  varchar,
  boolean,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { userLevelEnum } from "./enums";

export const users = pgTable(
  "user",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: varchar("name", { length: 255 }),
    email: varchar("email", { length: 255 }).notNull(),
    emailVerified: timestamp("email_verified", { withTimezone: true }),
    image: varchar("image", { length: 500 }),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    level: userLevelEnum("level").notNull().default("member"),
    jobTitle: varchar("job_title", { length: 200 }),
    teamName: varchar("team_name", { length: 200 }),
    avatarUrl: varchar("avatar_url", { length: 500 }),
    avatarSeed: varchar("avatar_seed", { length: 50 }),
    passwordHash: varchar("password_hash", { length: 255 }),
    managerId: uuid("manager_id"),
    isActive: boolean("is_active").notNull().default(true),
    notificationPreferences: jsonb("notification_preferences")
      .notNull()
      .default({}),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    inviteAcceptedAt: timestamp("invite_accepted_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    language: varchar("language", { length: 10 }).notNull().default("en"),
  },
  (table) => [
    uniqueIndex("user_tenant_email_idx").on(table.tenantId, table.email),
    index("user_tenant_manager_idx").on(table.tenantId, table.managerId),
    index("user_tenant_level_idx").on(table.tenantId, table.level),
  ]
);

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  manager: one(users, {
    fields: [users.managerId],
    references: [users.id],
    relationName: "managerReports",
  }),
  reports: many(users, { relationName: "managerReports" }),
}));
