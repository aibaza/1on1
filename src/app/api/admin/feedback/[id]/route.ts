import { z } from "zod";
import { NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { isSuperAdmin } from "@/lib/auth/super-admin";
import { adminDb } from "@/lib/db";
import { feedbackReports, feedbackMessages, tenants, users } from "@/lib/db/schema";
import { updateFeedbackAdminSchema } from "@/lib/validations/feedback";

/**
 * GET /api/admin/feedback/[id] — full cross-tenant detail for admin inbox,
 * including tenant info, reporter info, and all messages (internal + public).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!isSuperAdmin(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const [report] = await adminDb
      .select()
      .from(feedbackReports)
      .where(eq(feedbackReports.id, id))
      .limit(1);

    if (!report) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [tenantRow] = await adminDb
      .select({ id: tenants.id, name: tenants.name, slug: tenants.slug })
      .from(tenants)
      .where(eq(tenants.id, report.tenantId))
      .limit(1);

    const [reporterRow] = await adminDb
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, report.userId))
      .limit(1);

    let assignedToRow = null;
    if (report.assignedToUserId) {
      const [row] = await adminDb
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(eq(users.id, report.assignedToUserId))
        .limit(1);
      assignedToRow = row ?? null;
    }

    const messages = await adminDb
      .select({
        id: feedbackMessages.id,
        feedbackId: feedbackMessages.feedbackId,
        tenantId: feedbackMessages.tenantId,
        authorId: feedbackMessages.authorId,
        authorType: feedbackMessages.authorType,
        body: feedbackMessages.body,
        isInternal: feedbackMessages.isInternal,
        createdAt: feedbackMessages.createdAt,
        authorFirstName: users.firstName,
        authorLastName: users.lastName,
        authorName: users.name,
        authorEmail: users.email,
        authorAvatarUrl: users.avatarUrl,
      })
      .from(feedbackMessages)
      .leftJoin(users, eq(feedbackMessages.authorId, users.id))
      .where(eq(feedbackMessages.feedbackId, id))
      .orderBy(asc(feedbackMessages.createdAt));

    return NextResponse.json({
      report,
      tenant: tenantRow ?? null,
      reporter: reporterRow ?? null,
      assignedTo: assignedToRow,
      messages,
    });
  } catch (err) {
    console.error("Failed to fetch admin feedback detail:", err);
    return NextResponse.json(
      { error: "Failed to fetch feedback" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/feedback/[id] — update admin-only fields
 * (status, priority, tags, assignedTo, closeReason).
 * Side effects: `resolvedAt` auto-syncs with status.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!isSuperAdmin(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let data;
  try {
    data = updateFeedbackAdminSchema.parse(body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: err },
        { status: 400 }
      );
    }
    throw err;
  }

  try {
    const [existing] = await adminDb
      .select()
      .from(feedbackReports)
      .where(eq(feedbackReports.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updates: Partial<typeof feedbackReports.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.status !== undefined) {
      updates.status = data.status;
      // Sync resolvedAt with status transitions
      if (data.status === "resolved") {
        updates.resolvedAt = new Date();
      } else if (existing.status === "resolved") {
        updates.resolvedAt = null;
      }
    }
    if (data.priority !== undefined) updates.priority = data.priority;
    if (data.tags !== undefined) updates.tags = data.tags;
    if (data.assignedToUserId !== undefined)
      updates.assignedToUserId = data.assignedToUserId;
    if (data.closeReason !== undefined) updates.closeReason = data.closeReason;

    const [updated] = await adminDb
      .update(feedbackReports)
      .set(updates)
      .where(eq(feedbackReports.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Failed to update admin feedback:", err);
    return NextResponse.json(
      { error: "Failed to update feedback" },
      { status: 500 }
    );
  }
}
