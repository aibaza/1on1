import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { isSeriesParticipant, isAdmin } from "@/lib/auth/rbac";
import { privateNoteUpsertSchema } from "@/lib/validations/session";
import { sessions, meetingSeries, privateNotes } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { encryptNote, decryptNote, type EncryptedPayload } from "@/lib/encryption/private-notes";

/**
 * GET /api/sessions/[id]/notes/private
 *
 * Returns decrypted private notes for the authenticated user keyed by category.
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
        // Verify session exists and user is participant
        const sessionRows = await tx
          .select({
            id: sessions.id,
            seriesId: sessions.seriesId,
            tenantId: sessions.tenantId,
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

        // Fetch all private notes for this session + author
        const notes = await tx
          .select({
            id: privateNotes.id,
            content: privateNotes.content,
            category: privateNotes.category,
            keyVersion: privateNotes.keyVersion,
          })
          .from(privateNotes)
          .where(
            and(
              eq(privateNotes.sessionId, sessionId),
              eq(privateNotes.authorId, session.user.id)
            )
          );

        // Decrypt each note, keyed by category
        const decryptedByCategory: Record<string, string> = {};
        for (const note of notes) {
          const category = note.category ?? "general";
          try {
            const payload: EncryptedPayload = JSON.parse(note.content);
            decryptedByCategory[category] = decryptNote(
              payload,
              session.user.tenantId
            );
          } catch {
            // If content is not encrypted JSON, pass through as-is (legacy data)
            decryptedByCategory[category] = note.content;
          }
        }

        return { notes: decryptedByCategory };
      }
    );

    if ("error" in result && !("notes" in result)) {
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
    console.error("Failed to fetch private notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch private notes" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/sessions/[id]/notes/private
 *
 * Upserts an encrypted private note for the authenticated user on a category.
 * Uses UNIQUE(session_id, author_id, category) for upsert.
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
    const data = privateNoteUpsertSchema.parse(body);

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

        // Encrypt the note content
        const encrypted = encryptNote(data.content, session.user.tenantId);
        const encryptedJson = JSON.stringify(encrypted);

        // Upsert using the unique constraint (session_id, author_id, category)
        await tx
          .insert(privateNotes)
          .values({
            sessionId,
            authorId: session.user.id,
            content: encryptedJson,
            category: data.category,
            keyVersion: encrypted.keyVersion,
          })
          .onConflictDoUpdate({
            target: [
              privateNotes.sessionId,
              privateNotes.authorId,
              privateNotes.category,
            ],
            set: {
              content: sql`excluded.content`,
              keyVersion: sql`excluded.key_version`,
              updatedAt: sql`now()`,
            },
          });

        return { success: true };
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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to save private note:", error);
    return NextResponse.json(
      { error: "Failed to save private note" },
      { status: 500 }
    );
  }
}
