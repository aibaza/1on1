import { Text, Button } from "@react-email/components";
import { EmailLayout } from "./components/email-layout";
import {
  heading,
  eyebrow,
  subheading,
  paragraph,
  button as buttonStyle,
  listItem,
  metadataRow,
  card,
  divider,
  scoreCard,
  insightCard,
  coachingCard,
  bulletDot,
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
  assignedToLabel: string;
  dueLabel: string | null;
  isAssignedToRecipient: boolean;
}

interface AiAddendum {
  sentimentAnalysis: string;
  coachingSuggestions: string[];
  riskIndicators: string[];
}

interface SessionSummaryLabels {
  heading: string;
  greeting: string;
  score: string;
  sessionScore: string;
  outOf: string;
  keyTakeaways: string;
  areasOfConcern: string;
  aiPending: string;
  actionItems: string;
  yourActionItems: string;
  otherActionItems: string;
  assignedTo: string;
  due: string;
  managerInsights: string;
  coachingSuggestions: string;
  riskIndicators: string;
  button: string;
  footer: string;
  blocker: string;
  needsClarity: string;
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
  labels: SessionSummaryLabels;
}

export function SessionSummaryEmail({
  variant,
  sessionScore,
  aiSummary,
  actionItems,
  viewSessionUrl,
  aiAddendum,
  labels,
}: SessionSummaryEmailProps) {
  const myItems = actionItems.filter((a) => a.isAssignedToRecipient);
  const otherItems = actionItems.filter((a) => !a.isAssignedToRecipient);

  return (
    <EmailLayout footerText={labels.footer}>
      {/* Header */}
      <Text style={eyebrow}>1on1 Intelligence</Text>
      <Text style={heading}>{labels.heading}</Text>
      <Text style={paragraph}>{labels.greeting}</Text>

      {/* Session Score */}
      {sessionScore !== null && (
        <div style={scoreCard}>
          <Text style={{ ...metadataRow, marginBottom: "8px" }}>{labels.sessionScore}</Text>
          <Text style={{ fontSize: "36px", fontWeight: "900", color: "#29407d", margin: "0", fontFamily: "'Manrope', sans-serif" }}>
            {sessionScore.toFixed(1)} <span style={{ fontSize: "16px", color: "#c5c5d4" }}>{labels.outOf}</span>
          </Text>
        </div>
      )}

      {aiSummary ? (
        <>
          {/* Key Takeaways */}
          <Text style={subheading}>{labels.keyTakeaways}</Text>
          <div style={{ ...card, backgroundColor: "#ffffff", border: "1px solid #eceeef" }}>
            {aiSummary.keyTakeaways.map((takeaway, i) => (
              <Text key={i} style={{ ...listItem, marginBottom: "12px" }}>
                <span style={bulletDot} />
                {takeaway}
              </Text>
            ))}
          </div>

          {/* Areas of Concern */}
          {aiSummary.areasOfConcern.length > 0 && (
            <>
              <Text style={subheading}>{labels.areasOfConcern}</Text>
              <div style={{ ...card, backgroundColor: "#f2f4f5" }}>
                {aiSummary.areasOfConcern.map((concern, i) => (
                  <div key={i} style={{ backgroundColor: i === 0 ? "rgba(186,26,26,0.08)" : "#e6e8e9", borderRadius: "8px", padding: "12px 16px", marginBottom: "8px" }}>
                    <Text style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase" as const, letterSpacing: "0.05em", color: i === 0 ? "#93000a" : "#191c1d", marginBottom: "4px" }}>
                      {i === 0 ? labels.blocker : labels.needsClarity}
                    </Text>
                    <Text style={{ fontSize: "14px", color: "#454652", margin: "0" }}>{concern}</Text>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <Text style={{ ...paragraph, fontStyle: "italic" }}>
          {labels.aiPending}
        </Text>
      )}

      {/* Action Items — separated by recipient */}
      {actionItems.length > 0 && (
        <>
          <Text style={subheading}>{labels.actionItems}</Text>

          {/* Your action items first */}
          {myItems.length > 0 && (
            <>
              <Text style={{ ...metadataRow, fontWeight: "700", marginBottom: "12px" }}>{labels.yourActionItems}</Text>
              {myItems.map((item, i) => (
                <div key={i} style={card}>
                  <Text style={{ fontSize: "15px", fontWeight: "700", color: "#191c1d", marginBottom: "4px" }}>
                    {item.title}
                  </Text>
                  <Text style={metadataRow}>
                    {item.dueLabel || ""}
                  </Text>
                </div>
              ))}
            </>
          )}

          {/* Other person's action items */}
          {otherItems.length > 0 && (
            <>
              <Text style={{ ...metadataRow, fontWeight: "700", marginBottom: "12px", marginTop: "16px" }}>{labels.otherActionItems}</Text>
              {otherItems.map((item, i) => (
                <div key={i} style={{ ...card, opacity: 0.7 }}>
                  <Text style={{ fontSize: "15px", fontWeight: "700", color: "#191c1d", marginBottom: "4px" }}>
                    {item.title}
                  </Text>
                  <Text style={metadataRow}>
                    {item.assignedToLabel}{item.dueLabel ? ` · ${item.dueLabel}` : ""}
                  </Text>
                </div>
              ))}
            </>
          )}
        </>
      )}

      {/* Manager-only: Insights + Coaching */}
      {variant === "manager" && aiAddendum && (
        <>
          <div style={divider} />

          {/* Manager Insights */}
          <div style={insightCard}>
            <Text style={{ fontSize: "20px", fontWeight: "700", color: "#ffffff", marginBottom: "16px", fontFamily: "'Manrope', sans-serif" }}>
              {labels.managerInsights}
            </Text>
            <Text style={{ fontSize: "15px", lineHeight: "26px", color: "#c5d1ff", margin: "0" }}>
              &ldquo;{aiAddendum.sentimentAnalysis}&rdquo;
            </Text>
          </div>

          {/* Coaching Suggestions */}
          {aiAddendum.coachingSuggestions.length > 0 && (
            <div style={coachingCard}>
              <Text style={{ fontSize: "20px", fontWeight: "700", color: "#004c47", marginBottom: "16px", fontFamily: "'Manrope', sans-serif" }}>
                {labels.coachingSuggestions}
              </Text>
              {aiAddendum.coachingSuggestions.map((suggestion, i) => (
                <Text key={i} style={{ ...listItem, color: "#454652" }}>
                  <span style={{ ...bulletDot, backgroundColor: "#004c47" }} />
                  {suggestion}
                </Text>
              ))}
            </div>
          )}

          {/* Risk Indicators */}
          {aiAddendum.riskIndicators.length > 0 && (
            <div style={{ ...card, backgroundColor: "#ffdad6", borderLeft: "4px solid #ba1a1a", marginTop: "12px" }}>
              <Text style={{ fontSize: "12px", fontWeight: "700", color: "#93000a", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: "8px" }}>
                {labels.riskIndicators}
              </Text>
              {aiAddendum.riskIndicators.map((risk, i) => (
                <Text key={i} style={{ ...listItem, color: "#93000a" }}>{risk}</Text>
              ))}
            </div>
          )}
        </>
      )}

      {/* CTA */}
      <div style={{ textAlign: "center" as const, marginTop: "32px" }}>
        <Button style={buttonStyle} href={viewSessionUrl}>
          {labels.button}
        </Button>
      </div>
    </EmailLayout>
  );
}
