import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { isSeriesParticipant, isAdmin } from "@/lib/auth/rbac";
import { sharedNotesUpsertSchema } from "@/lib/validations/session";
import { sessions, meetingSeries } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * PUT /api/sessions/[id]/notes
 *
 * Upserts shared notes for a specific category.
 * Reads the current sharedNotes JSONB, updates the category key, writes back.
 */
export async function PUT(
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
    const data = sharedNotesUpsertSchema.parse(body);

    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Fetch session
        const sessionRows = await tx
          .select({
            id: sessions.id,
            seriesId: sessions.seriesId,
            status: sessions.status,
            sharedNotes: sessions.sharedNotes,
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

        const sessionRecord = sessionRows[0];

        if (sessionRecord.status !== "in_progress") {
          return { error: "SESSION_NOT_IN_PROGRESS" as const };
        }

        // Verify participant
        const seriesRows = await tx
          .select({
            managerId: meetingSeries.managerId,
            reportId: meetingSeries.reportId,
          })
          .from(meetingSeries)
          .where(eq(meetingSeries.id, sessionRecord.seriesId))
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

        // Update the sharedNotes JSONB: merge existing with new category content
        const currentNotes = (sessionRecord.sharedNotes ?? {}) as Record<
          string,
          string
        >;
        const updatedNotes = { ...currentNotes, [data.category]: data.content };

        await tx
          .update(sessions)
          .set({
            sharedNotes: updatedNotes,
            updatedAt: sql`now()`,
          })
          .where(eq(sessions.id, sessionId));

        return { success: true, sharedNotes: updatedNotes };
      }
    );

    if ("error" in result && !("success" in result)) {
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

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to save shared notes:", error);
    return NextResponse.json(
      { error: "Failed to save shared notes" },
      { status: 500 }
    );
  }
}
