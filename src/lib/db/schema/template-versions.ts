import {
  pgTable,
  uuid,
  integer,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { users } from "./users";
import { questionnaireTemplates } from "./templates";

export const templateVersions = pgTable(
  "template_version",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => questionnaireTemplates.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    versionNumber: integer("version_number").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("template_version_template_version_idx").on(
      table.templateId,
      table.versionNumber
    ),
    index("template_version_template_idx").on(table.templateId),
  ]
);

export const templateVersionsRelations = relations(
  templateVersions,
  ({ one }) => ({
    template: one(questionnaireTemplates, {
      fields: [templateVersions.templateId],
      references: [questionnaireTemplates.id],
    }),
    tenant: one(tenants, {
      fields: [templateVersions.tenantId],
      references: [tenants.id],
    }),
    creator: one(users, {
      fields: [templateVersions.createdBy],
      references: [users.id],
    }),
  })
);
