import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
} from "@react-email/components";
import {
  body,
  container,
  section,
  brand,
  hr,
  footer,
} from "../../styles";

interface EmailLayoutProps {
  children: React.ReactNode;
  footerText?: string;
}

export function EmailLayout({
  children,
  footerText = "This email was sent by 1on1",
}: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Section style={section}>
            <Text style={brand}>1on1</Text>
            {children}
            <Hr style={hr} />
            <Text style={footer}>{footerText}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
