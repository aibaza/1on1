import { auth } from "@/lib/auth/config";
import { redirect, notFound } from "next/navigation";
import { getTranslations, getFormatter } from "next-intl/server";
import { withTenantContext } from "@/lib/db/tenant-context";
import { users, teams, teamMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileEditForm } from "./profile-edit-form";

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function getStatusColor(status: string) {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "pending":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "deactivated":
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    default:
      return "";
  }
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("people");
  const format = await getFormatter();
  const { id } = await params;

  const data = await withTenantContext(
    session.user.tenantId,
    session.user.id,
    async (tx) => {
      const [user] = await tx
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: users.role,
          jobTitle: users.jobTitle,
          avatarUrl: users.avatarUrl,
          managerId: users.managerId,
          isActive: users.isActive,
          invitedAt: users.invitedAt,
          inviteAcceptedAt: users.inviteAcceptedAt,
          createdAt: users.createdAt,
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
          .select({ firstName: users.firstName, lastName: users.lastName })
          .from(users)
          .where(eq(users.id, user.managerId));
        if (manager) {
          managerName = `${manager.firstName} ${manager.lastName}`;
        }
      }

      // Get team memberships
      const memberships = await tx
        .select({ teamId: teams.id, teamName: teams.name })
        .from(teamMembers)
        .innerJoin(teams, eq(teamMembers.teamId, teams.id))
        .where(eq(teamMembers.userId, id));

      const status = !user.isActive
        ? "deactivated"
        : user.inviteAcceptedAt || !user.invitedAt
          ? "active"
          : "pending";

      return {
        ...user,
        managerName,
        status,
        teams: memberships.map((m) => ({ id: m.teamId, name: m.teamName })),
      };
    }
  );

  if (!data) notFound();

  const isSelf = id === session.user.id;
  const canEdit = isSelf || session.user.role === "admin";

  const roleLabel = data.role === "admin"
    ? t("table.admin")
    : data.role === "manager"
      ? t("table.manager")
      : t("table.member");

  const statusLabel = data.status === "active"
    ? t("table.active")
    : data.status === "pending"
      ? t("table.pending")
      : t("table.deactivated");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link href="/people">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("profile.backToPeople")}
          </Link>
        </Button>
      </div>

      {/* Profile header */}
      <div className="flex items-start gap-6">
        <Avatar className="h-20 w-20 text-xl">
          <AvatarImage src={getAvatarUrl(`${data.firstName} ${data.lastName}`, data.avatarUrl, null, data.role)} />
          <AvatarFallback className="text-xl">
            {getInitials(data.firstName, data.lastName)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {data.firstName} {data.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">{data.email}</p>
          {data.jobTitle && (
            <p className="text-sm text-muted-foreground">{data.jobTitle}</p>
          )}
          <div className="flex items-center gap-2 pt-1">
            <Badge variant="secondary">
              {roleLabel}
            </Badge>
            <Badge variant="outline" className={getStatusColor(data.status)}>
              {statusLabel}
            </Badge>
          </div>
        </div>
      </div>

      <Separator />

      {/* Details */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("profile.manager")}
          </p>
          <p className="mt-1 text-sm">{data.managerName || t("profile.noneAssigned")}</p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("profile.joined")}
          </p>
          <p className="mt-1 text-sm">
            {format.dateTime(new Date(data.createdAt), {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {data.teams.length > 0 && (
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("profile.teams")}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {data.teams.map((team) => (
                <Badge key={team.id} variant="outline">
                  {team.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit section */}
      {canEdit && (
        <>
          <Separator />
          <div>
            <h2 className="text-lg font-semibold">{t("profile.editProfile")}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {t("profile.editProfileDesc")}
            </p>
            <ProfileEditForm
              userId={id}
              defaultValues={{
                firstName: data.firstName,
                lastName: data.lastName,
                jobTitle: data.jobTitle ?? "",
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
