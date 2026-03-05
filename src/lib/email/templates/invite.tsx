import { Text, Button } from "@react-email/components";
import { EmailLayout } from "./components/email-layout";
import { heading, paragraph, button } from "../styles";

interface InviteEmailProps {
  inviteUrl: string;
  organizationName: string;
  inviterName: string;
  role: string;
}

export function InviteEmail({
  inviteUrl,
  organizationName,
  inviterName,
  role,
}: InviteEmailProps) {
  return (
    <EmailLayout
      footerText="This invitation expires in 7 days. If you did not expect this invitation, you can safely ignore this email."
    >
      <Text style={heading}>You have been invited</Text>
      <Text style={paragraph}>
        {inviterName} has invited you to join{" "}
        <strong>{organizationName}</strong> as a {role}.
      </Text>
      <Text style={paragraph}>
        Click the button below to set up your account and get started.
      </Text>
      <Button style={button} href={inviteUrl}>
        Accept Invitation
      </Button>
    </EmailLayout>
  );
}
