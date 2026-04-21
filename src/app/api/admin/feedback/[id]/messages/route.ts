import { z } from "zod";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { isSuperAdmin } from "@/lib/auth/super-admin";
import { adminDb } from "@/lib/db";
import { feedbackReports, feedbackMessages, users } from "@/lib/db/schema";
import { createAdminMessageSchema } from "@/lib/validations/feedback";
import { notifyAdminReply } from "@/lib/feedback/notifications";

/**
 * POST /api/admin/feedback/[id]/messages — platform admin replies on a ticket.
 * Supports `isInternal` flag. Non-internal messages trigger an email to the reporter.
 */
export async function POST(
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
    data = createAdminMessageSchema.parse(body);
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
    const [report] = await adminDb
      .select()
      .from(feedbackReports)
      .where(eq(feedbackReports.id, id))
      .limit(1);

    if (!report) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Effective author: if impersonating, attribute to the real admin
    const authorId =
      session.user.impersonatedBy?.id ?? session.user.id;

    const [message] = await adminDb
      .insert(feedbackMessages)
      .values({
        feedbackId: id,
        tenantId: report.tenantId,
        authorId,
        authorType: "platform_admin",
        body: data.body,
        isInternal: data.isInternal ?? false,
      })
      .returning();

    if (!data.isInternal) {
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
          .where(eq(users.id, report.userId))
          .limit(1);

        if (reporterRow) {
          const displayName =
            reporterRow.name ||
            `${reporterRow.firstName ?? ""} ${reporterRow.lastName ?? ""}`.trim() ||
            reporterRow.email ||
            "Reporter";
          void notifyAdminReply(
            {
              id: report.id,
              ticketNumber: report.ticketNumber,
              type: report.type,
              title: report.title,
              description: report.description,
              pageUrl: report.pageUrl,
              viewport: report.viewport,
              userAgent: report.userAgent,
              screenshotUrl: report.screenshotUrl,
            },
            {
              id: reporterRow.id,
              name: displayName,
              email: reporterRow.email,
            },
            data.body
          );
        }
      } catch (err) {
        console.error("Failed to enqueue admin-reply notification:", err);
      }
    }

    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    console.error("Failed to create admin feedback message:", err);
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}
