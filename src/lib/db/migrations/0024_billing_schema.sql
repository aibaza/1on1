-- 0024_billing_schema.sql
-- Billing infrastructure: enums, tables, tenant columns, seed plans

-- =============================================================================
-- New enums
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE "subscription_status" AS ENUM (
    'trialing', 'active', 'past_due', 'unpaid', 'canceled', 'paused'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "billing_cycle" AS ENUM ('monthly', 'yearly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "invoice_status" AS ENUM (
    'draft', 'open', 'paid', 'past_due', 'canceled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "billing_event_type" AS ENUM (
    'subscription_created', 'subscription_updated', 'subscription_canceled',
    'payment_succeeded', 'payment_failed',
    'trial_started', 'trial_ended', 'trial_converted',
    'plan_changed', 'refund_issued'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- Plans table (not tenant-scoped — global catalog)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "billing_plan" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(100) NOT NULL,
  "slug" varchar(50) NOT NULL UNIQUE,
  "paddle_product_id" varchar(100),
  "paddle_price_id_monthly" varchar(100),
  "paddle_price_id_yearly" varchar(100),
  "price_monthly_cents" integer NOT NULL DEFAULT 0,
  "price_yearly_cents" integer NOT NULL DEFAULT 0,
  "currency" varchar(3) NOT NULL DEFAULT 'eur',
  "features" jsonb NOT NULL DEFAULT '{}',
  "is_active" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- Subscriptions table (one per tenant)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "subscription" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id"),
  "paddle_subscription_id" varchar(100) UNIQUE,
  "paddle_customer_id" varchar(100),
  "plan_id" uuid REFERENCES "billing_plan"("id"),
  "status" "subscription_status" NOT NULL DEFAULT 'trialing',
  "billing_cycle" "billing_cycle",
  "current_period_start" timestamptz,
  "current_period_end" timestamptz,
  "trial_start" timestamptz,
  "trial_end" timestamptz,
  "canceled_at" timestamptz,
  "cancel_at_period_end" boolean NOT NULL DEFAULT false,
  "seats" integer NOT NULL DEFAULT 1,
  "mrr_cents" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "subscription_tenant_id_unique" UNIQUE ("tenant_id")
);

CREATE INDEX "subscription_tenant_idx" ON "subscription" ("tenant_id");
CREATE INDEX "subscription_status_idx" ON "subscription" ("status");

-- =============================================================================
-- Invoices table
-- =============================================================================
CREATE TABLE IF NOT EXISTS "invoice" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id"),
  "subscription_id" uuid REFERENCES "subscription"("id"),
  "paddle_transaction_id" varchar(100) UNIQUE,
  "status" "invoice_status" NOT NULL DEFAULT 'draft',
  "currency" varchar(3) NOT NULL DEFAULT 'eur',
  "subtotal_cents" integer NOT NULL DEFAULT 0,
  "tax_cents" integer NOT NULL DEFAULT 0,
  "total_cents" integer NOT NULL DEFAULT 0,
  "invoice_pdf_url" varchar(500),
  "period_start" timestamptz,
  "period_end" timestamptz,
  "due_date" timestamptz,
  "paid_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "invoice_tenant_idx" ON "invoice" ("tenant_id");
CREATE INDEX "invoice_status_idx" ON "invoice" ("status");

-- =============================================================================
-- Billing events table (webhook audit log)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "billing_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id"),
  "subscription_id" uuid REFERENCES "subscription"("id"),
  "event_type" "billing_event_type" NOT NULL,
  "paddle_event_id" varchar(100) UNIQUE,
  "metadata" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "billing_event_tenant_idx" ON "billing_event" ("tenant_id");

-- =============================================================================
-- Extend tenant table with billing columns
-- =============================================================================
DO $$ BEGIN
  ALTER TABLE "tenant" ADD COLUMN "paddle_customer_id" varchar(100);
EXCEPTION WHEN duplicate_column OR undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "tenant" ADD COLUMN "is_founder" boolean NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column OR undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "tenant" ADD COLUMN "founder_discount_pct" integer NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column OR undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "tenant" ADD COLUMN "trial_ends_at" timestamptz;
EXCEPTION WHEN duplicate_column OR undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "tenant" ADD COLUMN "billing_email" varchar(255);
EXCEPTION WHEN duplicate_column OR undefined_object THEN NULL;
END $$;


-- =============================================================================
-- Seed default plans
-- =============================================================================
INSERT INTO "billing_plan" ("slug", "name", "price_monthly_cents", "price_yearly_cents", "currency", "sort_order", "features")
VALUES
  ('free', 'Free', 0, 0, 'eur', 0,
   '{"maxUsers": 2, "maxSeries": 2, "aiNudges": false, "analytics": "basic", "templates": "default", "support": "community"}'::jsonb),
  ('pro', 'Pro', 1500, 14400, 'eur', 1,
   '{"maxUsers": 25, "maxSeries": -1, "aiNudges": true, "analytics": "full", "templates": "all", "support": "email"}'::jsonb),
  ('enterprise', 'Enterprise', 2500, 24000, 'eur', 2,
   '{"maxUsers": -1, "maxSeries": -1, "aiNudges": true, "analytics": "full", "templates": "all", "support": "priority", "sso": true, "audit": true}'::jsonb)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "price_monthly_cents" = EXCLUDED."price_monthly_cents",
  "price_yearly_cents" = EXCLUDED."price_yearly_cents",
  "features" = EXCLUDED."features",
  "sort_order" = EXCLUDED."sort_order",
  "updated_at" = now();
