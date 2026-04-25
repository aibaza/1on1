import { auth } from "@/lib/auth/config";
import { redirect, notFound } from "next/navigation";
import { withTenantContext } from "@/lib/db/tenant-context";
import { users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { EditorialTeamDetail } from "./editorial-team-detail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TeamDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id: managerId } = await params;

  const data = await withTenantContext(
    session.user.tenantId,
    session.user.id,
    async (tx) => {
      // Fetch the manager
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
          and(eq(users.id, managerId), eq(users.tenantId, session.user.tenantId))
        );

      if (!manager) return null;

      const managerName = `${manager.firstName} ${manager.lastName}`;

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
        })
        .from(users)
        .where(
          and(
            eq(users.managerId, managerId),
            eq(users.tenantId, session.user.tenantId),
            eq(users.isActive, true)
          )
        );

      return {
        managerId: manager.id,
        teamName: manager.teamName ?? managerName,
        managerName,
        managerEmail: manager.email,
        managerAvatarUrl: manager.avatarUrl,
        members,
      };
    }
  );

  if (!data) {
    notFound();
  }

  return (
    <EditorialTeamDetail
      initialTeam={data}
      currentUserLevel={session.user.level}
      currentUserId={session.user.id}
    />
  );
}
