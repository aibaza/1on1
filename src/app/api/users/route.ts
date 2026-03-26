import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { users, inviteTokens } from "@/lib/db/schema";
import { eq, and, gt, isNull, sql } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const level = session.user.level;

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Fetch all users in the tenant
        const allUsers = await tx
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            level: users.level,
            jobTitle: users.jobTitle,
            avatarUrl: users.avatarUrl,
            managerId: users.managerId,
            teamName: users.teamName,
            isActive: users.isActive,
            invitedAt: users.invitedAt,
            inviteAcceptedAt: users.inviteAcceptedAt,
            createdAt: users.createdAt,
          })
          .from(users)
          .where(eq(users.tenantId, session.user.tenantId))
          .orderBy(users.lastName, users.firstName);

        // Members only get minimal user info (for dropdowns/display)
        if (level !== "admin" && level !== "manager") {
          return allUsers.map((u) => ({
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
            avatarUrl: u.avatarUrl,
          }));
        }

        // Build a map of user ID -> name for manager names
        const userMap = new Map(
          allUsers.map((u) => [u.id, { name: `${u.firstName} ${u.lastName}`, teamName: u.teamName }])
        );

        // Fetch pending invites (not accepted, not expired)
        const pendingInvites = await tx
          .select({
            id: inviteTokens.id,
            email: inviteTokens.email,
            level: inviteTokens.level,
            invitedAt: inviteTokens.createdAt,
          })
          .from(inviteTokens)
          .where(
            and(
              eq(inviteTokens.tenantId, session.user.tenantId),
              isNull(inviteTokens.acceptedAt),
              gt(inviteTokens.expiresAt, sql`now()`)
            )
          );

        // Check which pending invites already have a user record
        const existingEmails = new Set(allUsers.map((u) => u.email));

        // Map users to response shape
        const userRows = allUsers.map((u) => {
          const managerInfo = u.managerId ? userMap.get(u.managerId) : null;
          return {
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            level: u.level,
            jobTitle: u.jobTitle,
            avatarUrl: u.avatarUrl,
            managerId: u.managerId,
            managerName: managerInfo?.name ?? null,
            teamName: managerInfo?.teamName ?? null,
            isActive: u.isActive,
            status: !u.isActive
              ? ("deactivated" as const)
              : u.inviteAcceptedAt || !u.invitedAt
                ? ("active" as const)
                : ("pending" as const),
            invitedAt: u.invitedAt,
            createdAt: u.createdAt,
          };
        });

        // Add pending invites that don't have user records yet
        const pendingRows = pendingInvites
          .filter((inv) => !existingEmails.has(inv.email))
          .map((inv) => ({
            id: inv.id,
            firstName: "",
            lastName: "",
            email: inv.email,
            level: inv.level,
            jobTitle: null as string | null,
            avatarUrl: null as string | null,
            managerId: null as string | null,
            managerName: null as string | null,
            teamName: null as string | null,
            isActive: false,
            status: "pending" as const,
            invitedAt: inv.invitedAt,
            createdAt: inv.invitedAt,
          }));

        return [...userRows, ...pendingRows];
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
