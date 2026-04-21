import { NextResponse } from "next/server";
import { eq, and, asc } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { feedbackReports, feedbackMessages } from "@/lib/db/schema";

/**
 * GET /api/feedback/[id] — fetch a single report owned by the current user,
 * plus its non-internal messages.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const reporterUserId =
    session.user.impersonatedBy?.id ?? session.user.id;

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

        const messages = await tx
          .select()
          .from(feedbackMessages)
          .where(
            and(
              eq(feedbackMessages.feedbackId, id),
              eq(feedbackMessages.isInternal, false)
            )
          )
          .orderBy(asc(feedbackMessages.createdAt));

        return { report, messages };
      }
    );

    if ("notFound" in result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to fetch feedback report:", err);
    return NextResponse.json(
      { error: "Failed to fetch feedback report" },
      { status: 500 }
    );
  }
}
