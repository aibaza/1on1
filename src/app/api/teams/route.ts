import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { users } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * GET /api/teams
 *
 * Returns derived teams — managers who have direct reports.
 * A "team" is determined by users.managerId relationships.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Find all managers who have at least one active direct report
        const teamsData = await tx
          .select({
            managerId: users.managerId,
            memberCount: sql<number>`cast(count(*) as int)`,
          })
          .from(users)
          .where(
            and(
              eq(users.tenantId, session.user.tenantId),
              eq(users.isActive, true),
              sql`${users.managerId} IS NOT NULL`,
            )
          )
          .groupBy(users.managerId);

        if (teamsData.length === 0) return [];

        // Get manager details
        const managerIds = teamsData
          .map((t) => t.managerId)
          .filter((id): id is string => id !== null);

        const managers = await tx
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            avatarUrl: users.avatarUrl,
            teamName: users.teamName,
          })
          .from(users)
          .where(
            sql`${users.id} IN (${sql.join(
              managerIds.map((id) => sql`${id}`),
              sql`, `,
            )})`
          );

        const managerMap = new Map(managers.map((m) => [m.id, m]));

        return teamsData
          .filter((t) => t.managerId !== null)
          .map((t) => {
            const manager = managerMap.get(t.managerId!);
            const defaultName = manager
              ? `${manager.firstName} ${manager.lastName}`
              : "Unknown";
            return {
              managerId: t.managerId!,
              teamName: manager?.teamName ?? defaultName,
              managerName: defaultName,
              managerAvatarUrl: manager?.avatarUrl ?? null,
              memberCount: t.memberCount,
            };
          })
          .sort((a, b) => a.teamName.localeCompare(b.teamName));
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}
