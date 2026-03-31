import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { canManageTeams } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit/log";
import { updateTeamNameSchema } from "@/lib/validations/role";
import { users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/teams/[managerId]
 *
 * Returns a derived team: the manager + their direct reports.
 */
export async function GET(request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: managerId } = await params;

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Verify manager exists
        const [manager] = await tx
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            avatarUrl: users.avatarUrl,
            teamName: users.teamName,
          })
          .from(users)
          .where(
            and(
              eq(users.id, managerId),
              eq(users.tenantId, session.user.tenantId),
            )
          );

        if (!manager) return null;

        // Get direct reports
        const members = await tx
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            avatarUrl: users.avatarUrl,
            jobTitle: users.jobTitle,
            level: users.level,
            isActive: users.isActive,
          })
          .from(users)
          .where(
            and(
              eq(users.managerId, managerId),
              eq(users.tenantId, session.user.tenantId),
              eq(users.isActive, true),
            )
          );

        const defaultName = `${manager.firstName} ${manager.lastName}`;

        return {
          managerId: manager.id,
          teamName: manager.teamName ?? defaultName,
          managerName: defaultName,
          managerEmail: manager.email,
          managerAvatarUrl: manager.avatarUrl,
          members: members.map((m) => ({
            id: m.id,
            firstName: m.firstName,
            lastName: m.lastName,
            email: m.email,
            avatarUrl: m.avatarUrl,
            jobTitle: m.jobTitle,
            level: m.level,
          })),
        };
      }
    );

    if (!result) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch team:", error);
    return NextResponse.json(
      { error: "Failed to fetch team" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/teams/[managerId]
 *
 * Update the team name for a manager.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!canManageTeams(session.user.level)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: managerId } = await params;

  // Managers can only update their own team name; admins can update any
  if (session.user.level === "manager" && session.user.id !== managerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const data = updateTeamNameSchema.parse(body);

    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const [manager] = await tx
          .select({ id: users.id, teamName: users.teamName })
          .from(users)
          .where(
            and(
              eq(users.id, managerId),
              eq(users.tenantId, session.user.tenantId),
            )
          );

        if (!manager) {
          return { error: "Manager not found", status: 404 };
        }

        const [updated] = await tx
          .update(users)
          .set({ teamName: data.teamName, updatedAt: new Date() })
          .where(eq(users.id, managerId))
          .returning({ id: users.id, teamName: users.teamName });

        await logAuditEvent(tx, {
          tenantId: session.user.tenantId,
          actorId: session.user.id,
          action: "team_name_updated",
          resourceType: "user",
          resourceId: managerId,
          metadata: {
            previousName: manager.teamName,
            newName: data.teamName,
          },
        });

        return { data: updated };
      }
    );

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to update team name:", error);
    return NextResponse.json(
      { error: "Failed to update team name" },
      { status: 500 }
    );
  }
}
