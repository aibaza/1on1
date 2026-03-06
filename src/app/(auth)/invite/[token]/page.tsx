import { adminDb } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InviteAcceptForm } from "./invite-accept-form";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const t = await getTranslations("auth");
  const { token } = await params;

  // Look up invite token using adminDb (no auth session)
  const invite = await adminDb.query.inviteTokens.findFirst({
    where: (i, { eq }) => eq(i.token, token),
  });

  // Invalid token
  if (!invite) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            {t("invite.invalidTitle")}
          </CardTitle>
          <CardDescription>
            {t("invite.invalidDesc")}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Already accepted
  if (invite.acceptedAt) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            {t("invite.usedTitle")}
          </CardTitle>
          <CardDescription>
            {t("invite.usedDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href="/login"
            className="text-sm font-medium text-foreground hover:underline"
          >
            {t("invite.goToSignIn")}
          </a>
        </CardContent>
      </Card>
    );
  }

  // Expired
  if (invite.expiresAt < new Date()) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            {t("invite.expiredTitle")}
          </CardTitle>
          <CardDescription>
            {t("invite.expiredDesc")}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Get tenant name for display
  const tenant = await adminDb.query.tenants.findFirst({
    where: (t, { eq }) => eq(t.id, invite.tenantId),
    columns: { name: true },
  });

  return (
    <InviteAcceptForm
      token={token}
      email={invite.email}
      organizationName={tenant?.name || "your organization"}
      role={invite.role}
    />
  );
}
