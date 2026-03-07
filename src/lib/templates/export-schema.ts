/**
 * Canonical export schema for 1on1 templates.
 *
 * This module defines the TemplateExport interface, SCHEMA_VERSION constant,
 * and the buildExportPayload() function used by GET /api/templates/[id]/export.
 *
 * Design constraints:
 * - Output must contain zero UUID strings (EXP-03)
 * - scoreWeight must be a JS number, never a Drizzle decimal string (EXP-05)
 * - conditionalOnQuestionSortOrder uses sortOrder integer refs, not UUIDs (EXP-03)
 * - language field reflects the company content language passed at export time (EXP-04)
 */

export const SCHEMA_VERSION = 1 as const;

export interface ExportQuestion {
  questionText: string;
  helpText: string | null;
  answerType:
    | "text"
    | "rating_1_5"
    | "rating_1_10"
    | "yes_no"
    | "multiple_choice"
    | "mood"
    | "scale_custom";
  answerConfig: Record<string, unknown>;
  isRequired: boolean;
  sortOrder: number;
  /** EXP-05: Always a JS number (0–10). Drizzle returns decimal as string; we parse it here. */
  scoreWeight: number;
  /** EXP-03: sortOrder of the referenced question, or null. Never a UUID. */
  conditionalOnQuestionSortOrder: number | null;
  conditionalOperator: "eq" | "neq" | "lt" | "gt" | "lte" | "gte" | null;
  conditionalValue: string | null;
}

export interface ExportSection {
  name: string;
  description: string | null;
  sortOrder: number;
  questions: ExportQuestion[];
}

export interface TemplateExport {
  /** EXP-02: Always 1. Increment when the export format changes. */
  schemaVersion: 1;
  /** EXP-04: Company content language ("en" | "ro"). */
  language: string;
  name: string;
  description: string | null;
  sections: ExportSection[];
}

/**
 * Internal shape accepted as input — mirrors what the DB/GET route returns.
 * Using unknown fields allows the function to accept any superset (e.g. with UUIDs).
 */
interface RawQuestion {
  id: string;
  questionText: string;
  helpText: string | null;
  answerType: string;
  answerConfig: unknown;
  isRequired: boolean;
  sortOrder: number;
  scoreWeight: string | null;
  conditionalOnQuestionId: string | null;
  conditionalOperator: string | null;
  conditionalValue: string | null;
}

interface RawSection {
  name: string;
  description: string | null;
  sortOrder: number;
  questions: RawQuestion[];
}

interface RawTemplate {
  name: string;
  description: string | null;
  sections: RawSection[];
}

/**
 * Transforms a raw server-side template object into a tenant-neutral export payload.
 *
 * - Strips all UUID fields (id, tenantId, sectionId, templateId, createdBy)
 * - Strips internal fields (isArchived, isPublished, isDefault, version, createdAt, updatedAt)
 * - Converts scoreWeight from Drizzle decimal string to JS number
 * - Replaces conditionalOnQuestionId UUID with the referenced question's sortOrder
 */
export function buildExportPayload(
  template: RawTemplate,
  contentLanguage: string
): TemplateExport {
  // Build a map from question UUID → sortOrder for conditional reference resolution (EXP-03)
  const allQuestions = template.sections.flatMap((s) => s.questions);
  const uuidToSortOrder = new Map<string, number>(
    allQuestions.map((q) => [q.id, q.sortOrder])
  );

  return {
    schemaVersion: SCHEMA_VERSION,
    language: contentLanguage,
    name: template.name,
    description: template.description,
    sections: template.sections.map((section) => ({
      name: section.name,
      description: section.description,
      sortOrder: section.sortOrder,
      questions: section.questions.map((q) => ({
        questionText: q.questionText,
        helpText: q.helpText,
        answerType: q.answerType as ExportQuestion["answerType"],
        answerConfig: (q.answerConfig as Record<string, unknown>) ?? {},
        isRequired: q.isRequired,
        sortOrder: q.sortOrder,
        scoreWeight: parseFloat(q.scoreWeight ?? "1"),
        conditionalOnQuestionSortOrder: q.conditionalOnQuestionId
          ? (uuidToSortOrder.get(q.conditionalOnQuestionId) ?? null)
          : null,
        conditionalOperator: q.conditionalOperator as ExportQuestion["conditionalOperator"],
        conditionalValue: q.conditionalValue,
      })),
    })),
  };
}
