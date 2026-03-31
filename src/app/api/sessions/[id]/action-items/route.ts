import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { isSeriesParticipant, isAdmin } from "@/lib/auth/rbac";
import {
  createActionItemSchema,
  updateActionItemSchema,
} from "@/lib/validations/session";
import {
  sessions,
  meetingSeries,
  actionItems,
  users,
} from "@/lib/db/schema";
import { eq, and, asc, sql } from "drizzle-orm";

/**
 * GET /api/sessions/[id]/action-items
 *
 * Lists action items for a session. Optional ?category=xxx filter.
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
  const url = new URL(request.url);
  const category = url.searchParams.get("category");

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Verify session exists
        const sessionRows = await tx
          .select({ id: sessions.id, seriesId: sessions.seriesId })
          .from(sessions)
          .where(
            and(
              eq(sessions.id, sessionId),
              eq(sessions.tenantId, session.user.tenantId)
            )
          )
          .limit(1);

        if (sessionRows.length === 0) {
          return { error: "NOT_FOUND" as const };
        }

        // Verify participant
        const seriesRows = await tx
          .select({
            managerId: meetingSeries.managerId,
            reportId: meetingSeries.reportId,
          })
          .from(meetingSeries)
          .where(eq(meetingSeries.id, sessionRows[0].seriesId))
          .limit(1);

        if (seriesRows.length === 0) {
          return { error: "NOT_FOUND" as const };
        }

        if (
          !isAdmin(session.user.level) &&
          !isSeriesParticipant(session.user.id, seriesRows[0])
        ) {
          return { error: "FORBIDDEN" as const };
        }

        // Build query
        const conditions = [eq(actionItems.sessionId, sessionId)];
        if (category) {
          conditions.push(eq(actionItems.category, category));
        }

        const items = await tx
          .select({
            id: actionItems.id,
            title: actionItems.title,
            description: actionItems.description,
            category: actionItems.category,
            assigneeId: actionItems.assigneeId,
            createdById: actionItems.createdById,
            dueDate: actionItems.dueDate,
            status: actionItems.status,
            completedAt: actionItems.completedAt,
            createdAt: actionItems.createdAt,
          })
          .from(actionItems)
          .where(and(...conditions))
          .orderBy(asc(actionItems.createdAt));

        // Get assignee names
        const userIds = [
          ...new Set(items.map((i) => i.assigneeId)),
        ];
        const userMap = new Map<string, { firstName: string; lastName: string }>();
        if (userIds.length > 0) {
          for (const uid of userIds) {
            const [user] = await tx
              .select({
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
              })
              .from(users)
              .where(eq(users.id, uid))
              .limit(1);
            if (user) {
              userMap.set(user.id, {
                firstName: user.firstName,
                lastName: user.lastName,
              });
            }
          }
        }

        return {
          actionItems: items.map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            category: item.category,
            assigneeId: item.assigneeId,
            assignee: userMap.get(item.assigneeId) ?? null,
            createdById: item.createdById,
            dueDate: item.dueDate,
            status: item.status,
            completedAt: item.completedAt?.toISOString() ?? null,
            createdAt: item.createdAt.toISOString(),
          })),
        };
      }
    );

    if ("error" in result && !("actionItems" in result)) {
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
    console.error("Failed to fetch action items:", error);
    return NextResponse.json(
      { error: "Failed to fetch action items" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sessions/[id]/action-items
 *
 * Creates a new action item.
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const data = createActionItemSchema.parse(body);

    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Verify session
        const sessionRows = await tx
          .select({
            id: sessions.id,
            seriesId: sessions.seriesId,
            status: sessions.status,
          })
          .from(sessions)
          .where(
            and(
              eq(sessions.id, sessionId),
              eq(sessions.tenantId, session.user.tenantId)
            )
          )
          .limit(1);

        if (sessionRows.length === 0) {
          return { error: "NOT_FOUND" as const };
        }

        if (sessionRows[0].status !== "in_progress") {
          return { error: "SESSION_NOT_IN_PROGRESS" as const };
        }

        // Verify participant
        const seriesRows = await tx
          .select({
            managerId: meetingSeries.managerId,
            reportId: meetingSeries.reportId,
          })
          .from(meetingSeries)
          .where(eq(meetingSeries.id, sessionRows[0].seriesId))
          .limit(1);

        if (seriesRows.length === 0) {
          return { error: "NOT_FOUND" as const };
        }

        if (
          !isAdmin(session.user.level) &&
          !isSeriesParticipant(session.user.id, seriesRows[0])
        ) {
          return { error: "FORBIDDEN" as const };
        }

        // Create action item
        const [item] = await tx
          .insert(actionItems)
          .values({
            sessionId,
            tenantId: session.user.tenantId,
            assigneeId: data.assigneeId,
            createdById: session.user.id,
            title: data.title,
            dueDate: data.dueDate ?? null,
            category: data.category ?? null,
            status: "open",
          })
          .returning();

        // Get assignee name
        const [assignee] = await tx
          .select({
            firstName: users.firstName,
            lastName: users.lastName,
          })
          .from(users)
          .where(eq(users.id, item.assigneeId))
          .limit(1);

        return {
          actionItem: {
            id: item.id,
            title: item.title,
            description: item.description,
            category: item.category,
            assigneeId: item.assigneeId,
            assignee: assignee ?? null,
            createdById: item.createdById,
            dueDate: item.dueDate,
            status: item.status,
            completedAt: item.completedAt?.toISOString() ?? null,
            createdAt: item.createdAt.toISOString(),
          },
        };
      }
    );

    if ("error" in result && !("actionItem" in result)) {
      switch (result.error) {
        case "NOT_FOUND":
          return NextResponse.json(
            { error: "Session not found" },
            { status: 404 }
          );
        case "FORBIDDEN":
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        case "SESSION_NOT_IN_PROGRESS":
          return NextResponse.json(
            { error: "Session is not in progress" },
            { status: 409 }
          );
      }
    }

    return NextResponse.json(
      (result as { actionItem: unknown }).actionItem,
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to create action item:", error);
    return NextResponse.json(
      { error: "Failed to create action item" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/sessions/[id]/action-items
 *
 * Updates an action item (title, status).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: sessionId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const data = updateActionItemSchema.parse(body);

    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Verify session
        const sessionRows = await tx
          .select({ id: sessions.id, seriesId: sessions.seriesId })
          .from(sessions)
          .where(
            and(
              eq(sessions.id, sessionId),
              eq(sessions.tenantId, session.user.tenantId)
            )
          )
          .limit(1);

        if (sessionRows.length === 0) {
          return { error: "NOT_FOUND" as const };
        }

        // Verify participant
        const seriesRows = await tx
          .select({
            managerId: meetingSeries.managerId,
            reportId: meetingSeries.reportId,
          })
          .from(meetingSeries)
          .where(eq(meetingSeries.id, sessionRows[0].seriesId))
          .limit(1);

        if (seriesRows.length === 0) {
          return { error: "NOT_FOUND" as const };
        }

        if (
          !isAdmin(session.user.level) &&
          !isSeriesParticipant(session.user.id, seriesRows[0])
        ) {
          return { error: "FORBIDDEN" as const };
        }

        // Build update set
        const updateSet: Record<string, unknown> = {
          updatedAt: sql`now()`,
        };
        if (data.title !== undefined) updateSet.title = data.title;
        if (data.status !== undefined) {
          updateSet.status = data.status;
          if (data.status === "completed") {
            updateSet.completedAt = sql`now()`;
          }
        }

        const [updated] = await tx
          .update(actionItems)
          .set(updateSet)
          .where(
            and(
              eq(actionItems.id, data.id),
              eq(actionItems.sessionId, sessionId)
            )
          )
          .returning();

        if (!updated) {
          return { error: "ITEM_NOT_FOUND" as const };
        }

        return {
          actionItem: {
            id: updated.id,
            title: updated.title,
            status: updated.status,
            completedAt: updated.completedAt?.toISOString() ?? null,
          },
        };
      }
    );

    if ("error" in result && !("actionItem" in result)) {
      switch (result.error) {
        case "NOT_FOUND":
        case "ITEM_NOT_FOUND":
          return NextResponse.json(
            { error: "Not found" },
            { status: 404 }
          );
        case "FORBIDDEN":
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json(
      (result as { actionItem: unknown }).actionItem
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to update action item:", error);
    return NextResponse.json(
      { error: "Failed to update action item" },
      { status: 500 }
    );
  }
}
