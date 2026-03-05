import { Text, Button } from "@react-email/components";
import { EmailLayout } from "./components/email-layout";
import {
  heading,
  subheading,
  paragraph,
  button,
  badge,
  listItem,
  metadataRow,
  card,
  divider,
} from "../styles";

interface AiSummary {
  overallSentiment: string;
  keyTakeaways: string[];
  areasOfConcern: string[];
}

interface ActionItem {
  title: string;
  assigneeName: string;
  dueDate: string | null;
}

interface AiAddendum {
  sentimentAnalysis: string;
  coachingSuggestions: string[];
  riskIndicators: string[];
}

interface SessionSummaryEmailProps {
  variant: "manager" | "report";
  recipientName: string;
  otherPartyName: string;
  sessionNumber: number;
  sessionScore: number | null;
  aiSummary: AiSummary | null;
  actionItems: ActionItem[];
  viewSessionUrl: string;
  aiAddendum?: AiAddendum | null;
}

export function SessionSummaryEmail({
  variant,
  recipientName,
  otherPartyName,
  sessionNumber,
  sessionScore,
  aiSummary,
  actionItems,
  viewSessionUrl,
  aiAddendum,
}: SessionSummaryEmailProps) {
  return (
    <EmailLayout>
      <Text style={heading}>Session #{sessionNumber} Summary</Text>
      <Text style={paragraph}>
        Hi {recipientName}, here is the summary of your 1:1 with{" "}
        {otherPartyName}.
      </Text>

      {sessionScore !== null && (
        <Text style={{ ...badge, marginBottom: "24px" }}>
          Score: {sessionScore.toFixed(1)} / 5.0
        </Text>
      )}

      {aiSummary ? (
        <>
          <Text style={subheading}>Key Takeaways</Text>
          {aiSummary.keyTakeaways.map((takeaway, i) => (
            <Text key={i} style={listItem}>
              {takeaway}
            </Text>
          ))}

          {aiSummary.areasOfConcern.length > 0 && (
            <>
              <Text style={subheading}>Areas of Concern</Text>
              {aiSummary.areasOfConcern.map((concern, i) => (
                <Text key={i} style={listItem}>
                  {concern}
                </Text>
              ))}
            </>
          )}
        </>
      ) : (
        <Text style={{ ...paragraph, fontStyle: "italic" }}>
          AI summary is being generated and will be available in the app
          shortly.
        </Text>
      )}

      {actionItems.length > 0 && (
        <>
          <Text style={subheading}>Action Items</Text>
          {actionItems.map((item, i) => (
            <div key={i} style={card}>
              <Text style={{ ...listItem, marginBottom: "4px" }}>
                {item.title}
              </Text>
              <Text style={metadataRow}>
                Assigned to: {item.assigneeName}
                {item.dueDate ? ` | Due: ${item.dueDate}` : ""}
              </Text>
            </div>
          ))}
        </>
      )}

      {variant === "manager" && aiAddendum && (
        <>
          <div style={divider} />
          <Text style={subheading}>Manager Insights</Text>
          <Text style={paragraph}>{aiAddendum.sentimentAnalysis}</Text>

          {aiAddendum.coachingSuggestions.length > 0 && (
            <>
              <Text style={{ ...metadataRow, fontWeight: "600" as const }}>
                Coaching Suggestions
              </Text>
              {aiAddendum.coachingSuggestions.map((suggestion, i) => (
                <Text key={i} style={listItem}>
                  {suggestion}
                </Text>
              ))}
            </>
          )}

          {aiAddendum.riskIndicators.length > 0 && (
            <>
              <Text style={{ ...metadataRow, fontWeight: "600" as const }}>
                Risk Indicators
              </Text>
              {aiAddendum.riskIndicators.map((risk, i) => (
                <Text key={i} style={listItem}>
                  {risk}
                </Text>
              ))}
            </>
          )}
        </>
      )}

      <Button style={button} href={viewSessionUrl}>
        View Full Session
      </Button>
    </EmailLayout>
  );
}
