import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { canManageTemplates } from "@/lib/auth/rbac";
import { questionnaireTemplates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

const aiChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  hidden: z.boolean().optional(),
  hiddenFromAI: z.boolean().optional(),
});

const aiVersionSnapshotSchema = z.object({
  timestamp: z.string(),
  template: z.unknown(),
});

const bodySchema = z.object({
  messages: z.array(aiChatMessageSchema),
  newVersion: z
    .object({ template: z.unknown() })
    .optional(),
});

/**
 * POST /api/templates/[id]/ai-history
 *
 * Persists the AI chat message history for a template and optionally appends
 * a new version snapshot when the AI has applied a template change.
 *
 * Body: { messages: AiChatMessage[], newVersion?: { template: TemplateExport } }
 * Returns 200 on success.
 */
export async function POST(request: Request, { params }: RouteContext) {
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

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { messages, newVersion } = parsed.data;

  try {
    await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const [template] = await tx
          .select({
            id: questionnaireTemplates.id,
            aiVersionHistory: questionnaireTemplates.aiVersionHistory,
          })
          .from(questionnaireTemplates)
          .where(
            and(
              eq(questionnaireTemplates.id, id),
              eq(questionnaireTemplates.tenantId, session.user.tenantId),
              eq(questionnaireTemplates.isArchived, false)
            )
          )
          .limit(1);

        if (!template) {
          throw new Error("not_found");
        }

        // Build updated version history
        let versionHistory = (template.aiVersionHistory as z.infer<typeof aiVersionSnapshotSchema>[] | null) ?? [];
        if (newVersion) {
          versionHistory = [
            ...versionHistory,
            { timestamp: new Date().toISOString(), template: newVersion.template },
          ];
        }

        await tx
          .update(questionnaireTemplates)
          .set({
            aiChatHistory: messages,
            aiVersionHistory: versionHistory,
            updatedAt: new Date(),
          })
          .where(eq(questionnaireTemplates.id, id));
      }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "not_found") {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    console.error("[ai-history] Error:", error);
    return NextResponse.json({ error: "Failed to save history" }, { status: 500 });
  }
}

/**
 * GET /api/templates/[id]/ai-history
 *
 * Returns the persisted AI chat history and version snapshots for a template.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!canManageTemplates(session.user.level)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const [template] = await tx
          .select({
            aiChatHistory: questionnaireTemplates.aiChatHistory,
            aiVersionHistory: questionnaireTemplates.aiVersionHistory,
          })
          .from(questionnaireTemplates)
          .where(
            and(
              eq(questionnaireTemplates.id, id),
              eq(questionnaireTemplates.tenantId, session.user.tenantId),
              eq(questionnaireTemplates.isArchived, false)
            )
          )
          .limit(1);

        return template ?? null;
      }
    );

    if (!result) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({
      messages: (result.aiChatHistory as unknown[] | null) ?? null,
      versions: (result.aiVersionHistory as unknown[] | null) ?? null,
    });
  } catch (error) {
    console.error("[ai-history] GET error:", error);
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }
}
