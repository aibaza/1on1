import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { relations, sql } from "drizzle-orm";
import { tenants } from "./tenants";
import { users } from "./users";
import {
  feedbackTypeEnum,
  feedbackStatusEnum,
  feedbackPriorityEnum,
  feedbackCloseReasonEnum,
  feedbackAuthorTypeEnum,
} from "./enums";

export const feedbackReports = pgTable(
  "feedback_report",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    ticketNumber: integer("ticket_number")
      .notNull()
      .default(sql`nextval('feedback_ticket_seq')`),
    type: feedbackTypeEnum("type").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description").notNull(),
    status: feedbackStatusEnum("status").notNull().default("new"),
    priority: feedbackPriorityEnum("priority"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    screenshotUrl: varchar("screenshot_url", { length: 1000 }),
    pageUrl: varchar("page_url", { length: 2000 }).notNull(),
    viewport: jsonb("viewport").notNull(),
    userAgent: varchar("user_agent", { length: 500 }).notNull(),
    assignedToUserId: uuid("assigned_to_user_id").references(() => users.id),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    closeReason: feedbackCloseReasonEnum("close_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("feedback_report_ticket_number_idx").on(table.ticketNumber),
    index("feedback_report_tenant_user_created_idx").on(
      table.tenantId,
      table.userId,
      table.createdAt
    ),
    index("feedback_report_status_idx").on(table.status),
    index("feedback_report_assigned_idx").on(table.assignedToUserId),
  ]
);

export const feedbackMessages = pgTable(
  "feedback_message",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    feedbackId: uuid("feedback_id")
      .notNull()
      .references(() => feedbackReports.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    authorType: feedbackAuthorTypeEnum("author_type").notNull(),
    body: text("body").notNull(),
    isInternal: boolean("is_internal").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("feedback_message_feedback_created_idx").on(
      table.feedbackId,
      table.createdAt
    ),
  ]
);

export const feedbackReportsRelations = relations(
  feedbackReports,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [feedbackReports.tenantId],
      references: [tenants.id],
    }),
    reporter: one(users, {
      fields: [feedbackReports.userId],
      references: [users.id],
      relationName: "reportedFeedback",
    }),
    assignedTo: one(users, {
      fields: [feedbackReports.assignedToUserId],
      references: [users.id],
      relationName: "assignedFeedback",
    }),
    messages: many(feedbackMessages),
  })
);

export const feedbackMessagesRelations = relations(
  feedbackMessages,
  ({ one }) => ({
    feedback: one(feedbackReports, {
      fields: [feedbackMessages.feedbackId],
      references: [feedbackReports.id],
    }),
    tenant: one(tenants, {
      fields: [feedbackMessages.tenantId],
      references: [tenants.id],
    }),
    author: one(users, {
      fields: [feedbackMessages.authorId],
      references: [users.id],
    }),
  })
);
