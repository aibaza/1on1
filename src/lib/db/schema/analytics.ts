import {
  pgTable,
  uuid,
  varchar,
  date,
  decimal,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { users } from "./users";
import { meetingSeries } from "./series";
import { periodTypeEnum } from "./enums";

export const analyticsSnapshots = pgTable(
  "analytics_snapshot",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    userId: uuid("user_id").references(() => users.id),
    managerId: uuid("manager_id").references(() => users.id),
    seriesId: uuid("series_id").references(() => meetingSeries.id),
    periodType: periodTypeEnum("period_type").notNull(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    metricName: varchar("metric_name", { length: 100 }).notNull(),
    metricValue: decimal("metric_value", { precision: 8, scale: 3 }).notNull(),
    sampleCount: integer("sample_count").notNull().default(0),
    computedAt: timestamp("computed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("analytics_tenant_user_metric_idx").on(
      table.tenantId,
      table.userId,
      table.metricName,
      table.periodStart
    ),
    index("analytics_tenant_manager_metric_idx").on(
      table.tenantId,
      table.managerId,
      table.metricName,
      table.periodStart
    ),
    uniqueIndex("analytics_unique_snapshot_idx").on(
      table.tenantId,
      table.userId,
      table.managerId,
      table.seriesId,
      table.periodType,
      table.periodStart,
      table.metricName
    ),
  ]
);

export const analyticsSnapshotsRelations = relations(
  analyticsSnapshots,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [analyticsSnapshots.tenantId],
      references: [tenants.id],
    }),
    user: one(users, {
      fields: [analyticsSnapshots.userId],
      references: [users.id],
    }),
    manager: one(users, {
      fields: [analyticsSnapshots.managerId],
      references: [users.id],
    }),
    series: one(meetingSeries, {
      fields: [analyticsSnapshots.seriesId],
      references: [meetingSeries.id],
    }),
  })
);
