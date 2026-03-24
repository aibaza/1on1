import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { users } from "./users";

export const jobRoles = pgTable(
  "job_role",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("job_role_tenant_name_idx").on(table.tenantId, table.name),
  ]
);

export const jobRolesRelations = relations(jobRoles, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [jobRoles.tenantId],
    references: [tenants.id],
  }),
  userJobRoles: many(userJobRoles),
}));

export const userJobRoles = pgTable(
  "user_job_role",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => jobRoles.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("user_job_role_user_role_idx").on(table.userId, table.roleId),
  ]
);

export const userJobRolesRelations = relations(userJobRoles, ({ one }) => ({
  user: one(users, {
    fields: [userJobRoles.userId],
    references: [users.id],
  }),
  role: one(jobRoles, {
    fields: [userJobRoles.roleId],
    references: [jobRoles.id],
  }),
}));
