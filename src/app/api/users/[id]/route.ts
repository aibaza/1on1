import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { requireLevel, isAdmin } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit/log";
import {
  updateProfileSchema,
  updateUserLevelSchema,
  assignManagerSchema,
} from "@/lib/validations/user";
import { users } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
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
        const [user] = await tx
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            level: users.level,
            jobTitle: users.jobTitle,
            avatarUrl: users.avatarUrl,
            managerId: users.managerId,
            isActive: users.isActive,
            invitedAt: users.invitedAt,
            inviteAcceptedAt: users.inviteAcceptedAt,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          })
          .from(users)
          .where(
            and(eq(users.id, id), eq(users.tenantId, session.user.tenantId))
          );

        if (!user) return null;

        // Get manager name
        let managerName: string | null = null;
        if (user.managerId) {
          const [manager] = await tx
            .select({
              firstName: users.firstName,
              lastName: users.lastName,
            })
            .from(users)
            .where(eq(users.id, user.managerId));
          if (manager) {
            managerName = `${manager.firstName} ${manager.lastName}`;
          }
        }

        return {
          ...user,
          managerName,
          status: !user.isActive
            ? ("deactivated" as const)
            : user.inviteAcceptedAt || !user.invitedAt
              ? ("active" as const)
              : ("pending" as const),
        };
      }
    );

    if (!result) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const isSelf = id === session.user.id;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    // Determine what kind of update this is
    if ("level" in body) {
      // Level change: admin only
      const roleError = requireLevel(session.user.level, "admin");
      if (roleError) return roleError;

      const data = updateUserLevelSchema.parse(body);

      const result = await withTenantContext(
        session.user.tenantId,
        session.user.id,
        async (tx) => {
          // Check the target user exists in this tenant
          const [targetUser] = await tx
            .select({
              id: users.id,
              level: users.level,
              isActive: users.isActive,
            })
            .from(users)
            .where(
              and(eq(users.id, id), eq(users.tenantId, session.user.tenantId))
            );

          if (!targetUser) {
            return { error: "User not found", status: 404 };
          }

          // Last admin check: if target user is currently admin and new level is not admin
          if (targetUser.level === "admin" && data.level !== "admin") {
            const [adminCount] = await tx
              .select({ value: count() })
              .from(users)
              .where(
                and(
                  eq(users.tenantId, session.user.tenantId),
                  eq(users.level, "admin"),
                  eq(users.isActive, true)
                )
              );

            if (adminCount.value <= 1) {
              return {
                error: "Cannot remove the last admin",
                status: 400,
              };
            }
          }

          const previousLevel = targetUser.level;
          const [updated] = await tx
            .update(users)
            .set({ level: data.level, updatedAt: new Date() })
            .where(eq(users.id, id))
            .returning();

          await logAuditEvent(tx, {
            tenantId: session.user.tenantId,
            actorId: session.user.id,
            action: "level_changed",
            resourceType: "user",
            resourceId: id,
            metadata: { previousLevel, newLevel: data.level },
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
    }

    if ("managerId" in body) {
      // Manager assignment: admin only
      const roleError = requireLevel(session.user.level, "admin");
      if (roleError) return roleError;

      const data = assignManagerSchema.parse(body);

      const result = await withTenantContext(
        session.user.tenantId,
        session.user.id,
        async (tx) => {
          // Check the target user exists in this tenant
          const [targetUser] = await tx
            .select({
              id: users.id,
              managerId: users.managerId,
            })
            .from(users)
            .where(
              and(eq(users.id, id), eq(users.tenantId, session.user.tenantId))
            );

          if (!targetUser) {
            return { error: "User not found", status: 404 };
          }

          // Cannot assign user as their own manager
          if (data.managerId === id) {
            return {
              error: "A user cannot be their own manager",
              status: 400,
            };
          }

          // Validate that the new manager has admin or manager level
          if (data.managerId) {
            const [newManager] = await tx
              .select({ id: users.id, level: users.level })
              .from(users)
              .where(
                and(eq(users.id, data.managerId), eq(users.tenantId, session.user.tenantId))
              );

            if (!newManager) {
              return { error: "Manager not found", status: 404 };
            }

            if (newManager.level !== "admin" && newManager.level !== "manager") {
              return {
                error: "Only users with admin or manager role can be assigned as managers",
                status: 400,
              };
            }
          }

          const previousManagerId = targetUser.managerId;
          const [updated] = await tx
            .update(users)
            .set({ managerId: data.managerId, updatedAt: new Date() })
            .where(eq(users.id, id))
            .returning();

          await logAuditEvent(tx, {
            tenantId: session.user.tenantId,
            actorId: session.user.id,
            action: "manager_assigned",
            resourceType: "user",
            resourceId: id,
            metadata: {
              previousManagerId,
              newManagerId: data.managerId,
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
    }

    if ("isActive" in body && body.isActive === true) {
      // Reactivation: admin only
      const roleError = requireLevel(session.user.level, "admin");
      if (roleError) return roleError;

      const result = await withTenantContext(
        session.user.tenantId,
        session.user.id,
        async (tx) => {
          const [targetUser] = await tx
            .select({ id: users.id, isActive: users.isActive })
            .from(users)
            .where(
              and(eq(users.id, id), eq(users.tenantId, session.user.tenantId))
            );

          if (!targetUser) {
            return { error: "User not found", status: 404 };
          }

          const [updated] = await tx
            .update(users)
            .set({ isActive: true, updatedAt: new Date() })
            .where(eq(users.id, id))
            .returning();

          await logAuditEvent(tx, {
            tenantId: session.user.tenantId,
            actorId: session.user.id,
            action: "user_reactivated",
            resourceType: "user",
            resourceId: id,
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
    }

    // Profile update: self or admin
    if (!isSelf && !isAdmin(session.user.level)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = updateProfileSchema.parse(body);

    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const [targetUser] = await tx
          .select({ id: users.id })
          .from(users)
          .where(
            and(eq(users.id, id), eq(users.tenantId, session.user.tenantId))
          );

        if (!targetUser) {
          return { error: "User not found", status: 404 };
        }

        const updatePayload: Record<string, unknown> = {
          updatedAt: new Date(),
        };
        if (data.firstName !== undefined) updatePayload.firstName = data.firstName;
        if (data.lastName !== undefined) updatePayload.lastName = data.lastName;
        if (data.jobTitle !== undefined) updatePayload.jobTitle = data.jobTitle;
        if (data.avatarUrl !== undefined) updatePayload.avatarUrl = data.avatarUrl;

        // Also update the `name` column (used by Auth.js)
        if (data.firstName !== undefined || data.lastName !== undefined) {
          // Need to fetch current values to reconstruct full name
          const [current] = await tx
            .select({ firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(eq(users.id, id));

          const newFirst = data.firstName ?? current.firstName;
          const newLast = data.lastName ?? current.lastName;
          updatePayload.name = `${newFirst} ${newLast}`;
        }

        const [updated] = await tx
          .update(users)
          .set(updatePayload)
          .where(eq(users.id, id))
          .returning();

        await logAuditEvent(tx, {
          tenantId: session.user.tenantId,
          actorId: session.user.id,
          action: "profile_updated",
          resourceType: "user",
          resourceId: id,
          metadata: { updatedFields: Object.keys(data) },
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
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to update user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const roleError = requireLevel(session.user.level, "admin");
  if (roleError) return roleError;

  const { id } = await params;

  // Cannot deactivate yourself
  if (id === session.user.id) {
    return NextResponse.json(
      { error: "Cannot deactivate yourself" },
      { status: 400 }
    );
  }

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const [targetUser] = await tx
          .select({
            id: users.id,
            level: users.level,
            isActive: users.isActive,
          })
          .from(users)
          .where(
            and(eq(users.id, id), eq(users.tenantId, session.user.tenantId))
          );

        if (!targetUser) {
          return { error: "User not found", status: 404 };
        }

        // Cannot deactivate the last admin
        if (targetUser.level === "admin") {
          const [adminCount] = await tx
            .select({ value: count() })
            .from(users)
            .where(
              and(
                eq(users.tenantId, session.user.tenantId),
                eq(users.level, "admin"),
                eq(users.isActive, true)
              )
            );

          if (adminCount.value <= 1) {
            return {
              error: "Cannot deactivate the last admin",
              status: 400,
            };
          }
        }

        await tx
          .update(users)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(users.id, id));

        await logAuditEvent(tx, {
          tenantId: session.user.tenantId,
          actorId: session.user.id,
          action: "user_deactivated",
          resourceType: "user",
          resourceId: id,
        });

        return { success: true };
      }
    );

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to deactivate user:", error);
    return NextResponse.json(
      { error: "Failed to deactivate user" },
      { status: 500 }
    );
  }
}
