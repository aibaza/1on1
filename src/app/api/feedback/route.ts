import { z } from "zod";
import { NextResponse } from "next/server";
import { eq, desc, and } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { adminDb } from "@/lib/db";
import { feedbackReports, tenants, users } from "@/lib/db/schema";
import { createFeedbackSchema } from "@/lib/validations/feedback";
import { assertUnderReportLimit } from "@/lib/feedback/rate-limit";
import { uploadScreenshotFromDataUrl } from "@/lib/feedback/blob";
import { notifyNewReport } from "@/lib/feedback/notifications";

/**
 * GET /api/feedback — list the current user's own feedback reports.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // When impersonating, attribute to the real super-admin (impersonatedBy.id)
  const reporterUserId =
    session.user.impersonatedBy?.id ?? session.user.id;

  try {
    const reports = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        return tx
          .select()
          .from(feedbackReports)
          .where(
            and(
              eq(feedbackReports.tenantId, session.user.tenantId),
              eq(feedbackReports.userId, reporterUserId)
            )
          )
          .orderBy(desc(feedbackReports.createdAt));
      }
    );

    return NextResponse.json({ reports });
  } catch (err) {
    console.error("Failed to list feedback reports:", err);
    return NextResponse.json(
      { error: "Failed to list feedback reports" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/feedback — create a new feedback report for the current user.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // When impersonating, attribute to the real super-admin
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
    data = createFeedbackSchema.parse(body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: err },
        { status: 400 }
      );
    }
    throw err;
  }

  // Rate limit check — 5 reports per hour per user
  try {
    await assertUnderReportLimit(reporterUserId);
  } catch (err) {
    if (err instanceof Error && err.message === "RATE_LIMITED") {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again in 1 hour." },
        { status: 429 }
      );
    }
    throw err;
  }

  try {
    // Insert the report. Tenant context is required for RLS.
    const created = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const [row] = await tx
          .insert(feedbackReports)
          .values({
            tenantId: session.user.tenantId,
            userId: reporterUserId,
            type: data.type,
            title: data.title,
            description: data.description,
            pageUrl: data.pageUrl,
            viewport: data.viewport,
            userAgent: data.userAgent,
          })
          .returning();
        return row;
      }
    );

    // Upload screenshot, if any. Non-fatal — log and continue on failure.
    let finalReport = created;
    if (data.screenshotDataUrl) {
      try {
        const url = await uploadScreenshotFromDataUrl(
          data.screenshotDataUrl,
          created.id
        );
        const [updated] = await withTenantContext(
          session.user.tenantId,
          session.user.id,
          async (tx) => {
            return tx
              .update(feedbackReports)
              .set({ screenshotUrl: url })
              .where(eq(feedbackReports.id, created.id))
              .returning();
          }
        );
        if (updated) finalReport = updated;
      } catch (err) {
        console.error(
          `Feedback screenshot upload failed for report ${created.id}:`,
          err
        );
      }
    }

    // Send email notification — non-blocking, never throws out.
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

        // Fire-and-forget: notifyNewReport already swallows its own errors.
        void notifyNewReport(
          {
            id: finalReport.id,
            ticketNumber: finalReport.ticketNumber,
            type: finalReport.type,
            title: finalReport.title,
            description: finalReport.description,
            pageUrl: finalReport.pageUrl,
            viewport: finalReport.viewport,
            userAgent: finalReport.userAgent,
            screenshotUrl: finalReport.screenshotUrl,
          },
          {
            id: reporterRow.id,
            name: displayName,
            email: reporterRow.email,
          },
          tenantRow.name
        );
      }
    } catch (err) {
      console.error("Failed to enqueue feedback notification:", err);
    }

    return NextResponse.json(finalReport, { status: 201 });
  } catch (err) {
    console.error("Failed to create feedback report:", err);
    return NextResponse.json(
      { error: "Failed to create feedback report" },
      { status: 500 }
    );
  }
}
