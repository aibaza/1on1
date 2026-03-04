-- Migration: Replace categories with user-defined sections & labels
--
-- 1. Create template_section table (sections per template, become wizard steps)
-- 2. Create template_label table (tenant-wide taxonomy)
-- 3. Create template_label_assignment table (many-to-many template<->label)
-- 4. Migrate template_question: add section_id, migrate data, drop category
-- 5. Drop category from questionnaire_template
-- 6. Drop unused enums

-- Step 1: Create template_section table
CREATE TABLE IF NOT EXISTS "template_section" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "template_id" uuid NOT NULL REFERENCES "questionnaire_template"("id"),
  "tenant_id" uuid REFERENCES "tenant"("id"),
  "name" varchar(255) NOT NULL,
  "description" text,
  "sort_order" integer NOT NULL,
  "is_archived" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

-- Step 2: Create template_label table
CREATE TABLE IF NOT EXISTS "template_label" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id"),
  "name" varchar(100) NOT NULL,
  "color" varchar(7),
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "template_label_tenant_name_idx"
  ON "template_label" USING btree ("tenant_id", "name");--> statement-breakpoint

-- Step 3: Create template_label_assignment table
CREATE TABLE IF NOT EXISTS "template_label_assignment" (
  "template_id" uuid NOT NULL REFERENCES "questionnaire_template"("id"),
  "label_id" uuid NOT NULL REFERENCES "template_label"("id") ON DELETE CASCADE,
  CONSTRAINT "template_label_assignment_template_id_label_id_pk"
    PRIMARY KEY ("template_id", "label_id")
);--> statement-breakpoint

-- Step 4a: Add section_id column (nullable initially for migration)
ALTER TABLE "template_question" ADD COLUMN "section_id" uuid;--> statement-breakpoint

-- Step 4b: Migrate data — create a section per unique (template_id, category) pair
INSERT INTO "template_section" ("id", "template_id", "tenant_id", "name", "sort_order")
SELECT
  gen_random_uuid(),
  tq.template_id,
  qt.tenant_id,
  INITCAP(REPLACE(tq.category::text, '_', ' ')),
  ROW_NUMBER() OVER (PARTITION BY tq.template_id ORDER BY MIN(tq.sort_order)) - 1
FROM "template_question" tq
JOIN "questionnaire_template" qt ON qt.id = tq.template_id
GROUP BY tq.template_id, qt.tenant_id, tq.category;--> statement-breakpoint

-- Step 4c: Set section_id on questions based on matching (template_id, category->name)
UPDATE "template_question" tq
SET "section_id" = ts.id
FROM "template_section" ts
WHERE ts.template_id = tq.template_id
  AND ts.name = INITCAP(REPLACE(tq.category::text, '_', ' '));--> statement-breakpoint

-- Step 4d: Make section_id NOT NULL and add FK
ALTER TABLE "template_question" ALTER COLUMN "section_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "template_question"
  ADD CONSTRAINT "template_question_section_id_template_section_id_fk"
  FOREIGN KEY ("section_id") REFERENCES "template_section"("id");--> statement-breakpoint

-- Step 4e: Drop category from template_question
ALTER TABLE "template_question" DROP COLUMN "category";--> statement-breakpoint

-- Step 5: Drop category from questionnaire_template
ALTER TABLE "questionnaire_template" DROP COLUMN "category";--> statement-breakpoint

-- Step 6: Drop unused enums
DROP TYPE IF EXISTS "public"."question_category";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."template_category";
