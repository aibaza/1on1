import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { logAuditEvent } from "@/lib/audit/log";
import { transferSeriesSchema } from "@/lib/validations/series";
import { scheduleSeriesNotifications } from "@/lib/notifications/scheduler";
import { cancelSeriesNotifications } from "@/lib/notifications/queries";
import { meetingSeries, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { syncSeriesUpdated } from "@/lib/calendar";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const data = transferSeriesSchema.parse(body);

    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const [series] = await tx
          .select()
          .from(meetingSeries)
          .where(
            and(
              eq(meetingSeries.id, id),
              eq(meetingSeries.tenantId, session.user.tenantId)
            )
          )
          .limit(1);

        if (!series) {
          return { error: "Series not found", status: 404 } as const;
        }

        // Authorization: admin OR current series manager
        if (
          session.user.level !== "admin" &&
          session.user.id !== series.managerId
        ) {
          return { error: "Forbidden", status: 403 } as const;
        }

        if (data.newManagerId === series.managerId) {
          return {
            error: "New manager is the same as current manager",
            status: 400,
          } as const;
        }

        if (data.newManagerId === series.reportId) {
          return {
            error: "A user cannot manage themselves",
            status: 400,
          } as const;
        }

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
          return { error: "Manager not found", status: 404 } as const;
        }

        if (newManager.level !== "admin" && newManager.level !== "manager") {
          return {
            error:
              "Only users with admin or manager role can be assigned as managers",
            status: 400,
          } as const;
        }

        const previousManagerId = series.managerId;

        const [updatedSeries] = await tx
          .update(meetingSeries)
          .set({ managerId: data.newManagerId, updatedAt: new Date() })
          .where(eq(meetingSeries.id, id))
          .returning();

        await tx
          .update(users)
          .set({ managerId: data.newManagerId, updatedAt: new Date() })
          .where(eq(users.id, series.reportId));

        await logAuditEvent(tx, {
          tenantId: session.user.tenantId,
          actorId: session.user.id,
          action: "series_transferred",
          resourceType: "series",
          resourceId: id,
          metadata: {
            previousManagerId,
            newManagerId: data.newManagerId,
            reportId: series.reportId,
            alsoUpdatedReportManagerHierarchy: true,
          },
        });

        // Fetch names for notification rescheduling
        const [managerUser, reportUser] = await Promise.all([
          tx
            .select({ firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(eq(users.id, data.newManagerId))
            .limit(1),
          tx
            .select({ firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(eq(users.id, series.reportId))
            .limit(1),
        ]);

        return {
          data: updatedSeries,
          managerName: managerUser[0]
            ? `${managerUser[0].firstName} ${managerUser[0].lastName}`
            : "Manager",
          reportName: reportUser[0]
            ? `${reportUser[0].firstName} ${reportUser[0].lastName}`
            : "Report",
        } as const;
      }
    );

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    // Reschedule pending notifications under the new manager
    try {
      if (
        result.data.status === "active" &&
        result.data.nextSessionAt
      ) {
        await scheduleSeriesNotifications({
          tenantId: session.user.tenantId,
          seriesId: id,
          managerId: result.data.managerId,
          reportId: result.data.reportId,
          nextSessionAt: result.data.nextSessionAt,
          reminderHoursBefore: result.data.reminderHoursBefore ?? 24,
          managerName: result.managerName,
          reportName: result.reportName,
        });
      } else {
        await cancelSeriesNotifications(id, ["pre_meeting", "agenda_prep"]);
      }
    } catch (notifError) {
      console.error(
        "Failed to reschedule notifications after transfer:",
        notifError
      );
    }

    // Sync calendar (manager change usually means new attendee)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4300";
    syncSeriesUpdated(id, appUrl).catch((err) =>
      console.error("Calendar sync failed for series transfer:", err)
    );

    return NextResponse.json(result.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to transfer series:", error);
    return NextResponse.json(
      { error: "Failed to transfer series" },
      { status: 500 }
    );
  }
}
