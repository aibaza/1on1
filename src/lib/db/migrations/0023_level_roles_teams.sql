-- Migration: Restructure roles & teams
-- 1. Rename user_role (admin/manager/member) to user_level
-- 2. Add team_name to users (derived teams from managerId)
-- 3. Create job_role + user_job_role tables (job function roles)
-- 4. Migrate analytics_snapshot.team_id to manager_id
-- 5. Drop team + team_member tables

-- Step 1: Create new enum (idempotent)
DO $$ BEGIN
  CREATE TYPE "user_level" AS ENUM ('admin', 'manager', 'member');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 2: Add level column to user table (nullable first, then backfill)
DO $$ BEGIN
  ALTER TABLE "user" ADD COLUMN "level" "user_level";
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Step 3: Backfill level from role
DO $$ BEGIN
  UPDATE "user" SET "level" = "role"::text::"user_level" WHERE "level" IS NULL AND "role" IS NOT NULL;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- Step 3b: Make level NOT NULL with default
ALTER TABLE "user" ALTER COLUMN "level" SET NOT NULL;
ALTER TABLE "user" ALTER COLUMN "level" SET DEFAULT 'member'::"user_level";

-- Step 4: Add team_name column
DO $$ BEGIN
  ALTER TABLE "user" ADD COLUMN "team_name" varchar(200);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Step 5: Backfill team_name for managers who have reports
UPDATE "user" SET "team_name" = "first_name" || ' ' || "last_name"
WHERE "id" IN (SELECT DISTINCT "manager_id" FROM "user" WHERE "manager_id" IS NOT NULL)
  AND "team_name" IS NULL;

-- Step 6: Unique index on team_name per tenant (partial — only non-null)
CREATE UNIQUE INDEX IF NOT EXISTS "user_tenant_team_name_idx" ON "user" ("tenant_id", "team_name")
WHERE "team_name" IS NOT NULL;

-- Step 7: Create job_role table
CREATE TABLE IF NOT EXISTS "job_role" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id"),
  "name" varchar(100) NOT NULL,
  "description" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "job_role_tenant_name_idx" ON "job_role" ("tenant_id", "name");

-- Step 8: Create user_job_role junction table
CREATE TABLE IF NOT EXISTS "user_job_role" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "role_id" uuid NOT NULL REFERENCES "job_role"("id") ON DELETE CASCADE,
  "assigned_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_job_role_user_role_idx" ON "user_job_role" ("user_id", "role_id");

-- Step 9: RLS on job_role and user_job_role
ALTER TABLE "job_role" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "job_role_tenant_isolation" ON "job_role"
    USING ("tenant_id" = current_setting('app.current_tenant_id')::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "user_job_role" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "user_job_role_tenant_isolation" ON "user_job_role"
    USING ("role_id" IN (
      SELECT "id" FROM "job_role"
      WHERE "tenant_id" = current_setting('app.current_tenant_id')::uuid
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 10: Migrate analytics_snapshot.team_id to manager_id
DO $$ BEGIN
  ALTER TABLE "analytics_snapshot" ADD COLUMN "manager_id" uuid REFERENCES "user"("id");
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  UPDATE "analytics_snapshot" AS a
  SET "manager_id" = t."manager_id"
  FROM "team" t
  WHERE a."team_id" = t."id"
    AND a."manager_id" IS NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DROP INDEX IF EXISTS "analytics_tenant_team_metric_idx";
CREATE INDEX IF NOT EXISTS "analytics_tenant_manager_metric_idx"
  ON "analytics_snapshot" ("tenant_id", "manager_id", "metric_name", "period_start");

-- Recreate unique index replacing team_id with manager_id
DROP INDEX IF EXISTS "analytics_unique_snapshot_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "analytics_unique_snapshot_idx"
  ON "analytics_snapshot" ("tenant_id", "user_id", "manager_id", "series_id", "period_type", "period_start", "metric_name");

-- Only drop team_id if it exists
DO $$ BEGIN
  ALTER TABLE "analytics_snapshot" DROP COLUMN "team_id";
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- Step 11: Rename invite_token.role to level
DO $$ BEGIN
  ALTER TABLE "invite_token" ALTER COLUMN "role" DROP DEFAULT;
  ALTER TABLE "invite_token" RENAME COLUMN "role" TO "level";
  ALTER TABLE "invite_token" ALTER COLUMN "level" TYPE "user_level" USING "level"::text::"user_level";
  ALTER TABLE "invite_token" ALTER COLUMN "level" SET DEFAULT 'member'::"user_level";
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- Step 12: Update user indexes
DROP INDEX IF EXISTS "user_tenant_role_idx";
CREATE INDEX IF NOT EXISTS "user_tenant_level_idx" ON "user" ("tenant_id", "level");

-- Step 13: Drop old role column
DO $$ BEGIN
  ALTER TABLE "user" DROP COLUMN "role";
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- Step 14: Drop team_member table (FK dependencies first)
DROP TABLE IF EXISTS "team_member";

-- Step 15: Drop team table
DROP TABLE IF EXISTS "team";

-- Step 16: Drop old enums
DROP TYPE IF EXISTS "team_member_role";
DROP TYPE IF EXISTS "user_role";
