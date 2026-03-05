import { Text, Button } from "@react-email/components";
import { EmailLayout } from "./components/email-layout";
import { heading, paragraph, button } from "../styles";

interface PasswordResetEmailProps {
  resetUrl: string;
}

export function PasswordResetEmail({ resetUrl }: PasswordResetEmailProps) {
  return (
    <EmailLayout
      footerText="This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email."
    >
      <Text style={heading}>Reset your password</Text>
      <Text style={paragraph}>
        We received a request to reset your password. Click the button below to
        choose a new one.
      </Text>
      <Button style={button} href={resetUrl}>
        Reset Password
      </Button>
    </EmailLayout>
  );
}
