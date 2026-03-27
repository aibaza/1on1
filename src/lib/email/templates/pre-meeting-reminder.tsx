import { Text, Button } from "@react-email/components";
import { EmailLayout } from "./components/email-layout";
import {
  heading as headingStyle,
  paragraph as paragraphStyle,
  button as buttonStyle,
} from "../styles";

interface PreMeetingReminderEmailProps {
  recipientName: string;
  otherPartyName: string;
  meetingDate: string;
  meetingTime: string;
  seriesUrl: string;
  // Translated string props
  heading: string;
  greeting: string;
  body: string;              // pre-interpolated: "You have a 1on1 with {name} on {date} at {time}."
  buttonLabel: string;
  footer: string;
}

export function PreMeetingReminderEmail({
  seriesUrl,
  heading,
  greeting,
  body,
  buttonLabel,
  footer,
}: PreMeetingReminderEmailProps) {
  return (
    <EmailLayout footerText={footer}>
      <Text style={headingStyle}>{heading}</Text>
      <Text style={paragraphStyle}>{greeting}</Text>
      <Text style={paragraphStyle}>{body}</Text>
      <Button style={buttonStyle} href={seriesUrl}>
        {buttonLabel}
      </Button>
    </EmailLayout>
  );
}
