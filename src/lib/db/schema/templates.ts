import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { users } from "./users";
import {
  answerTypeEnum,
  conditionalOperatorEnum,
} from "./enums";

export const questionnaireTemplates = pgTable("questionnaire_template", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isDefault: boolean("is_default").notNull().default(false),
  isPublished: boolean("is_published").notNull().default(false),
  createdBy: uuid("created_by").references(() => users.id),
  version: integer("version").notNull().default(1),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const questionnaireTemplatesRelations = relations(
  questionnaireTemplates,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [questionnaireTemplates.tenantId],
      references: [tenants.id],
    }),
    creator: one(users, {
      fields: [questionnaireTemplates.createdBy],
      references: [users.id],
    }),
    questions: many(templateQuestions),
    sections: many(templateSections),
    labelAssignments: many(templateLabelAssignments),
  })
);

// --- Template Sections (user-defined groups that become wizard steps) ---

export const templateSections = pgTable("template_section", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateId: uuid("template_id")
    .notNull()
    .references(() => questionnaireTemplates.id),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull(),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const templateSectionsRelations = relations(
  templateSections,
  ({ one, many }) => ({
    template: one(questionnaireTemplates, {
      fields: [templateSections.templateId],
      references: [questionnaireTemplates.id],
    }),
    tenant: one(tenants, {
      fields: [templateSections.tenantId],
      references: [tenants.id],
    }),
    questions: many(templateQuestions),
  })
);

// --- Template Labels (tenant-wide taxonomy, many-to-many) ---

export const templateLabels = pgTable(
  "template_label",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: varchar("name", { length: 100 }).notNull(),
    color: varchar("color", { length: 7 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("template_label_tenant_name_idx").on(
      table.tenantId,
      table.name
    ),
  ]
);

export const templateLabelsRelations = relations(
  templateLabels,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [templateLabels.tenantId],
      references: [tenants.id],
    }),
    assignments: many(templateLabelAssignments),
  })
);

export const templateLabelAssignments = pgTable(
  "template_label_assignment",
  {
    templateId: uuid("template_id")
      .notNull()
      .references(() => questionnaireTemplates.id),
    labelId: uuid("label_id")
      .notNull()
      .references(() => templateLabels.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.templateId, table.labelId] }),
  ]
);

export const templateLabelAssignmentsRelations = relations(
  templateLabelAssignments,
  ({ one }) => ({
    template: one(questionnaireTemplates, {
      fields: [templateLabelAssignments.templateId],
      references: [questionnaireTemplates.id],
    }),
    label: one(templateLabels, {
      fields: [templateLabelAssignments.labelId],
      references: [templateLabels.id],
    }),
  })
);

// --- Template Questions ---

export const templateQuestions = pgTable("template_question", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateId: uuid("template_id")
    .notNull()
    .references(() => questionnaireTemplates.id),
  sectionId: uuid("section_id")
    .notNull()
    .references(() => templateSections.id),
  questionText: text("question_text").notNull(),
  helpText: text("help_text"),
  answerType: answerTypeEnum("answer_type").notNull(),
  answerConfig: jsonb("answer_config").notNull().default({}),
  isRequired: boolean("is_required").notNull().default(false),
  sortOrder: integer("sort_order").notNull(),
  isArchived: boolean("is_archived").notNull().default(false),
  conditionalOnQuestionId: uuid("conditional_on_question_id"),
  conditionalOperator: conditionalOperatorEnum("conditional_operator"),
  conditionalValue: varchar("conditional_value", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const templateQuestionsRelations = relations(
  templateQuestions,
  ({ one }) => ({
    template: one(questionnaireTemplates, {
      fields: [templateQuestions.templateId],
      references: [questionnaireTemplates.id],
    }),
    section: one(templateSections, {
      fields: [templateQuestions.sectionId],
      references: [templateSections.id],
    }),
    conditionalOnQuestion: one(templateQuestions, {
      fields: [templateQuestions.conditionalOnQuestionId],
      references: [templateQuestions.id],
      relationName: "conditionalQuestion",
    }),
  })
);
