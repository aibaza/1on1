import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { canManageTemplates } from "@/lib/auth/rbac";
import { questionSchema, validateAnswerConfig } from "@/lib/validations/template";
import { questionnaireTemplates, templateQuestions, templateSections } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

// Extended schema that requires sectionId for single question creation
const createQuestionSchema = questionSchema.extend({
  sectionId: z.string().uuid("Section ID is required"),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!canManageTemplates(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const data = createQuestionSchema.parse(body);

    // Validate answer_config matches answerType
    const configError = validateAnswerConfig(
      data.answerType,
      data.answerConfig
    );
    if (configError) {
      return NextResponse.json({ error: configError }, { status: 400 });
    }

    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Verify template exists and belongs to tenant
        const [template] = await tx
          .select({ id: questionnaireTemplates.id })
          .from(questionnaireTemplates)
          .where(
            and(
              eq(questionnaireTemplates.id, id),
              eq(questionnaireTemplates.tenantId, session.user.tenantId)
            )
          );

        if (!template) {
          return { error: "Template not found", status: 404 };
        }

        // Verify section exists and belongs to this template
        const [section] = await tx
          .select({ id: templateSections.id })
          .from(templateSections)
          .where(
            and(
              eq(templateSections.id, data.sectionId),
              eq(templateSections.templateId, id)
            )
          );

        if (!section) {
          return { error: "Section not found", status: 404 };
        }

        const [question] = await tx
          .insert(templateQuestions)
          .values({
            templateId: id,
            sectionId: data.sectionId,
            questionText: data.questionText,
            helpText: data.helpText ?? null,
            answerType: data.answerType,
            answerConfig: data.answerConfig,
            isRequired: data.isRequired,
            sortOrder: data.sortOrder,
            conditionalOnQuestionId: data.conditionalOnQuestionId ?? null,
            conditionalOperator: data.conditionalOperator ?? null,
            conditionalValue: data.conditionalValue ?? null,
            scoreWeight: data.scoreWeight !== undefined ? String(data.scoreWeight) : "1",
          })
          .returning();

        return { data: question };
      }
    );

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to create question:", error);
    return NextResponse.json(
      { error: "Failed to create question" },
      { status: 500 }
    );
  }
}
