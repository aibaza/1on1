import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { isSuperAdmin } from "@/lib/auth/super-admin";
import { adminDb } from "@/lib/db";
import { feedbackReports } from "@/lib/db/schema";
import { fetchScreenshotBuffer } from "@/lib/feedback/blob";

/**
 * GET /api/feedback/screenshots/[id]
 *
 * Proxies the private-blob screenshot for the given feedback report. Access is
 * granted to the reporter (own ticket) or any platform super-admin. Everyone
 * else gets 403.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [report] = await adminDb
    .select({
      id: feedbackReports.id,
      userId: feedbackReports.userId,
      tenantId: feedbackReports.tenantId,
      screenshotUrl: feedbackReports.screenshotUrl,
    })
    .from(feedbackReports)
    .where(eq(feedbackReports.id, id))
    .limit(1);

  if (!report || !report.screenshotUrl) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const effectiveUserId = session.user.impersonatedBy?.id ?? session.user.id;
  const isOwner =
    report.userId === effectiveUserId &&
    report.tenantId === session.user.tenantId;
  const isAdmin = isSuperAdmin(session.user.email);

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const t0 = Date.now();
  try {
    console.log(`[screenshots] ${id} authorized, fetching blob...`);
    const result = await fetchScreenshotBuffer(report.screenshotUrl);
    const dt = Date.now() - t0;
    if (!result) {
      console.log(`[screenshots] ${id} blob returned null after ${dt}ms`);
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.log(
      `[screenshots] ${id} got buffer ${result.buffer.length}B in ${dt}ms`
    );
    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    const dt = Date.now() - t0;
    console.error(`Failed to load feedback screenshot ${id} after ${dt}ms:`, err);
    return NextResponse.json(
      { error: "Failed to load screenshot" },
      { status: 500 }
    );
  }
}
