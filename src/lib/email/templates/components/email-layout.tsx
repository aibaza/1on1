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
  companyName?: string;
  companyColor?: string;
}

export function EmailLayout({
  children,
  footerText = "",
  companyName,
  companyColor,
}: EmailLayoutProps) {
  const headerColor = companyColor || "#29407d";

  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Section style={section}>
            {/* Branded header — logo text + company name */}
            <div style={{ padding: "48px 32px", textAlign: "center" as const, borderBottom: "1px solid #eceeef" }}>
              <Text style={{
                fontSize: "28px",
                fontWeight: 900,
                color: headerColor,
                fontFamily: "'Manrope', -apple-system, sans-serif",
                letterSpacing: "-0.025em",
                margin: "0",
                textTransform: "uppercase" as const,
              }}>
                1on1
              </Text>
              {companyName && (
                <Text style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: headerColor,
                  fontFamily: "'Inter', -apple-system, sans-serif",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase" as const,
                  margin: "4px 0 0 0",
                  opacity: 0.7,
                }}>
                  {companyName}
                </Text>
              )}
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
