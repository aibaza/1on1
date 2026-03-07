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
import { SchemaActions, PromptKitActions } from "./schema-actions";

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

/**
 * Worked example template for the DIY Prompt Kit.
 * Always in English — this is reference content for AI prompting, not UI chrome.
 */
const PROMPT_KIT_EXAMPLE = JSON.stringify(
  {
    schemaVersion: 1,
    language: "en",
    name: "Engineering 1:1 Template",
    description:
      "A balanced weekly 1:1 for engineering teams. Designed for 30-minute meetings.",
    sections: [
      {
        name: "Check-in & Wellbeing",
        description: "Start with the person, not the work.",
        sortOrder: 0,
        questions: [
          {
            questionText: "How are you doing this week, overall?",
            helpText:
              "1 = really struggling, 5 = thriving. Rate holistically — work and outside work.",
            answerType: "rating_1_5",
            answerConfig: {},
            isRequired: true,
            sortOrder: 0,
            scoreWeight: 3,
            conditionalOnQuestionSortOrder: null,
            conditionalOperator: null,
            conditionalValue: null,
          },
          {
            questionText:
              "Is there anything outside work affecting your ability to focus?",
            helpText: "Optional — share only what you're comfortable with.",
            answerType: "text",
            answerConfig: {},
            isRequired: false,
            sortOrder: 1,
            scoreWeight: 0,
            conditionalOnQuestionSortOrder: null,
            conditionalOperator: null,
            conditionalValue: null,
          },
        ],
      },
      {
        name: "Work & Progress",
        description: "What's in motion, what's blocked.",
        sortOrder: 1,
        questions: [
          {
            questionText: "What are you most proud of from this past week?",
            helpText:
              "A shipped feature, a solved problem, a tough conversation handled well.",
            answerType: "text",
            answerConfig: {},
            isRequired: true,
            sortOrder: 0,
            scoreWeight: 0,
            conditionalOnQuestionSortOrder: null,
            conditionalOperator: null,
            conditionalValue: null,
          },
          {
            questionText:
              "What's the one thing blocking your progress right now?",
            helpText:
              "Could be a technical dependency, a decision you're waiting on, or unclear requirements.",
            answerType: "text",
            answerConfig: {},
            isRequired: true,
            sortOrder: 1,
            scoreWeight: 0,
            conditionalOnQuestionSortOrder: null,
            conditionalOperator: null,
            conditionalValue: null,
          },
          {
            questionText:
              "How clear are you on your priorities for the next two weeks?",
            helpText: "1 = no clarity at all, 5 = completely clear and aligned.",
            answerType: "rating_1_5",
            answerConfig: {},
            isRequired: true,
            sortOrder: 2,
            scoreWeight: 2,
            conditionalOnQuestionSortOrder: null,
            conditionalOperator: null,
            conditionalValue: null,
          },
        ],
      },
      {
        name: "Growth & Development",
        description: "Career progress and manager effectiveness.",
        sortOrder: 2,
        questions: [
          {
            questionText:
              "What skill or area are you most focused on developing right now?",
            helpText:
              "Technical depth, communication, leadership, process — any dimension counts.",
            answerType: "text",
            answerConfig: {},
            isRequired: false,
            sortOrder: 0,
            scoreWeight: 0,
            conditionalOnQuestionSortOrder: null,
            conditionalOperator: null,
            conditionalValue: null,
          },
          {
            questionText:
              "Is there anything I can do differently as your manager?",
            helpText:
              "More context, more autonomy, different feedback style — be direct.",
            answerType: "text",
            answerConfig: {},
            isRequired: false,
            sortOrder: 1,
            scoreWeight: 0,
            conditionalOnQuestionSortOrder: null,
            conditionalOperator: null,
            conditionalValue: null,
          },
          {
            questionText: "What are your top 1-2 priorities before our next 1:1?",
            helpText: "Shared commitments we'll follow up on next session.",
            answerType: "text",
            answerConfig: {},
            isRequired: true,
            sortOrder: 2,
            scoreWeight: 0,
            conditionalOnQuestionSortOrder: null,
            conditionalOperator: null,
            conditionalValue: null,
          },
        ],
      },
    ],
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

  // Build the copyable prompt kit block server-side (uses translated section headers,
  // but JSON schema and example template content always stay in English)
  const promptKitBlock = [
    `# ${t("promptKit.sections.schema")}`,
    "",
    TEMPLATE_JSON_SCHEMA,
    "",
    `# ${t("promptKit.sections.methodology")}`,
    "",
    [
      t("methodology.principles.continuity.title") +
        ": " +
        t("methodology.principles.continuity.body"),
      t("methodology.principles.specificity.title") +
        ": " +
        t("methodology.principles.specificity.body"),
      t("methodology.principles.balance.title") +
        ": " +
        t("methodology.principles.balance.body"),
      t("methodology.principles.helpText.title") +
        ": " +
        t("methodology.principles.helpText.body"),
    ].join("\n"),
    "",
    `# ${t("promptKit.sections.weights")}`,
    "",
    [
      t("weights.validRange"),
      t("weights.defaultValue"),
      t("weights.zeroMeaning"),
      t("weights.examples.basic"),
      t("weights.examples.emphasized"),
      t("weights.examples.unscored"),
    ].join("\n"),
    "",
    `# ${t("promptKit.sections.example")}`,
    "",
    PROMPT_KIT_EXAMPLE,
  ].join("\n");

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
          <TabsTrigger value="promptKit">{t("tabs.promptKit")}</TabsTrigger>
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

        {/* Tab 4: DIY Prompt Kit */}
        <TabsContent value="promptKit">
          <Card>
            <CardHeader>
              <CardTitle>{t("promptKit.title")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("promptKit.intro")}
              </p>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <PromptKitActions
                  content={promptKitBlock}
                  copyLabel={t("promptKit.copy")}
                  copiedLabel={t("promptKit.copied")}
                />
              </div>
              <pre className="rounded-lg bg-muted p-4 overflow-x-auto text-sm font-mono whitespace-pre-wrap max-h-[60vh]">
                <code>{promptKitBlock}</code>
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
