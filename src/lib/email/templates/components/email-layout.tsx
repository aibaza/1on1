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
  brandHeader,
  brandText,
  brandSubtext,
  contentSection,
  hr,
  footer,
} from "../../styles";

interface EmailLayoutProps {
  children: React.ReactNode;
  footerText?: string;
}

export function EmailLayout({
  children,
  footerText = "",
}: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Section style={section}>
            {/* Branded header */}
            <div style={brandHeader}>
              <Text style={brandText}>1on1</Text>
              <Text style={brandSubtext}>Meeting Management</Text>
            </div>

            {/* Content */}
            <div style={contentSection}>
              {children}
            </div>

            {/* Footer */}
            <div style={{ padding: "24px 32px", borderTop: "1px solid #eceeef" }}>
              <Text style={footer}>{footerText}</Text>
            </div>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
