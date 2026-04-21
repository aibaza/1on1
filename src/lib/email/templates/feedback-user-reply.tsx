import { Text, Section, Hr } from "@react-email/components";
import { EmailLayout } from "./components/email-layout";
import {
  heading as headingStyle,
  paragraph as paragraphStyle,
  eyebrow as eyebrowStyle,
  metadataRow as metadataRowStyle,
  divider as dividerStyle,
  card as cardStyle,
} from "../styles";

interface FeedbackUserReplyEmailProps {
  // Data
  ticketNumber: number;
  title: string;
  body: string;
  reporterName: string;
  reporterEmail: string;
  tenantName: string;
  adminUrl: string;

  // Translated strings
  eyebrow: string;
  heading: string;
  greeting: string;
  reporterLabel: string;
  tenantLabel: string;
  viewInApp: string;
  replyHint: string;
  footer: string;
}

export function FeedbackUserReplyEmail({
  ticketNumber,
  title,
  body,
  reporterName,
  reporterEmail,
  tenantName,
  adminUrl,
  eyebrow,
  heading,
  greeting,
  reporterLabel,
  tenantLabel,
  viewInApp,
  replyHint,
  footer,
}: FeedbackUserReplyEmailProps) {
  return (
    <EmailLayout footerText={footer}>
      <Text style={eyebrowStyle}>
        {eyebrow} — FB-{ticketNumber}
      </Text>
      <Text style={headingStyle}>{heading}</Text>
      <Text style={paragraphStyle}>{title}</Text>
      <Text style={paragraphStyle}>{greeting}</Text>

      <Section style={cardStyle}>
        <Text style={metadataRowStyle}>
          {reporterLabel}: {reporterName} &lt;{reporterEmail}&gt;
        </Text>
        <Text style={metadataRowStyle}>
          {tenantLabel}: {tenantName}
        </Text>
      </Section>

      <Hr style={dividerStyle} />

      <Text style={{ ...paragraphStyle, whiteSpace: "pre-wrap" }}>{body}</Text>

      <Hr style={dividerStyle} />

      <Text style={paragraphStyle}>
        {viewInApp}:{" "}
        <a href={adminUrl} style={{ color: "#29407d" }}>
          {adminUrl}
        </a>
      </Text>
      <Text style={paragraphStyle}>{replyHint}</Text>
    </EmailLayout>
  );
}
