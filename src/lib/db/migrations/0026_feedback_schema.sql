-- Feedback/ticketing: reports + conversation thread

-- Enums
DO $$ BEGIN
  CREATE TYPE "public"."feedback_type" AS ENUM('bug', 'suggestion');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."feedback_status" AS ENUM('new', 'triaged', 'in_progress', 'awaiting_user', 'resolved', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."feedback_priority" AS ENUM('low', 'medium', 'high', 'critical');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."feedback_close_reason" AS ENUM('duplicate', 'wont_fix', 'invalid');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."feedback_author_type" AS ENUM('reporter', 'platform_admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Global ticket number sequence (rendered as FB-{n} client-side)
CREATE SEQUENCE IF NOT EXISTS feedback_ticket_seq START 1000;

-- Feedback reports: one row per submitted ticket
CREATE TABLE IF NOT EXISTS "feedback_report" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id"),
  "user_id" uuid NOT NULL REFERENCES "user"("id"),
  "ticket_number" integer NOT NULL DEFAULT nextval('feedback_ticket_seq'),
  "type" "feedback_type" NOT NULL,
  "title" varchar(200) NOT NULL,
  "description" text NOT NULL,
  "status" "feedback_status" NOT NULL DEFAULT 'new',
  "priority" "feedback_priority",
  "tags" text[] NOT NULL DEFAULT '{}',
  "screenshot_url" varchar(1000),
  "page_url" varchar(2000) NOT NULL,
  "viewport" jsonb NOT NULL,
  "user_agent" varchar(500) NOT NULL,
  "assigned_to_user_id" uuid REFERENCES "user"("id"),
  "resolved_at" timestamp with time zone,
  "close_reason" "feedback_close_reason",
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Feedback messages: append-only conversation thread
CREATE TABLE IF NOT EXISTS "feedback_message" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "feedback_id" uuid NOT NULL REFERENCES "feedback_report"("id") ON DELETE CASCADE,
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id"),
  "author_id" uuid NOT NULL REFERENCES "user"("id"),
  "author_type" "feedback_author_type" NOT NULL,
  "body" text NOT NULL,
  "is_internal" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "feedback_report_ticket_number_idx"
  ON "feedback_report" ("ticket_number");

CREATE INDEX IF NOT EXISTS "feedback_report_tenant_user_created_idx"
  ON "feedback_report" ("tenant_id", "user_id", "created_at");

CREATE INDEX IF NOT EXISTS "feedback_report_status_idx"
  ON "feedback_report" ("status");

CREATE INDEX IF NOT EXISTS "feedback_report_assigned_idx"
  ON "feedback_report" ("assigned_to_user_id");

CREATE INDEX IF NOT EXISTS "feedback_message_feedback_created_idx"
  ON "feedback_message" ("feedback_id", "created_at");
