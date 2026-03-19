import { NextResponse } from "next/server";
import { z } from "zod";
import { uuid } from "@/lib/validations/uuid";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { logAuditEvent } from "@/lib/audit/log";
import {
  sessions,
  meetingSeries,
  actionItems,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { AIActionSuggestions } from "@/lib/ai/schemas/action-items";

const STUCK_GENERATING_MS = 5 * 60 * 1000;

const suggestionActionSchema = z.object({
  suggestionIndex: z.number().int().min(0),
  action: z.enum(["accept", "skip"]),
  edits: z
    .object({
      title: z.string().max(500).optional(),
      description: z.string().max(2000).optional(),
      assigneeId: uuid.optional(),
    })
    .optional(),
});

/**
 * GET /api/sessions/[id]/ai-suggestions
 *
 * Returns AI suggestion status and list for polling.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: sessionId } = await params;

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const [sessionRecord] = await tx
          .select({
            id: sessions.id,
            seriesId: sessions.seriesId,
            aiSuggestions: sessions.aiSuggestions,
            aiStatus: sessions.aiStatus,
            updatedAt: sessions.updatedAt,
          })
          .from(sessions)
          .where(
            and(
              eq(sessions.id, sessionId),
              eq(sessions.tenantId, session.user.tenantId)
            )
          )
          .limit(1);

        if (!sessionRecord) {
          return { error: "NOT_FOUND" as const };
        }

        // Verify user is a participant
        const [series] = await tx
          .select({
            managerId: meetingSeries.managerId,
            reportId: meetingSeries.reportId,
          })
          .from(meetingSeries)
          .where(eq(meetingSeries.id, sessionRecord.seriesId))
          .limit(1);

        if (!series) {
          return { error: "NOT_FOUND" as const };
        }

        if (
          session.user.id !== series.managerId &&
          session.user.id !== series.reportId &&
          session.user.role !== "admin"
        ) {
          return { error: "FORBIDDEN" as const };
        }

        // Detect stuck "generating" sessions and auto-reset to "failed"
        let effectiveStatus = sessionRecord.aiStatus;
        if (effectiveStatus === "generating") {
          const elapsed = Date.now() - sessionRecord.updatedAt.getTime();
          if (elapsed > STUCK_GENERATING_MS) {
            await tx
              .update(sessions)
              .set({ aiStatus: "failed", updatedAt: new Date() })
              .where(eq(sessions.id, sessionId));
            effectiveStatus = "failed";
          }
        }

        return {
          status: effectiveStatus,
          suggestions: sessionRecord.aiSuggestions ?? null,
        };
      }
    );

    if ("error" in result) {
      switch (result.error) {
        case "NOT_FOUND":
          return NextResponse.json(
            { error: "Session not found" },
            { status: 404 }
          );
        case "FORBIDDEN":
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch AI suggestions:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI suggestions" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sessions/[id]/ai-suggestions
 *
 * Accept or skip an AI suggestion.
 * - "accept": Creates a real action item, removes suggestion from list
 * - "skip": Removes suggestion from list permanently
 *
 * Only the manager on the series can act on suggestions.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: sessionId } = await params;

  let body: z.infer<typeof suggestionActionSchema>;
  try {
    const raw = await request.json();
    body = suggestionActionSchema.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Fetch session
        const [sessionRecord] = await tx
          .select({
            id: sessions.id,
            seriesId: sessions.seriesId,
            aiSuggestions: sessions.aiSuggestions,
          })
          .from(sessions)
          .where(
            and(
              eq(sessions.id, sessionId),
              eq(sessions.tenantId, session.user.tenantId)
            )
          )
          .limit(1);

        if (!sessionRecord) {
          return { error: "NOT_FOUND" as const };
        }

        // Fetch the series
        const [series] = await tx
          .select({
            managerId: meetingSeries.managerId,
            reportId: meetingSeries.reportId,
          })
          .from(meetingSeries)
          .where(eq(meetingSeries.id, sessionRecord.seriesId))
          .limit(1);

        if (!series) {
          return { error: "NOT_FOUND" as const };
        }

        // Only the manager can accept/skip suggestions
        if (session.user.id !== series.managerId) {
          return { error: "FORBIDDEN" as const };
        }

        const suggestions = sessionRecord.aiSuggestions as AIActionSuggestions | null;
        if (!suggestions || !suggestions.suggestions) {
          return { error: "NO_SUGGESTIONS" as const };
        }

        if (body.suggestionIndex >= suggestions.suggestions.length) {
          return { error: "INVALID_INDEX" as const };
        }

        const suggestion = suggestions.suggestions[body.suggestionIndex];

        if (body.action === "accept") {
          // Map suggestedAssignee to actual user ID
          let assigneeId: string;
          if (body.edits?.assigneeId) {
            assigneeId = body.edits.assigneeId;
          } else {
            assigneeId =
              suggestion.suggestedAssignee === "manager"
                ? series.managerId
                : series.reportId;
          }

          // Create a real action item
          await tx.insert(actionItems).values({
            sessionId,
            tenantId: session.user.tenantId,
            assigneeId,
            createdById: session.user.id,
            title: body.edits?.title ?? suggestion.title,
            description: body.edits?.description ?? suggestion.description,
          });

          await logAuditEvent(tx, {
            tenantId: session.user.tenantId,
            actorId: session.user.id,
            action: "ai_suggestion_accepted",
            resourceType: "session",
            resourceId: sessionId,
            metadata: {
              suggestionTitle: suggestion.title,
              assigneeId,
            },
          });
        } else {
          // Skip: just remove from the list
          await logAuditEvent(tx, {
            tenantId: session.user.tenantId,
            actorId: session.user.id,
            action: "ai_suggestion_skipped",
            resourceType: "session",
            resourceId: sessionId,
            metadata: {
              suggestionTitle: suggestion.title,
            },
          });
        }

        // Remove the suggestion from the array
        const updatedSuggestions: AIActionSuggestions = {
          suggestions: suggestions.suggestions.filter(
            (_, idx) => idx !== body.suggestionIndex
          ),
        };

        await tx
          .update(sessions)
          .set({
            aiSuggestions: updatedSuggestions,
            updatedAt: new Date(),
          })
          .where(eq(sessions.id, sessionId));

        return {
          remaining: updatedSuggestions.suggestions.length,
        };
      }
    );

    if ("error" in result) {
      switch (result.error) {
        case "NOT_FOUND":
          return NextResponse.json(
            { error: "Session not found" },
            { status: 404 }
          );
        case "FORBIDDEN":
          return NextResponse.json(
            { error: "Only the manager can act on suggestions" },
            { status: 403 }
          );
        case "NO_SUGGESTIONS":
          return NextResponse.json(
            { error: "No AI suggestions available" },
            { status: 400 }
          );
        case "INVALID_INDEX":
          return NextResponse.json(
            { error: "Invalid suggestion index" },
            { status: 400 }
          );
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to process AI suggestion:", error);
    return NextResponse.json(
      { error: "Failed to process suggestion" },
      { status: 500 }
    );
  }
}
