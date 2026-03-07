import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SchemaActions } from "./schema-actions";

/**
 * Static JSON Schema draft-07 document for the 1on1 template export format.
 * Always in English — this is a technical standard, not content language.
 */
const TEMPLATE_JSON_SCHEMA = JSON.stringify(
  {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "1on1 Template Export",
    version: "1",
    type: "object",
    required: ["schemaVersion", "language", "name", "sections"],
    properties: {
      schemaVersion: { type: "integer", enum: [1] },
      language: { type: "string", example: "en" },
      name: { type: "string", maxLength: 255 },
      description: { type: ["string", "null"], maxLength: 2000 },
      sections: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          required: ["name", "sortOrder", "questions"],
          properties: {
            name: { type: "string", maxLength: 255 },
            description: { type: ["string", "null"], maxLength: 2000 },
            sortOrder: { type: "integer", minimum: 0 },
            questions: {
              type: "array",
              items: {
                type: "object",
                required: [
                  "questionText",
                  "answerType",
                  "isRequired",
                  "sortOrder",
                  "scoreWeight",
                ],
                properties: {
                  questionText: { type: "string", maxLength: 1000 },
                  helpText: { type: ["string", "null"], maxLength: 500 },
                  answerType: {
                    type: "string",
                    enum: [
                      "text",
                      "rating_1_5",
                      "rating_1_10",
                      "yes_no",
                      "multiple_choice",
                      "mood",
                      "scale_custom",
                    ],
                  },
                  answerConfig: { type: "object" },
                  isRequired: { type: "boolean" },
                  sortOrder: { type: "integer", minimum: 0 },
                  scoreWeight: {
                    type: "number",
                    minimum: 0,
                    maximum: 10,
                    default: 1,
                  },
                  conditionalOnQuestionSortOrder: {
                    type: ["integer", "null"],
                  },
                  conditionalOperator: {
                    type: ["string", "null"],
                    enum: ["eq", "neq", "lt", "gt", "lte", "gte", null],
                  },
                  conditionalValue: { type: ["string", "null"], maxLength: 255 },
                },
              },
            },
          },
        },
      },
    },
  },
  null,
  2
);

export default async function SchemaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tSpec = await getTranslations();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = (key: string) => (tSpec as any)(`spec.${key}`);

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/templates"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("schema.schemaDocsLink")}
        </Link>
      </div>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("pageTitle")}</h1>
        <p className="mt-2 text-muted-foreground">{t("pageDescription")}</p>
      </div>

      {/* Three-tab layout */}
      <Tabs defaultValue="schema">
        <TabsList className="mb-6">
          <TabsTrigger value="schema">{t("tabs.schema")}</TabsTrigger>
          <TabsTrigger value="methodology">{t("tabs.methodology")}</TabsTrigger>
          <TabsTrigger value="weights">{t("tabs.weights")}</TabsTrigger>
        </TabsList>

        {/* Tab 1: JSON Schema */}
        <TabsContent value="schema">
          <Card>
            <CardHeader>
              <CardTitle>{t("schema.title")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("schema.description")}
              </p>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <SchemaActions
                  schemaJson={TEMPLATE_JSON_SCHEMA}
                  copyLabel={t("schema.copy")}
                  copiedLabel={t("schema.copied")}
                  downloadLabel={t("schema.download")}
                />
              </div>
              <pre className="rounded-lg bg-muted p-4 overflow-x-auto text-sm font-mono">
                <code>{TEMPLATE_JSON_SCHEMA}</code>
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Methodology */}
        <TabsContent value="methodology">
          <Card>
            <CardHeader>
              <CardTitle>{t("methodology.title")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("methodology.intro")}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {(
                  [
                    "continuity",
                    "specificity",
                    "balance",
                    "helpText",
                  ] as const
                ).map((key) => (
                  <div key={key} className="space-y-1">
                    <h3 className="font-semibold">
                      {t(`methodology.principles.${key}.title`)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t(`methodology.principles.${key}.body`)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Score Weights */}
        <TabsContent value="weights">
          <Card>
            <CardHeader>
              <CardTitle>{t("weights.title")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("weights.intro")}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-6 text-sm">
                  <span className="font-medium">{t("weights.validRange")}</span>
                  <span className="font-medium">{t("weights.defaultValue")}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("weights.zeroMeaning")}
                </p>
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">
                    {t("weights.examples.title")}
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                    <li>{t("weights.examples.basic")}</li>
                    <li>{t("weights.examples.emphasized")}</li>
                    <li>{t("weights.examples.unscored")}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
