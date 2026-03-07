import { z } from "zod";
import type { ModelMessage } from "ai";
import { auth } from "@/lib/auth/config";
import { canManageTemplates } from "@/lib/auth/rbac";
import { generateTemplateChatTurn } from "@/lib/ai/service";
import { adminDb } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Request body schema for POST /api/templates/ai-chat
 *
 * messages: full conversation history (user + assistant turns)
 * currentTemplate: current template state from client, or null if starting from scratch
 */
const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .min(1),
  currentTemplate: z
    .object({
      schemaVersion: z.literal(1),
      language: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      sections: z.array(z.any()),
    })
    .nullable(),
});

/**
 * POST /api/templates/ai-chat
 *
 * Receives a chat turn (message history + current template state), calls the AI
 * template editor service, and returns the AI response.
 *
 * RBAC: admin or manager only (canManageTemplates).
 * Returns 200 { chatMessage, templateJson } on success.
 * Returns 400 { error, details } on invalid request body.
 * Returns 401 for unauthenticated requests.
 * Returns 403 for member role.
 * Returns 500 { error } on AI generation failure.
 *
 * Note: No audit log — AI chat turns are not auditable write operations on tenant data.
 * The template is saved only when the user explicitly hits Save (separate API call).
 */
export async function POST(req: Request) {
  // 1. Auth check
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. RBAC check — admin and manager only
  if (!canManageTemplates(session.user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3. Validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // 4. Fetch company language fresh from DB.
  //    The settings page saves language to tenants.settings.preferredLanguage (JSONB).
  //    tenants.contentLanguage is a legacy column never written by the settings page.
  //    uiLanguage comes from JWT (user's personal preference, always up-to-date).
  const [tenantRow] = await adminDb
    .select({ settings: tenants.settings })
    .from(tenants)
    .where(eq(tenants.id, session.user.tenantId));
  const tenantSettings = (tenantRow?.settings ?? {}) as Record<string, unknown>;
  const contentLanguage = (tenantSettings.preferredLanguage as string | undefined) ?? "en";
  const uiLanguage = session.user.uiLanguage ?? "en";

  // 5. Call AI service and return result
  try {
    const result = await generateTemplateChatTurn(
      parsed.data.messages as ModelMessage[],
      parsed.data.currentTemplate,
      contentLanguage,
      uiLanguage
    );

    return Response.json(result);
  } catch (err) {
    console.error("[ai-chat] generation failed:", err);
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }
}
