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

interface FeedbackNewReportEmailProps {
  // Data
  ticketNumber: number;
  typeLabel: string;
  title: string;
  description: string;
  pageUrl: string;
  viewport: { w: number; h: number };
  userAgent: string;
  reporterName: string;
  reporterEmail: string;
  tenantName: string;
  adminUrl: string;
  hasScreenshot: boolean;

  // Translated strings
  eyebrow: string;
  heading: string;
  reporterLabel: string;
  tenantLabel: string;
  pageUrlLabel: string;
  viewportLabel: string;
  userAgentLabel: string;
  screenshotLabel: string;
  screenshotAttached: string;
  viewInApp: string;
  replyHint: string;
  footer: string;
}

export function FeedbackNewReportEmail({
  ticketNumber,
  typeLabel,
  title,
  description,
  pageUrl,
  viewport,
  userAgent,
  reporterName,
  reporterEmail,
  tenantName,
  adminUrl,
  hasScreenshot,
  eyebrow,
  heading,
  reporterLabel,
  tenantLabel,
  pageUrlLabel,
  viewportLabel,
  userAgentLabel,
  screenshotLabel,
  screenshotAttached,
  viewInApp,
  replyHint,
  footer,
}: FeedbackNewReportEmailProps) {
  return (
    <EmailLayout footerText={footer}>
      <Text style={eyebrowStyle}>
        {eyebrow} — FB-{ticketNumber} — {typeLabel}
      </Text>
      <Text style={headingStyle}>{heading}</Text>
      <Text style={paragraphStyle}>{title}</Text>

      <Section style={cardStyle}>
        <Text style={metadataRowStyle}>
          {reporterLabel}: {reporterName} &lt;{reporterEmail}&gt;
        </Text>
        <Text style={metadataRowStyle}>
          {tenantLabel}: {tenantName}
        </Text>
        <Text style={metadataRowStyle}>
          {pageUrlLabel}: {pageUrl}
        </Text>
        <Text style={metadataRowStyle}>
          {viewportLabel}: {viewport.w}×{viewport.h}
        </Text>
        <Text style={metadataRowStyle}>
          {userAgentLabel}: {userAgent}
        </Text>
      </Section>

      <Hr style={dividerStyle} />

      <Text style={{ ...paragraphStyle, whiteSpace: "pre-wrap" }}>
        {description}
      </Text>

      <Hr style={dividerStyle} />

      <Text style={eyebrowStyle}>{screenshotLabel}</Text>
      {hasScreenshot ? (
        // Email clients do not support next/image — must use <img> with cid: reference.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="cid:screenshot"
          alt={screenshotLabel}
          style={{
            width: "100%",
            maxWidth: "100%",
            height: "auto",
            borderRadius: "8px",
            border: "1px solid #eceeef",
          }}
        />
      ) : (
        <Text style={paragraphStyle}>{screenshotAttached}</Text>
      )}

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
