import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { isSeriesParticipant, isAdmin } from "@/lib/auth/rbac";
import {
  createTalkingPointSchema,
  toggleTalkingPointSchema,
  deleteTalkingPointSchema,
} from "@/lib/validations/session";
import {
  sessions,
  meetingSeries,
  talkingPoints,
  templateSections,
} from "@/lib/db/schema";
import { eq, and, asc, sql } from "drizzle-orm";
import { syncTalkingPointsToCalendar } from "@/lib/calendar/agenda";

/**
 * GET /api/sessions/[id]/talking-points
 *
 * Lists talking points for a session. Optional ?category=xxx filter.
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
          .select({ id: sessions.id, seriesId: sessions.seriesId, templateId: sessions.templateId })
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

        // Fetch template section names (these are the available categories)
        let sectionNames: string[] = [];
        if (sessionRows[0].templateId) {
          const sectionRows = await tx
            .select({ name: templateSections.name })
            .from(templateSections)
            .where(eq(templateSections.templateId, sessionRows[0].templateId))
            .orderBy(asc(templateSections.sortOrder));
          sectionNames = sectionRows.map((s) => s.name);
        }

        // Build query
        const conditions = [eq(talkingPoints.sessionId, sessionId)];
        if (category) {
          conditions.push(eq(talkingPoints.category, category));
        }

        const points = await tx
          .select()
          .from(talkingPoints)
          .where(and(...conditions))
          .orderBy(asc(talkingPoints.sortOrder));

        return {
          categories: sectionNames.length > 0 ? sectionNames : ["General"],
          talkingPoints: points.map((p) => ({
            id: p.id,
            content: p.content,
            category: p.category,
            sortOrder: p.sortOrder,
            isDiscussed: p.isDiscussed,
            discussedAt: p.discussedAt?.toISOString() ?? null,
            authorId: p.authorId,
            carriedFromSessionId: p.carriedFromSessionId,
            createdAt: p.createdAt.toISOString(),
          })),
        };
      }
    );

    if ("error" in result && !("talkingPoints" in result)) {
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
    console.error("Failed to fetch talking points:", error);
    return NextResponse.json(
      { error: "Failed to fetch talking points" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sessions/[id]/talking-points
 *
 * Creates a new talking point.
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
    const data = createTalkingPointSchema.parse(body);

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

        if (sessionRows[0].status !== "in_progress" && sessionRows[0].status !== "scheduled") {
          return { error: "SESSION_NOT_ACTIVE" as const };
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

        // Create talking point
        const [point] = await tx
          .insert(talkingPoints)
          .values({
            sessionId,
            authorId: session.user.id,
            content: data.content,
            category: data.category,
            sortOrder: data.sortOrder,
          })
          .returning();

        return {
          talkingPoint: {
            id: point.id,
            content: point.content,
            category: point.category,
            sortOrder: point.sortOrder,
            isDiscussed: point.isDiscussed,
            discussedAt: point.discussedAt?.toISOString() ?? null,
            authorId: point.authorId,
            carriedFromSessionId: point.carriedFromSessionId,
            createdAt: point.createdAt.toISOString(),
          },
        };
      }
    );

    if ("error" in result && !("talkingPoint" in result)) {
      switch (result.error) {
        case "NOT_FOUND":
          return NextResponse.json(
            { error: "Session not found" },
            { status: 404 }
          );
        case "FORBIDDEN":
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        case "SESSION_NOT_ACTIVE":
          return NextResponse.json(
            { error: "Session is not active" },
            { status: 409 }
          );
      }
    }

    // Sync agenda to calendar (non-blocking)
    syncTalkingPointsToCalendar(sessionId).catch(() => {});

    return NextResponse.json(
      (result as { talkingPoint: unknown }).talkingPoint,
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to create talking point:", error);
    return NextResponse.json(
      { error: "Failed to create talking point" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/sessions/[id]/talking-points
 *
 * Toggles a talking point's discussed status.
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
    const data = toggleTalkingPointSchema.parse(body);

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

        // Update the talking point
        const [updated] = await tx
          .update(talkingPoints)
          .set({
            isDiscussed: data.isDiscussed,
            discussedAt: data.isDiscussed ? sql`now()` : null,
          })
          .where(
            and(
              eq(talkingPoints.id, data.id),
              eq(talkingPoints.sessionId, sessionId)
            )
          )
          .returning();

        if (!updated) {
          return { error: "POINT_NOT_FOUND" as const };
        }

        return {
          talkingPoint: {
            id: updated.id,
            isDiscussed: updated.isDiscussed,
            discussedAt: updated.discussedAt?.toISOString() ?? null,
          },
        };
      }
    );

    if ("error" in result && !("talkingPoint" in result)) {
      switch (result.error) {
        case "NOT_FOUND":
        case "POINT_NOT_FOUND":
          return NextResponse.json(
            { error: "Not found" },
            { status: 404 }
          );
        case "FORBIDDEN":
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json(
      (result as { talkingPoint: unknown }).talkingPoint
    );
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to toggle talking point:", error);
    return NextResponse.json(
      { error: "Failed to toggle talking point" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sessions/[id]/talking-points
 *
 * Deletes a talking point.
 */
export async function DELETE(
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
    const data = deleteTalkingPointSchema.parse(body);

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

        // Delete the talking point
        const deleted = await tx
          .delete(talkingPoints)
          .where(
            and(
              eq(talkingPoints.id, data.id),
              eq(talkingPoints.sessionId, sessionId)
            )
          )
          .returning();

        if (deleted.length === 0) {
          return { error: "POINT_NOT_FOUND" as const };
        }

        return { success: true };
      }
    );

    if ("error" in result && !("success" in result)) {
      switch (result.error) {
        case "NOT_FOUND":
        case "POINT_NOT_FOUND":
          return NextResponse.json(
            { error: "Not found" },
            { status: 404 }
          );
        case "FORBIDDEN":
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Sync agenda to calendar (non-blocking)
    syncTalkingPointsToCalendar(sessionId).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to delete talking point:", error);
    return NextResponse.json(
      { error: "Failed to delete talking point" },
      { status: 500 }
    );
  }
}
