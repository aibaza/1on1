import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import {
  subscriptionStatusEnum,
  billingCycleEnum,
  invoiceStatusEnum,
  billingEventTypeEnum,
} from "./enums";

export const plans = pgTable("billing_plan", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  paddleProductId: varchar("paddle_product_id", { length: 100 }),
  paddlePriceIdMonthly: varchar("paddle_price_id_monthly", { length: 100 }),
  paddlePriceIdYearly: varchar("paddle_price_id_yearly", { length: 100 }),
  priceMonthly: integer("price_monthly_cents").notNull().default(0),
  priceYearly: integer("price_yearly_cents").notNull().default(0),
  currency: varchar("currency", { length: 3 }).notNull().default("eur"),
  features: jsonb("features").notNull().default({}),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const subscriptions = pgTable(
  "subscription",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id)
      .unique(),
    paddleSubscriptionId: varchar("paddle_subscription_id", {
      length: 100,
    }).unique(),
    paddleCustomerId: varchar("paddle_customer_id", { length: 100 }),
    planId: uuid("plan_id").references(() => plans.id),
    status: subscriptionStatusEnum("status").notNull().default("trialing"),
    billingCycle: billingCycleEnum("billing_cycle"),
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
    }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    trialStart: timestamp("trial_start", { withTimezone: true }),
    trialEnd: timestamp("trial_end", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end")
      .notNull()
      .default(false),
    seats: integer("seats").notNull().default(1),
    mrrCents: integer("mrr_cents").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("subscription_tenant_idx").on(table.tenantId),
    index("subscription_status_idx").on(table.status),
  ]
);

export const invoices = pgTable(
  "invoice",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id),
    paddleTransactionId: varchar("paddle_transaction_id", {
      length: 100,
    }).unique(),
    status: invoiceStatusEnum("status").notNull().default("draft"),
    currency: varchar("currency", { length: 3 }).notNull().default("eur"),
    subtotalCents: integer("subtotal_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull().default(0),
    invoicePdfUrl: varchar("invoice_pdf_url", { length: 500 }),
    periodStart: timestamp("period_start", { withTimezone: true }),
    periodEnd: timestamp("period_end", { withTimezone: true }),
    dueDate: timestamp("due_date", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("invoice_tenant_idx").on(table.tenantId),
    index("invoice_status_idx").on(table.status),
  ]
);

export const billingEvents = pgTable(
  "billing_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id),
    eventType: billingEventTypeEnum("event_type").notNull(),
    paddleEventId: varchar("paddle_event_id", { length: 100 }).unique(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("billing_event_tenant_idx").on(table.tenantId)]
);
