import { Text, Button } from "@react-email/components";
import { EmailLayout } from "./components/email-layout";
import { heading, paragraph, button } from "../styles";

interface PreMeetingReminderEmailProps {
  recipientName: string;
  otherPartyName: string;
  meetingDate: string;
  meetingTime: string;
  seriesUrl: string;
}

export function PreMeetingReminderEmail({
  recipientName,
  otherPartyName,
  meetingDate,
  meetingTime,
  seriesUrl,
}: PreMeetingReminderEmailProps) {
  return (
    <EmailLayout>
      <Text style={heading}>Upcoming 1:1 Meeting</Text>
      <Text style={paragraph}>
        Hi {recipientName},
      </Text>
      <Text style={paragraph}>
        You have a 1:1 meeting with {otherPartyName} coming up on{" "}
        <strong>{meetingDate}</strong> at <strong>{meetingTime}</strong>.
      </Text>
      <Button style={button} href={seriesUrl}>
        Open Meeting Series
      </Button>
    </EmailLayout>
  );
}
