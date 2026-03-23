import { auth } from "@/lib/auth/config";
import { redirect, notFound } from "next/navigation";
import { withTenantContext } from "@/lib/db/tenant-context";
import { teams, teamMembers, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getDesignPreference } from "@/lib/design-preference.server";
import { TeamDetailClient } from "./team-detail-client";
import { EditorialTeamDetail } from "./editorial-team-detail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TeamDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const data = await withTenantContext(
    session.user.tenantId,
    session.user.id,
    async (tx) => {
      const [team] = await tx
        .select({
          id: teams.id,
          name: teams.name,
          description: teams.description,
          managerId: teams.managerId,
          createdAt: teams.createdAt,
          updatedAt: teams.updatedAt,
        })
        .from(teams)
        .where(
          and(eq(teams.id, id), eq(teams.tenantId, session.user.tenantId))
        );

      if (!team) return null;

      // Get manager info
      let managerName: string | null = null;
      if (team.managerId) {
        const [manager] = await tx
          .select({
            firstName: users.firstName,
            lastName: users.lastName,
          })
          .from(users)
          .where(eq(users.id, team.managerId));
        if (manager) {
          managerName = `${manager.firstName} ${manager.lastName}`;
        }
      }

      // Get members with user details
      const members = await tx
        .select({
          userId: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          avatarUrl: users.avatarUrl,
          role: teamMembers.role,
          joinedAt: teamMembers.joinedAt,
        })
        .from(teamMembers)
        .innerJoin(users, eq(teamMembers.userId, users.id))
        .where(eq(teamMembers.teamId, id));

      return {
        team: {
          id: team.id,
          name: team.name,
          description: team.description,
          managerId: team.managerId,
          managerName,
          createdAt: team.createdAt.toISOString(),
          updatedAt: team.updatedAt.toISOString(),
        },
        members: members.map((m) => ({
          userId: m.userId,
          firstName: m.firstName,
          lastName: m.lastName,
          email: m.email,
          avatarUrl: m.avatarUrl,
          role: m.role,
          joinedAt: m.joinedAt.toISOString(),
        })),
      };
    }
  );

  if (!data) {
    notFound();
  }

  const designPref = await getDesignPreference();
  const isEditorial = designPref === "editorial";

  const DetailComponent = isEditorial ? EditorialTeamDetail : TeamDetailClient;

  return (
    <DetailComponent
      initialTeam={data.team}
      initialMembers={data.members}
      currentUserRole={session.user.role}
    />
  );
}
