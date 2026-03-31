import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { canManageTemplates } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit/log";
import { reorderQuestionsSchema } from "@/lib/validations/template";
import {
  questionnaireTemplates,
  templateQuestions,
} from "@/lib/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!canManageTemplates(session.user.level)) {
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
    const data = reorderQuestionsSchema.parse(body);

    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Verify template belongs to tenant
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

        // Verify all question IDs belong to this template and are non-archived
        const existingQuestions = await tx
          .select({ id: templateQuestions.id })
          .from(templateQuestions)
          .where(
            and(
              eq(templateQuestions.templateId, id),
              eq(templateQuestions.isArchived, false)
            )
          );

        const existingIds = new Set(existingQuestions.map((q) => q.id));

        for (const qId of data.questionIds) {
          if (!existingIds.has(qId)) {
            return {
              error: `Question ${qId} not found in this template`,
              status: 400,
            };
          }
        }

        // Verify all non-archived questions are included
        if (data.questionIds.length !== existingQuestions.length) {
          return {
            error: "All non-archived questions must be included in the reorder",
            status: 400,
          };
        }

        // Batch-assign contiguous sort_order values with a single CASE statement
        if (data.questionIds.length > 0) {
          const cases = data.questionIds
            .map((qid, i) => sql`WHEN ${templateQuestions.id} = ${qid} THEN ${i}`)
            .reduce((acc, c) => sql`${acc} ${c}`);
          await tx
            .update(templateQuestions)
            .set({ sortOrder: sql`CASE ${cases} END` })
            .where(inArray(templateQuestions.id, data.questionIds));
        }

        // Update template updatedAt
        await tx
          .update(questionnaireTemplates)
          .set({ updatedAt: new Date() })
          .where(eq(questionnaireTemplates.id, id));

        await logAuditEvent(tx, {
          tenantId: session.user.tenantId,
          actorId: session.user.id,
          action: "template_updated",
          resourceType: "template",
          resourceId: id,
          metadata: {
            type: "questions_reordered",
            questionCount: data.questionIds.length,
          },
        });

        return {
          data: {
            sortOrders: data.questionIds.map((qId, i) => ({
              questionId: qId,
              sortOrder: i,
            })),
          },
        };
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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to reorder questions:", error);
    return NextResponse.json(
      { error: "Failed to reorder questions" },
      { status: 500 }
    );
  }
}
