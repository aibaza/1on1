import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { canManageTemplates } from "@/lib/auth/rbac";
import { questionSchema, validateAnswerConfig } from "@/lib/validations/template";
import { questionnaireTemplates, templateQuestions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string; questionId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!canManageTemplates(session.user.level)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, questionId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const data = questionSchema.partial().parse(body);

    // Validate answer_config if both answerType and answerConfig are provided
    if (data.answerType && data.answerConfig) {
      const configError = validateAnswerConfig(
        data.answerType,
        data.answerConfig
      );
      if (configError) {
        return NextResponse.json({ error: configError }, { status: 400 });
      }
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

        // Verify question exists and belongs to this template
        const [question] = await tx
          .select({ id: templateQuestions.id })
          .from(templateQuestions)
          .where(
            and(
              eq(templateQuestions.id, questionId),
              eq(templateQuestions.templateId, id)
            )
          );

        if (!question) {
          return { error: "Question not found", status: 404 };
        }

        const updatePayload: Record<string, unknown> = {};
        if (data.questionText !== undefined)
          updatePayload.questionText = data.questionText;
        if (data.helpText !== undefined)
          updatePayload.helpText = data.helpText;
        if (data.answerType !== undefined)
          updatePayload.answerType = data.answerType;
        if (data.answerConfig !== undefined)
          updatePayload.answerConfig = data.answerConfig;
        if (data.isRequired !== undefined)
          updatePayload.isRequired = data.isRequired;
        if (data.sortOrder !== undefined)
          updatePayload.sortOrder = data.sortOrder;
        if (data.conditionalOnQuestionId !== undefined)
          updatePayload.conditionalOnQuestionId =
            data.conditionalOnQuestionId;
        if (data.conditionalOperator !== undefined)
          updatePayload.conditionalOperator = data.conditionalOperator;
        if (data.conditionalValue !== undefined)
          updatePayload.conditionalValue = data.conditionalValue;
        if (data.scoreWeight !== undefined)
          updatePayload.scoreWeight = String(data.scoreWeight);

        const [updated] = await tx
          .update(templateQuestions)
          .set(updatePayload)
          .where(eq(templateQuestions.id, questionId))
          .returning();

        return { data: updated };
      }
    );

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to update question:", error);
    return NextResponse.json(
      { error: "Failed to update question" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!canManageTemplates(session.user.level)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, questionId } = await params;

  try {
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

        // Verify question exists and belongs to this template
        const [question] = await tx
          .select({ id: templateQuestions.id })
          .from(templateQuestions)
          .where(
            and(
              eq(templateQuestions.id, questionId),
              eq(templateQuestions.templateId, id)
            )
          );

        if (!question) {
          return { error: "Question not found", status: 404 };
        }

        // Soft delete: archive the question
        await tx
          .update(templateQuestions)
          .set({ isArchived: true })
          .where(eq(templateQuestions.id, questionId));

        return { success: true };
      }
    );

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to archive question:", error);
    return NextResponse.json(
      { error: "Failed to archive question" },
      { status: 500 }
    );
  }
}
