import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { requireLevel } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit/log";
import { transferManagedSeriesSchema } from "@/lib/validations/user";
import { scheduleSeriesNotifications } from "@/lib/notifications/scheduler";
import { cancelSeriesNotifications } from "@/lib/notifications/queries";
import { meetingSeries, users } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { syncSeriesUpdated } from "@/lib/calendar";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const roleError = requireLevel(session.user.level, "admin");
  if (roleError) return roleError;

  const { id: fromManagerId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const data = transferManagedSeriesSchema.parse(body);

    if (data.newManagerId === fromManagerId) {
      return NextResponse.json(
        { error: "New manager is the same as the outgoing manager" },
        { status: 400 }
      );
    }

    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const [newManager] = await tx
          .select({ id: users.id, level: users.level })
          .from(users)
          .where(
            and(
              eq(users.id, data.newManagerId),
              eq(users.tenantId, session.user.tenantId)
            )
          )
          .limit(1);

        if (!newManager) {
          return { error: "New manager not found", status: 404 } as const;
        }

        if (newManager.level !== "admin" && newManager.level !== "manager") {
          return {
            error:
              "Only users with admin or manager role can be assigned as managers",
            status: 400,
          } as const;
        }

        // Load all active/paused series owned by the outgoing manager
        const seriesToTransfer = await tx
          .select({
            id: meetingSeries.id,
            reportId: meetingSeries.reportId,
            status: meetingSeries.status,
            nextSessionAt: meetingSeries.nextSessionAt,
            reminderHoursBefore: meetingSeries.reminderHoursBefore,
          })
          .from(meetingSeries)
          .where(
            and(
              eq(meetingSeries.tenantId, session.user.tenantId),
              eq(meetingSeries.managerId, fromManagerId),
              inArray(meetingSeries.status, ["active", "paused"])
            )
          );

        if (seriesToTransfer.length === 0) {
          return {
            data: {
              transferred: 0,
              seriesIds: [] as string[],
              reportIds: [] as string[],
            },
            seriesToReschedule: [] as typeof seriesToTransfer,
            newManagerId: data.newManagerId,
          } as const;
        }

        // Guard: a report cannot end up managed by themselves
        const selfManaged = seriesToTransfer.find(
          (s) => s.reportId === data.newManagerId
        );
        if (selfManaged) {
          return {
            error:
              "New manager cannot be the report of one of the transferred series",
            status: 400,
          } as const;
        }

        const seriesIds = seriesToTransfer.map((s) => s.id);
        const reportIds = seriesToTransfer.map((s) => s.reportId);

        const now = new Date();

        await tx
          .update(meetingSeries)
          .set({ managerId: data.newManagerId, updatedAt: now })
          .where(inArray(meetingSeries.id, seriesIds));

        await tx
          .update(users)
          .set({ managerId: data.newManagerId, updatedAt: now })
          .where(inArray(users.id, reportIds));

        await logAuditEvent(tx, {
          tenantId: session.user.tenantId,
          actorId: session.user.id,
          action: "manager_series_bulk_transferred",
          resourceType: "user",
          resourceId: fromManagerId,
          metadata: {
            fromManagerId,
            toManagerId: data.newManagerId,
            seriesIds,
            reportIds,
          },
        });

        return {
          data: {
            transferred: seriesIds.length,
            seriesIds,
            reportIds,
          },
          seriesToReschedule: seriesToTransfer,
          newManagerId: data.newManagerId,
        } as const;
      }
    );

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    // Reschedule notifications & calendar sync per series (best-effort, post-tx)
    if (result.seriesToReschedule.length > 0) {
      const newManagerId = result.newManagerId;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4300";

      const [newManagerUser] = await withTenantContext(
        session.user.tenantId,
        session.user.id,
        async (tx) =>
          tx
            .select({
              firstName: users.firstName,
              lastName: users.lastName,
            })
            .from(users)
            .where(eq(users.id, newManagerId))
            .limit(1)
      );
      const managerName = newManagerUser
        ? `${newManagerUser.firstName} ${newManagerUser.lastName}`
        : "Manager";

      for (const series of result.seriesToReschedule) {
        try {
          if (series.status === "active" && series.nextSessionAt) {
            const [reportUser] = await withTenantContext(
              session.user.tenantId,
              session.user.id,
              async (tx) =>
                tx
                  .select({
                    firstName: users.firstName,
                    lastName: users.lastName,
                  })
                  .from(users)
                  .where(eq(users.id, series.reportId))
                  .limit(1)
            );
            await scheduleSeriesNotifications({
              tenantId: session.user.tenantId,
              seriesId: series.id,
              managerId: newManagerId,
              reportId: series.reportId,
              nextSessionAt: series.nextSessionAt,
              reminderHoursBefore: series.reminderHoursBefore ?? 24,
              managerName,
              reportName: reportUser
                ? `${reportUser.firstName} ${reportUser.lastName}`
                : "Report",
            });
          } else {
            await cancelSeriesNotifications(series.id, [
              "pre_meeting",
              "agenda_prep",
            ]);
          }
        } catch (err) {
          console.error(
            `Failed to reschedule notifications for series ${series.id} after bulk transfer:`,
            err
          );
        }

        syncSeriesUpdated(series.id, appUrl).catch((err) =>
          console.error(
            `Calendar sync failed for series ${series.id} after bulk transfer:`,
            err
          )
        );
      }
    }

    return NextResponse.json(result.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to bulk-transfer managed series:", error);
    return NextResponse.json(
      { error: "Failed to bulk-transfer managed series" },
      { status: 500 }
    );
  }
}
