import { eq, and, asc } from "drizzle-orm";
import type { TransactionClient } from "@/lib/db/tenant-context";
import {
  templateSections,
  templateQuestions,
  templateLabelAssignments,
} from "@/lib/db/schema";

/**
 * Self-contained snapshot of a template at a specific version.
 * Stored as JSONB in template_version.snapshot.
 */
export interface TemplateVersionSnapshot {
  name: string;
  description: string | null;
  sections: Array<{
    id: string;
    name: string;
    description: string | null;
    sortOrder: number;
    questions: Array<{
      id: string;
      questionText: string;
      helpText: string | null;
      answerType: string;
      answerConfig: Record<string, unknown>;
      isRequired: boolean;
      sortOrder: number;
      scoreWeight: string;
      conditionalOnQuestionId: string | null;
      conditionalOperator: string | null;
      conditionalValue: string | null;
    }>;
  }>;
  labelIds: string[];
}

/**
 * Builds a complete snapshot of the template's current state.
 * Queries sections (non-archived), questions (non-archived), and label assignments.
 */
export async function buildTemplateSnapshot(
  tx: TransactionClient,
  templateId: string,
  templateName: string,
  templateDescription: string | null
): Promise<TemplateVersionSnapshot> {
  // 1. Fetch non-archived sections ordered by sortOrder
  const sections = await tx
    .select({
      id: templateSections.id,
      name: templateSections.name,
      description: templateSections.description,
      sortOrder: templateSections.sortOrder,
    })
    .from(templateSections)
    .where(
      and(
        eq(templateSections.templateId, templateId),
        eq(templateSections.isArchived, false)
      )
    )
    .orderBy(asc(templateSections.sortOrder));

  // 2. Fetch non-archived questions ordered by sortOrder
  const questions = await tx
    .select({
      id: templateQuestions.id,
      sectionId: templateQuestions.sectionId,
      questionText: templateQuestions.questionText,
      helpText: templateQuestions.helpText,
      answerType: templateQuestions.answerType,
      answerConfig: templateQuestions.answerConfig,
      isRequired: templateQuestions.isRequired,
      sortOrder: templateQuestions.sortOrder,
      scoreWeight: templateQuestions.scoreWeight,
      conditionalOnQuestionId: templateQuestions.conditionalOnQuestionId,
      conditionalOperator: templateQuestions.conditionalOperator,
      conditionalValue: templateQuestions.conditionalValue,
    })
    .from(templateQuestions)
    .where(
      and(
        eq(templateQuestions.templateId, templateId),
        eq(templateQuestions.isArchived, false)
      )
    )
    .orderBy(asc(templateQuestions.sortOrder));

  // 3. Fetch label assignments
  const labels = await tx
    .select({ labelId: templateLabelAssignments.labelId })
    .from(templateLabelAssignments)
    .where(eq(templateLabelAssignments.templateId, templateId));

  // 4. Group questions by sectionId
  const questionsBySection = new Map<string, TemplateVersionSnapshot["sections"][number]["questions"]>();
  for (const q of questions) {
    const list = questionsBySection.get(q.sectionId) ?? [];
    list.push({
      id: q.id,
      questionText: q.questionText,
      helpText: q.helpText,
      answerType: q.answerType,
      answerConfig: (q.answerConfig ?? {}) as Record<string, unknown>,
      isRequired: q.isRequired,
      sortOrder: q.sortOrder,
      scoreWeight: q.scoreWeight,
      conditionalOnQuestionId: q.conditionalOnQuestionId,
      conditionalOperator: q.conditionalOperator,
      conditionalValue: q.conditionalValue,
    });
    questionsBySection.set(q.sectionId, list);
  }

  // 5. Build snapshot
  return {
    name: templateName,
    description: templateDescription,
    sections: sections.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      sortOrder: s.sortOrder,
      questions: questionsBySection.get(s.id) ?? [],
    })),
    labelIds: labels.map((l) => l.labelId),
  };
}
