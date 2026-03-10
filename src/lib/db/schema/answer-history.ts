import {
  pgTable,
  uuid,
  text,
  decimal,
  jsonb,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { users } from "./users";
import { sessions } from "./sessions";
import { sessionAnswers } from "./answers";

export const sessionAnswerHistory = pgTable(
  "session_answer_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionAnswerId: uuid("session_answer_id")
      .notNull()
      .references(() => sessionAnswers.id),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    correctedById: uuid("corrected_by_id")
      .notNull()
      .references(() => users.id),
    // Snapshot of original values at correction time
    originalAnswerText: text("original_answer_text"),
    originalAnswerNumeric: decimal("original_answer_numeric", {
      precision: 6,
      scale: 2,
    }),
    originalAnswerJson: jsonb("original_answer_json"),
    originalSkipped: boolean("original_skipped").notNull().default(false),
    correctionReason: text("correction_reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("session_answer_history_answer_idx").on(table.sessionAnswerId),
    index("session_answer_history_session_idx").on(
      table.sessionId,
      table.createdAt
    ),
    index("session_answer_history_tenant_idx").on(
      table.tenantId,
      table.createdAt
    ),
  ]
);

export const sessionAnswerHistoryRelations = relations(
  sessionAnswerHistory,
  ({ one }) => ({
    sessionAnswer: one(sessionAnswers, {
      fields: [sessionAnswerHistory.sessionAnswerId],
      references: [sessionAnswers.id],
    }),
    session: one(sessions, {
      fields: [sessionAnswerHistory.sessionId],
      references: [sessions.id],
    }),
    tenant: one(tenants, {
      fields: [sessionAnswerHistory.tenantId],
      references: [tenants.id],
    }),
    correctedBy: one(users, {
      fields: [sessionAnswerHistory.correctedById],
      references: [users.id],
    }),
  })
);
