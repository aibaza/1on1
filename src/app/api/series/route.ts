import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { canManageSeries } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit/log";
import { createSeriesSchema } from "@/lib/validations/series";
import { meetingSeries, sessions, users } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { computeNextSessionDate } from "@/lib/utils/scheduling";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status");

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const conditions = [
          eq(meetingSeries.tenantId, session.user.tenantId),
        ];

        if (statusFilter) {
          conditions.push(
            eq(
              meetingSeries.status,
              statusFilter as "active" | "paused" | "archived"
            )
          );
        }

        // Get all series with report info
        const seriesList = await tx
          .select({
            id: meetingSeries.id,
            managerId: meetingSeries.managerId,
            reportId: meetingSeries.reportId,
            cadence: meetingSeries.cadence,
            cadenceCustomDays: meetingSeries.cadenceCustomDays,
            defaultDurationMinutes: meetingSeries.defaultDurationMinutes,
            defaultTemplateId: meetingSeries.defaultTemplateId,
            preferredDay: meetingSeries.preferredDay,
            preferredTime: meetingSeries.preferredTime,
            status: meetingSeries.status,
            nextSessionAt: meetingSeries.nextSessionAt,
            createdAt: meetingSeries.createdAt,
            reportFirstName: users.firstName,
            reportLastName: users.lastName,
            reportAvatarUrl: users.avatarUrl,
          })
          .from(meetingSeries)
          .innerJoin(users, eq(meetingSeries.reportId, users.id))
          .where(and(...conditions))
          .orderBy(
            sql`CASE WHEN ${meetingSeries.nextSessionAt} IS NULL THEN 1 ELSE 0 END`,
            meetingSeries.nextSessionAt
          );

        // Get latest session for each series
        const seriesIds = seriesList.map((s) => s.id);
        if (seriesIds.length === 0) return [];

        const latestSessions = await tx
          .select({
            id: sessions.id,
            seriesId: sessions.seriesId,
            status: sessions.status,
            sessionNumber: sessions.sessionNumber,
            sessionScore: sessions.sessionScore,
          })
          .from(sessions)
          .where(
            sql`${sessions.seriesId} IN ${seriesIds} AND ${sessions.sessionNumber} = (
              SELECT MAX(s2.session_number) FROM "session" s2 WHERE s2.series_id = ${sessions.seriesId}
            )`
          );

        const latestSessionMap = new Map(
          latestSessions.map((s) => [s.seriesId, s])
        );

        return seriesList.map((s) => {
          const latest = latestSessionMap.get(s.id);
          return {
            id: s.id,
            managerId: s.managerId,
            cadence: s.cadence,
            cadenceCustomDays: s.cadenceCustomDays,
            defaultDurationMinutes: s.defaultDurationMinutes,
            defaultTemplateId: s.defaultTemplateId,
            preferredDay: s.preferredDay,
            preferredTime: s.preferredTime,
            status: s.status,
            nextSessionAt: s.nextSessionAt?.toISOString() ?? null,
            createdAt: s.createdAt.toISOString(),
            report: {
              id: s.reportId,
              firstName: s.reportFirstName,
              lastName: s.reportLastName,
              avatarUrl: s.reportAvatarUrl,
            },
            latestSession: latest
              ? {
                  id: latest.id,
                  status: latest.status,
                  sessionNumber: latest.sessionNumber,
                  sessionScore: latest.sessionScore,
                }
              : null,
          };
        });
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch series:", error);
    return NextResponse.json(
      { error: "Failed to fetch series" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!canManageSeries(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const data = createSeriesSchema.parse(body);

    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Verify report is a user in the same tenant
        const report = await tx
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.id, data.reportId),
              eq(users.tenantId, session.user.tenantId),
              eq(users.isActive, true)
            )
          )
          .limit(1);

        if (report.length === 0) {
          throw new Error("REPORT_NOT_FOUND");
        }

        // Check for existing active series for same manager+report pair
        const existing = await tx
          .select({ id: meetingSeries.id })
          .from(meetingSeries)
          .where(
            and(
              eq(meetingSeries.tenantId, session.user.tenantId),
              eq(meetingSeries.managerId, session.user.id),
              eq(meetingSeries.reportId, data.reportId),
              eq(meetingSeries.status, "active")
            )
          )
          .limit(1);

        if (existing.length > 0) {
          throw new Error("DUPLICATE_SERIES");
        }

        // Compute next session date
        const nextSessionAt = computeNextSessionDate(
          new Date(),
          data.cadence,
          data.cadenceCustomDays ?? null,
          data.preferredDay ?? null
        );

        const [series] = await tx
          .insert(meetingSeries)
          .values({
            tenantId: session.user.tenantId,
            managerId: session.user.id,
            reportId: data.reportId,
            cadence: data.cadence,
            cadenceCustomDays: data.cadenceCustomDays ?? null,
            defaultDurationMinutes: data.defaultDurationMinutes,
            defaultTemplateId: data.defaultTemplateId ?? null,
            preferredDay: data.preferredDay ?? null,
            preferredTime: data.preferredTime ?? null,
            nextSessionAt,
          })
          .returning();

        await logAuditEvent(tx, {
          tenantId: session.user.tenantId,
          actorId: session.user.id,
          action: "series_created",
          resourceType: "series",
          resourceId: series.id,
          metadata: {
            reportId: data.reportId,
            cadence: data.cadence,
          },
        });

        return series;
      }
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "REPORT_NOT_FOUND") {
        return NextResponse.json(
          { error: "Report user not found in your organization" },
          { status: 404 }
        );
      }
      if (error.message === "DUPLICATE_SERIES") {
        return NextResponse.json(
          { error: "An active series already exists for this manager-report pair" },
          { status: 409 }
        );
      }
      if (error.name === "ZodError") {
        return NextResponse.json(
          { error: "Invalid input", details: error },
          { status: 400 }
        );
      }
    }
    console.error("Failed to create series:", error);
    return NextResponse.json(
      { error: "Failed to create series" },
      { status: 500 }
    );
  }
}
