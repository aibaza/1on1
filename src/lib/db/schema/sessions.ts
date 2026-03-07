import {
  pgTable,
  uuid,
  integer,
  jsonb,
  decimal,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { meetingSeries } from "./series";
import { questionnaireTemplates } from "./templates";
import { sessionStatusEnum, aiStatusEnum } from "./enums";
import type { AISummary } from "@/lib/ai/schemas/summary";
import type { AIManagerAddendum } from "@/lib/ai/schemas/addendum";
import type { AIActionSuggestions } from "@/lib/ai/schemas/action-items";

export const sessions = pgTable(
  "session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seriesId: uuid("series_id")
      .notNull()
      .references(() => meetingSeries.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    templateId: uuid("template_id").references(
      () => questionnaireTemplates.id
    ),
    sessionNumber: integer("session_number").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    status: sessionStatusEnum("status").notNull().default("scheduled"),
    sharedNotes: jsonb("shared_notes").$type<Record<string, string> | null>(),
    durationMinutes: integer("duration_minutes"),
    sessionScore: decimal("session_score", { precision: 4, scale: 2 }),
    aiSummary: jsonb("ai_summary").$type<AISummary | null>(),
    aiManagerAddendum: jsonb("ai_manager_addendum").$type<AIManagerAddendum | null>(),
    aiSuggestions: jsonb("ai_suggestions").$type<AIActionSuggestions | null>(),
    aiAssessmentScore: integer("ai_assessment_score"),
    aiStatus: aiStatusEnum("ai_status").default("pending"),
    aiCompletedAt: timestamp("ai_completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    analyticsIngestedAt: timestamp("analytics_ingested_at", {
      withTimezone: true,
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("session_series_scheduled_idx").on(
      table.seriesId,
      table.scheduledAt
    ),
    index("session_tenant_status_scheduled_idx").on(
      table.tenantId,
      table.status,
      table.scheduledAt
    ),
    index("session_tenant_scheduled_idx").on(
      table.tenantId,
      table.scheduledAt
    ),
  ]
);

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  series: one(meetingSeries, {
    fields: [sessions.seriesId],
    references: [meetingSeries.id],
  }),
  tenant: one(tenants, {
    fields: [sessions.tenantId],
    references: [tenants.id],
  }),
  template: one(questionnaireTemplates, {
    fields: [sessions.templateId],
    references: [questionnaireTemplates.id],
  }),
  answers: many(sessionAnswers),
  privateNotes: many(privateNotes),
  talkingPoints: many(talkingPoints),
  actionItems: many(actionItems),
}));

// Forward references - resolved after modules load
import { sessionAnswers } from "./answers";
import { privateNotes, talkingPoints } from "./notes";
import { actionItems } from "./action-items";
