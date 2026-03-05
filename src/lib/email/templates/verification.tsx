import { Text, Button } from "@react-email/components";
import { EmailLayout } from "./components/email-layout";
import { heading, paragraph, button } from "../styles";

interface VerificationEmailProps {
  verifyUrl: string;
}

export function VerificationEmail({ verifyUrl }: VerificationEmailProps) {
  return (
    <EmailLayout
      footerText="If you did not create an account, you can safely ignore this email. This link expires in 24 hours."
    >
      <Text style={heading}>Verify your email</Text>
      <Text style={paragraph}>
        Thanks for signing up. Please verify your email address by clicking the
        button below.
      </Text>
      <Button style={button} href={verifyUrl}>
        Verify Email Address
      </Button>
    </EmailLayout>
  );
}
