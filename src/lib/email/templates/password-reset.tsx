import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
} from "@react-email/components";

interface PasswordResetEmailProps {
  resetUrl: string;
}

export function PasswordResetEmail({ resetUrl }: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Section style={section}>
            <Text style={brand}>1on1</Text>
            <Text style={heading}>Reset your password</Text>
            <Text style={paragraph}>
              We received a request to reset your password. Click the button
              below to choose a new one.
            </Text>
            <Button style={button} href={resetUrl}>
              Reset Password
            </Button>
            <Hr style={hr} />
            <Text style={footer}>
              This link expires in 1 hour. If you did not request a password
              reset, you can safely ignore this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: "#f9fafb",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const container = {
  maxWidth: "480px",
  margin: "0 auto",
  padding: "40px 20px",
};

const section = {
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  padding: "40px 32px",
};

const brand = {
  fontSize: "20px",
  fontWeight: "700" as const,
  color: "#0a0a0a",
  marginBottom: "24px",
};

const heading = {
  fontSize: "24px",
  fontWeight: "600" as const,
  color: "#0a0a0a",
  marginBottom: "8px",
};

const paragraph = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#525252",
  marginBottom: "24px",
};

const button = {
  backgroundColor: "#0a0a0a",
  color: "#fafafa",
  fontSize: "15px",
  fontWeight: "500" as const,
  padding: "12px 24px",
  borderRadius: "8px",
  textDecoration: "none",
  display: "inline-block" as const,
};

const hr = {
  borderColor: "#e5e5e5",
  margin: "24px 0",
};

const footer = {
  fontSize: "13px",
  lineHeight: "20px",
  color: "#a3a3a3",
};
