-- Calendar integration: connections and event sync tables

-- Enums
DO $$ BEGIN
  CREATE TYPE "public"."calendar_provider" AS ENUM('google', 'microsoft');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."calendar_sync_status" AS ENUM('synced', 'pending', 'error');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Calendar connections: stores OAuth tokens for calendar providers
CREATE TABLE IF NOT EXISTS "calendar_connection" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "provider" "calendar_provider" NOT NULL,
  "provider_email" varchar(255),
  "access_token" text NOT NULL,
  "refresh_token" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "calendar_id" varchar(255) NOT NULL DEFAULT 'primary',
  "enabled" boolean NOT NULL DEFAULT true,
  "webhook_channel_id" varchar(255),
  "webhook_resource_id" varchar(255),
  "webhook_expiration" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Calendar events: maps series/sessions to external calendar event IDs
CREATE TABLE IF NOT EXISTS "calendar_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "series_id" uuid NOT NULL REFERENCES "meeting_series"("id") ON DELETE CASCADE,
  "session_id" uuid REFERENCES "session"("id") ON DELETE CASCADE,
  "provider" "calendar_provider" NOT NULL,
  "external_event_id" varchar(512) NOT NULL,
  "calendar_id" varchar(255) NOT NULL DEFAULT 'primary',
  "sync_status" "calendar_sync_status" NOT NULL DEFAULT 'synced',
  "last_synced_at" timestamp with time zone NOT NULL DEFAULT now(),
  "last_sync_error" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "calendar_connection_user_provider_idx"
  ON "calendar_connection" ("user_id", "provider");

CREATE UNIQUE INDEX IF NOT EXISTS "calendar_event_user_series_session_idx"
  ON "calendar_event" ("user_id", "series_id", "session_id");

CREATE INDEX IF NOT EXISTS "calendar_event_series_idx"
  ON "calendar_event" ("series_id");

CREATE INDEX IF NOT EXISTS "calendar_event_external_id_idx"
  ON "calendar_event" ("external_event_id");

-- RLS policies: calendar_connection is NOT tenant-scoped (user-level data)
-- but calendar_event should be visible only to the owning user
-- For now, these tables are accessed via adminDb (bypasses RLS)
