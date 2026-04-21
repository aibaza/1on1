import { z } from "zod";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { adminDb } from "@/lib/db";
import { feedbackReports, feedbackMessages, tenants, users } from "@/lib/db/schema";
import { createMessageSchema } from "@/lib/validations/feedback";
import { notifyReporterReply } from "@/lib/feedback/notifications";

/**
 * POST /api/feedback/[id]/messages — reporter appends a new message to
 * their own ticket. Supports `action: "reopen"` to move a resolved ticket
 * back to in_progress.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const reporterUserId =
    session.user.impersonatedBy?.id ?? session.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let data;
  try {
    data = createMessageSchema.parse(body);
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
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const [report] = await tx
          .select()
          .from(feedbackReports)
          .where(
            and(
              eq(feedbackReports.id, id),
              eq(feedbackReports.tenantId, session.user.tenantId),
              eq(feedbackReports.userId, reporterUserId)
            )
          )
          .limit(1);

        if (!report) {
          return { notFound: true as const };
        }

        // Handle reopen: only allowed from `resolved`
        if (data.action === "reopen") {
          if (report.status !== "resolved") {
            return { invalidAction: true as const };
          }
          const [updated] = await tx
            .update(feedbackReports)
            .set({
              status: "in_progress",
              resolvedAt: null,
              updatedAt: new Date(),
            })
            .where(eq(feedbackReports.id, id))
            .returning();
          if (updated) {
            Object.assign(report, updated);
          }
        }

        const [message] = await tx
          .insert(feedbackMessages)
          .values({
            feedbackId: id,
            tenantId: session.user.tenantId,
            authorId: reporterUserId,
            authorType: "reporter",
            body: data.body,
            isInternal: false,
          })
          .returning();

        return { report, message };
      }
    );

    if ("notFound" in result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if ("invalidAction" in result) {
      return NextResponse.json(
        { error: "Can only reopen a resolved ticket" },
        { status: 400 }
      );
    }

    // Notify support inbox (fire-and-forget, internally swallows errors).
    try {
      const [reporterRow] = await adminDb
        .select({
          id: users.id,
          name: users.name,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, reporterUserId))
        .limit(1);

      const [tenantRow] = await adminDb
        .select({ id: tenants.id, name: tenants.name })
        .from(tenants)
        .where(eq(tenants.id, session.user.tenantId))
        .limit(1);

      if (reporterRow && tenantRow) {
        const displayName =
          reporterRow.name ||
          `${reporterRow.firstName ?? ""} ${reporterRow.lastName ?? ""}`.trim() ||
          reporterRow.email ||
          "Reporter";

        void notifyReporterReply(
          {
            id: result.report.id,
            ticketNumber: result.report.ticketNumber,
            type: result.report.type,
            title: result.report.title,
            description: result.report.description,
            pageUrl: result.report.pageUrl,
            viewport: result.report.viewport,
            userAgent: result.report.userAgent,
            screenshotUrl: result.report.screenshotUrl,
          },
          {
            id: reporterRow.id,
            name: displayName,
            email: reporterRow.email,
          },
          data.body,
          tenantRow.name
        );
      }
    } catch (err) {
      console.error("Failed to enqueue reporter-reply notification:", err);
    }

    return NextResponse.json(result.message, { status: 201 });
  } catch (err) {
    console.error("Failed to create feedback message:", err);
    return NextResponse.json(
      { error: "Failed to create feedback message" },
      { status: 500 }
    );
  }
}
