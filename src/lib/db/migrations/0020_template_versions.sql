CREATE TABLE "template_version" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "template_id" uuid NOT NULL REFERENCES "questionnaire_template"("id"),
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id"),
  "version_number" integer NOT NULL,
  "snapshot" jsonb NOT NULL,
  "created_by" uuid NOT NULL REFERENCES "user"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "template_version_template_version_idx" ON "template_version" ("template_id", "version_number");
CREATE INDEX "template_version_template_idx" ON "template_version" ("template_id");

ALTER TABLE "template_version" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "template_version" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "template_version"
  USING ("tenant_id" = current_setting('app.current_tenant_id')::uuid);
