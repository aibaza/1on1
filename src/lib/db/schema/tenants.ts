import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { orgTypeEnum, planEnum } from "./enums";

export const tenants = pgTable("tenant", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  orgType: orgTypeEnum("org_type").notNull().default("for_profit"),
  plan: planEnum("plan").notNull().default("free"),
  settings: jsonb("settings").notNull().default({}),
  contentLanguage: varchar("content_language", { length: 10 })
    .notNull()
    .default("en"),
  logoUrl: varchar("logo_url", { length: 500 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  paddleCustomerId: varchar("paddle_customer_id", { length: 100 }),
  isFounder: boolean("is_founder").notNull().default(false),
  founderDiscountPct: integer("founder_discount_pct").notNull().default(0),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  billingEmail: varchar("billing_email", { length: 255 }),
});

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
}));

// Forward reference - resolved after users module loads
import { users } from "./users";
