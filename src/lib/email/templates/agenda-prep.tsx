import { Text, Button } from "@react-email/components";
import { EmailLayout } from "./components/email-layout";
import {
  heading,
  paragraph,
  subheading,
  button,
  card,
  listItem,
  metadataRow,
} from "../styles";

interface Nudge {
  content: string;
  reason: string;
}

interface AgendaPrepEmailProps {
  variant: "manager" | "report";
  recipientName: string;
  otherPartyName: string;
  meetingDate: string;
  seriesUrl: string;
  nudges?: Nudge[];
}

export function AgendaPrepEmail({
  variant,
  recipientName,
  otherPartyName,
  meetingDate,
  seriesUrl,
  nudges,
}: AgendaPrepEmailProps) {
  return (
    <EmailLayout>
      <Text style={heading}>Prepare for Your 1:1</Text>
      <Text style={paragraph}>
        Hi {recipientName},
      </Text>
      <Text style={paragraph}>
        Your 1:1 with {otherPartyName} is on <strong>{meetingDate}</strong>.
        {variant === "report"
          ? " Take a moment to add your talking points before the meeting."
          : " Here are some things to consider before your session."}
      </Text>

      {variant === "manager" && nudges && nudges.length > 0 && (
        <>
          <Text style={subheading}>AI Coaching Nudges</Text>
          {nudges.map((nudge, i) => (
            <div key={i} style={card}>
              <Text style={{ ...listItem, marginBottom: "4px" }}>
                {nudge.content}
              </Text>
              <Text style={metadataRow}>{nudge.reason}</Text>
            </div>
          ))}
        </>
      )}

      <Button style={button} href={seriesUrl}>
        {variant === "manager" ? "Open Meeting Series" : "Add Talking Points"}
      </Button>
    </EmailLayout>
  );
}
