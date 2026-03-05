import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { canManageSeries, isSeriesParticipant } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit/log";
import { updateSeriesSchema } from "@/lib/validations/series";
import { scheduleSeriesNotifications } from "@/lib/notifications/scheduler";
import { cancelSeriesNotifications } from "@/lib/notifications/queries";
import { meetingSeries, sessions, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { computeNextSessionDate } from "@/lib/utils/scheduling";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Fetch series with manager and report info
        const seriesRows = await tx
          .select({
            id: meetingSeries.id,
            tenantId: meetingSeries.tenantId,
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
            updatedAt: meetingSeries.updatedAt,
          })
          .from(meetingSeries)
          .where(
            and(
              eq(meetingSeries.id, id),
              eq(meetingSeries.tenantId, session.user.tenantId)
            )
          )
          .limit(1);

        if (seriesRows.length === 0) {
          return null;
        }

        const series = seriesRows[0];

        // Authorization: admin can see all, others must be participant
        if (
          session.user.role !== "admin" &&
          !isSeriesParticipant(session.user.id, series)
        ) {
          return "FORBIDDEN";
        }

        // Fetch manager and report info
        const [managerRows, reportRows] = await Promise.all([
          tx
            .select({
              id: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
              avatarUrl: users.avatarUrl,
            })
            .from(users)
            .where(eq(users.id, series.managerId))
            .limit(1),
          tx
            .select({
              id: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
              avatarUrl: users.avatarUrl,
            })
            .from(users)
            .where(eq(users.id, series.reportId))
            .limit(1),
        ]);

        // Fetch session history
        const sessionHistory = await tx
          .select({
            id: sessions.id,
            sessionNumber: sessions.sessionNumber,
            scheduledAt: sessions.scheduledAt,
            completedAt: sessions.completedAt,
            status: sessions.status,
            sessionScore: sessions.sessionScore,
            durationMinutes: sessions.durationMinutes,
          })
          .from(sessions)
          .where(eq(sessions.seriesId, id))
          .orderBy(desc(sessions.sessionNumber));

        return {
          id: series.id,
          cadence: series.cadence,
          cadenceCustomDays: series.cadenceCustomDays,
          defaultDurationMinutes: series.defaultDurationMinutes,
          defaultTemplateId: series.defaultTemplateId,
          preferredDay: series.preferredDay,
          preferredTime: series.preferredTime,
          status: series.status,
          nextSessionAt: series.nextSessionAt?.toISOString() ?? null,
          createdAt: series.createdAt.toISOString(),
          updatedAt: series.updatedAt.toISOString(),
          manager: managerRows[0] ?? null,
          report: reportRows[0] ?? null,
          sessions: sessionHistory.map((s) => ({
            id: s.id,
            sessionNumber: s.sessionNumber,
            scheduledAt: s.scheduledAt.toISOString(),
            completedAt: s.completedAt?.toISOString() ?? null,
            status: s.status,
            sessionScore: s.sessionScore,
            durationMinutes: s.durationMinutes,
          })),
        };
      }
    );

    if (result === null) {
      return NextResponse.json({ error: "Series not found" }, { status: 404 });
    }
    if (result === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch series:", error);
    return NextResponse.json(
      { error: "Failed to fetch series" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!canManageSeries(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const data = updateSeriesSchema.parse(body);

    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Fetch existing series
        const existing = await tx
          .select()
          .from(meetingSeries)
          .where(
            and(
              eq(meetingSeries.id, id),
              eq(meetingSeries.tenantId, session.user.tenantId)
            )
          )
          .limit(1);

        if (existing.length === 0) {
          return null;
        }

        const series = existing[0];

        // Only manager on the series or admin can update
        if (
          session.user.role !== "admin" &&
          session.user.id !== series.managerId
        ) {
          return "FORBIDDEN";
        }

        // Build update object
        const updateData: Record<string, unknown> = {};
        if (data.cadence !== undefined) updateData.cadence = data.cadence;
        if (data.cadenceCustomDays !== undefined)
          updateData.cadenceCustomDays = data.cadenceCustomDays;
        if (data.defaultTemplateId !== undefined)
          updateData.defaultTemplateId = data.defaultTemplateId;
        if (data.preferredDay !== undefined)
          updateData.preferredDay = data.preferredDay;
        if (data.preferredTime !== undefined)
          updateData.preferredTime = data.preferredTime;
        if (data.defaultDurationMinutes !== undefined)
          updateData.defaultDurationMinutes = data.defaultDurationMinutes;
        if (data.status !== undefined) updateData.status = data.status;
        if (data.reminderHoursBefore !== undefined)
          updateData.reminderHoursBefore = data.reminderHoursBefore;

        // Recompute nextSessionAt if cadence changes
        if (data.cadence || data.preferredDay !== undefined) {
          const cadence = data.cadence ?? series.cadence;
          const customDays =
            data.cadenceCustomDays !== undefined
              ? data.cadenceCustomDays
              : series.cadenceCustomDays;
          const preferredDay =
            data.preferredDay !== undefined
              ? data.preferredDay
              : series.preferredDay;

          updateData.nextSessionAt = computeNextSessionDate(
            new Date(),
            cadence,
            customDays,
            preferredDay
          );
        }

        updateData.updatedAt = new Date();

        const [updated] = await tx
          .update(meetingSeries)
          .set(updateData)
          .where(eq(meetingSeries.id, id))
          .returning();

        await logAuditEvent(tx, {
          tenantId: session.user.tenantId,
          actorId: session.user.id,
          action: "series_updated",
          resourceType: "series",
          resourceId: id,
          metadata: { changes: Object.keys(data) },
        });

        return updated;
      }
    );

    if (result === null) {
      return NextResponse.json({ error: "Series not found" }, { status: 404 });
    }
    if (result === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Handle notification scheduling/cancellation based on changes
    try {
      if (
        data.status === "paused" ||
        data.status === "archived"
      ) {
        // Cancel all pending notifications for paused/archived series
        await cancelSeriesNotifications(id, ["pre_meeting", "agenda_prep"]);
      } else if (
        data.cadence ||
        data.preferredDay !== undefined ||
        data.reminderHoursBefore !== undefined
      ) {
        // Reschedule notifications when timing changes
        if (result.nextSessionAt) {
          const [managerUser, reportUser] = await Promise.all([
            withTenantContext(session.user.tenantId, session.user.id, async (tx) => {
              const [u] = await tx
                .select({ firstName: users.firstName, lastName: users.lastName })
                .from(users)
                .where(eq(users.id, result.managerId))
                .limit(1);
              return u;
            }),
            withTenantContext(session.user.tenantId, session.user.id, async (tx) => {
              const [u] = await tx
                .select({ firstName: users.firstName, lastName: users.lastName })
                .from(users)
                .where(eq(users.id, result.reportId))
                .limit(1);
              return u;
            }),
          ]);

          await scheduleSeriesNotifications({
            tenantId: session.user.tenantId,
            seriesId: id,
            managerId: result.managerId,
            reportId: result.reportId,
            nextSessionAt: result.nextSessionAt,
            reminderHoursBefore: result.reminderHoursBefore ?? 24,
            managerName: managerUser
              ? `${managerUser.firstName} ${managerUser.lastName}`
              : "Manager",
            reportName: reportUser
              ? `${reportUser.firstName} ${reportUser.lastName}`
              : "Report",
          });
        }
      }
    } catch (notifError) {
      console.error("Failed to update notifications for series:", notifError);
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to update series:", error);
    return NextResponse.json(
      { error: "Failed to update series" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!canManageSeries(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const existing = await tx
          .select({ id: meetingSeries.id, managerId: meetingSeries.managerId })
          .from(meetingSeries)
          .where(
            and(
              eq(meetingSeries.id, id),
              eq(meetingSeries.tenantId, session.user.tenantId)
            )
          )
          .limit(1);

        if (existing.length === 0) {
          return null;
        }

        // Only manager on the series or admin can archive
        if (
          session.user.role !== "admin" &&
          session.user.id !== existing[0].managerId
        ) {
          return "FORBIDDEN";
        }

        // Soft delete: set status to archived
        const [archived] = await tx
          .update(meetingSeries)
          .set({ status: "archived", updatedAt: new Date() })
          .where(eq(meetingSeries.id, id))
          .returning();

        await logAuditEvent(tx, {
          tenantId: session.user.tenantId,
          actorId: session.user.id,
          action: "series_archived",
          resourceType: "series",
          resourceId: id,
        });

        return archived;
      }
    );

    if (result === null) {
      return NextResponse.json({ error: "Series not found" }, { status: 404 });
    }
    if (result === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Cancel all pending notifications for archived series
    try {
      await cancelSeriesNotifications(id, ["pre_meeting", "agenda_prep"]);
    } catch (notifError) {
      console.error("Failed to cancel notifications for archived series:", notifError);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to archive series:", error);
    return NextResponse.json(
      { error: "Failed to archive series" },
      { status: 500 }
    );
  }
}
