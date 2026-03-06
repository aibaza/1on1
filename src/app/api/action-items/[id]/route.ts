import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { isAdmin, isSeriesParticipant } from "@/lib/auth/rbac";
import { standaloneUpdateActionItemSchema } from "@/lib/validations/action-item";
import {
  actionItems,
  sessions,
  meetingSeries,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * PATCH /api/action-items/[id]
 *
 * Updates an action item's title, description, assignee, due date, or status.
 * Authorization chain: action item -> session -> series -> verify user is participant.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: actionItemId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = standaloneUpdateActionItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const input = parsed.data;

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Fetch action item with authorization chain
        const rows = await tx
          .select({
            actionItemId: actionItems.id,
            assigneeId: actionItems.assigneeId,
            sessionId: sessions.id,
            managerId: meetingSeries.managerId,
            reportId: meetingSeries.reportId,
          })
          .from(actionItems)
          .innerJoin(sessions, eq(actionItems.sessionId, sessions.id))
          .innerJoin(meetingSeries, eq(sessions.seriesId, meetingSeries.id))
          .where(
            and(
              eq(actionItems.id, actionItemId),
              eq(actionItems.tenantId, session.user.tenantId)
            )
          )
          .limit(1);

        if (rows.length === 0) {
          return { error: "NOT_FOUND" as const };
        }

        const row = rows[0];

        // Authorization: user must be series participant or admin
        if (
          !isAdmin(session.user.role) &&
          !isSeriesParticipant(session.user.id, {
            managerId: row.managerId,
            reportId: row.reportId,
          })
        ) {
          return { error: "FORBIDDEN" as const };
        }

        // Only the assignee (or admin) can toggle status or edit fields
        if (
          !isAdmin(session.user.role) &&
          session.user.id !== row.assigneeId
        ) {
          return { error: "FORBIDDEN" as const };
        }

        // Build the update set from provided fields
        const updateSet: Record<string, unknown> = {
          updatedAt: new Date(),
        };

        if (input.title !== undefined) {
          updateSet.title = input.title;
        }

        if (input.description !== undefined) {
          updateSet.description = input.description;
        }

        if (input.assigneeId !== undefined) {
          updateSet.assigneeId = input.assigneeId;
        }

        if (input.dueDate !== undefined) {
          updateSet.dueDate = input.dueDate;
        }

        if (input.status !== undefined) {
          updateSet.status = input.status;
          if (input.status === "completed") {
            updateSet.completedAt = new Date();
          } else if (input.status === "open") {
            updateSet.completedAt = null;
          }
        }

        const updated = await tx
          .update(actionItems)
          .set(updateSet)
          .where(eq(actionItems.id, actionItemId))
          .returning();

        return updated[0];
      }
    );

    if (result && "error" in result) {
      if (result.error === "NOT_FOUND") {
        return NextResponse.json(
          { error: "Action item not found" },
          { status: 404 }
        );
      }
      if (result.error === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to update action item:", error);
    return NextResponse.json(
      { error: "Failed to update action item" },
      { status: 500 }
    );
  }
}
