import { Text, Button, Hr } from "@react-email/components";
import { EmailLayout } from "./components/email-layout";
import {
  heading as headingStyle,
  paragraph as paragraphStyle,
  eyebrow as eyebrowStyle,
  button as buttonStyle,
  divider as dividerStyle,
} from "../styles";

interface FeedbackAdminReplyEmailProps {
  // Data
  ticketNumber: number;
  title: string;
  body: string;
  ticketUrl: string;

  // Translated strings
  eyebrow: string;
  heading: string;
  greeting: string;
  intro: string;
  viewThread: string;
  footer: string;
}

export function FeedbackAdminReplyEmail({
  ticketNumber,
  title,
  body,
  ticketUrl,
  eyebrow,
  heading,
  greeting,
  intro,
  viewThread,
  footer,
}: FeedbackAdminReplyEmailProps) {
  return (
    <EmailLayout footerText={footer}>
      <Text style={eyebrowStyle}>
        {eyebrow} — FB-{ticketNumber}
      </Text>
      <Text style={headingStyle}>{heading}</Text>
      <Text style={paragraphStyle}>{title}</Text>
      <Text style={paragraphStyle}>{greeting}</Text>
      <Text style={paragraphStyle}>{intro}</Text>

      <Hr style={dividerStyle} />

      <Text style={{ ...paragraphStyle, whiteSpace: "pre-wrap" }}>{body}</Text>

      <Hr style={dividerStyle} />

      <Button style={buttonStyle} href={ticketUrl}>
        {viewThread}
      </Button>
    </EmailLayout>
  );
}
