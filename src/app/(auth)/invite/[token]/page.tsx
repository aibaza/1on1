import { adminDb } from "@/lib/db";
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
            Invalid invitation
          </CardTitle>
          <CardDescription>
            This invitation link is not valid. It may have been used already or
            the URL may be incorrect. Please contact your administrator to
            request a new invitation.
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
            Invitation already used
          </CardTitle>
          <CardDescription>
            This invitation has already been accepted. If you already have an
            account, you can sign in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href="/login"
            className="text-sm font-medium text-foreground hover:underline"
          >
            Go to sign in
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
            Invitation expired
          </CardTitle>
          <CardDescription>
            This invitation has expired. Please contact your administrator to
            request a new invitation.
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
