import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { meetingSeries } from "./series";
import { sessions } from "./sessions";
import { calendarProviderEnum, calendarSyncStatusEnum } from "./enums";

/**
 * Stores OAuth connections to external calendar providers.
 * Separate from the `account` table (used by Auth.js for login)
 * because calendar access requires different scopes and lifecycle.
 * A user who logged in with email/password can still connect Google Calendar.
 */
export const calendarConnections = pgTable(
  "calendar_connection",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: calendarProviderEnum("provider").notNull(),
    providerEmail: varchar("provider_email", { length: 255 }),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    calendarId: varchar("calendar_id", { length: 255 })
      .notNull()
      .default("primary"),
    enabled: boolean("enabled").notNull().default(true),
    // Google push notification channel for inbound sync (Phase 3)
    webhookChannelId: varchar("webhook_channel_id", { length: 255 }),
    webhookResourceId: varchar("webhook_resource_id", { length: 255 }),
    webhookExpiration: timestamp("webhook_expiration", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // One connection per provider per user
    uniqueIndex("calendar_connection_user_provider_idx").on(
      table.userId,
      table.provider
    ),
  ]
);

export const calendarConnectionsRelations = relations(
  calendarConnections,
  ({ one }) => ({
    user: one(users, {
      fields: [calendarConnections.userId],
      references: [users.id],
    }),
  })
);

/**
 * Maps app entities (series/sessions) to external calendar event IDs.
 * Each participant gets their own calendar event, so this is a junction table:
 * (userId, seriesId) → recurring event ID
 * (userId, sessionId) → single instance override ID
 */
export const calendarEvents = pgTable(
  "calendar_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    seriesId: uuid("series_id")
      .notNull()
      .references(() => meetingSeries.id, { onDelete: "cascade" }),
    // null = recurring event for the whole series; set = single instance override
    sessionId: uuid("session_id").references(() => sessions.id, {
      onDelete: "cascade",
    }),
    provider: calendarProviderEnum("provider").notNull(),
    externalEventId: varchar("external_event_id", { length: 512 }).notNull(),
    calendarId: varchar("calendar_id", { length: 255 })
      .notNull()
      .default("primary"),
    syncStatus: calendarSyncStatusEnum("sync_status")
      .notNull()
      .default("synced"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSyncError: text("last_sync_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Fast lookup: find the recurring event for a user+series
    uniqueIndex("calendar_event_user_series_session_idx").on(
      table.userId,
      table.seriesId,
      table.sessionId
    ),
    index("calendar_event_series_idx").on(table.seriesId),
    index("calendar_event_external_id_idx").on(table.externalEventId),
  ]
);

export const calendarEventsRelations = relations(
  calendarEvents,
  ({ one }) => ({
    user: one(users, {
      fields: [calendarEvents.userId],
      references: [users.id],
    }),
    series: one(meetingSeries, {
      fields: [calendarEvents.seriesId],
      references: [meetingSeries.id],
    }),
    session: one(sessions, {
      fields: [calendarEvents.sessionId],
      references: [sessions.id],
    }),
  })
);
