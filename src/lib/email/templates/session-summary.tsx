import { Text, Button, Section, Row, Column, Hr } from "@react-email/components";
import { EmailLayout } from "./components/email-layout";

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

// Font stacks (email-safe)
const manrope = "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const inter = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

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
      {/* ─── Header Section ─── */}
      <Section style={{ marginBottom: "48px" }}>
        {/* Eyebrow */}
        <Text style={{
          color: "#004c47",
          fontFamily: inter,
          fontSize: "12px",
          fontWeight: 700,
          textTransform: "uppercase" as const,
          letterSpacing: "0.15em",
          margin: "0 0 8px 0",
        }}>
          1on1 Intelligence
        </Text>

        {/* Title */}
        <Text style={{
          fontFamily: manrope,
          fontSize: "40px",
          fontWeight: 800,
          color: "#191c1d",
          letterSpacing: "-0.025em",
          lineHeight: "1.1",
          margin: "0 0 16px 0",
        }}>
          {labels.heading}
        </Text>

        {/* Greeting */}
        <Text style={{
          fontFamily: inter,
          fontSize: "18px",
          lineHeight: "1.6",
          color: "#454652",
          margin: "0 0 32px 0",
          maxWidth: "520px",
        }}>
          {labels.greeting}
        </Text>

        {/* Score Card — bento element */}
        {sessionScore !== null && (
          <div style={{
            backgroundColor: "#f8fafb",
            padding: "32px",
            borderRadius: "12px",
            borderLeft: "4px solid #29407d",
            boxShadow: "0 8px 32px rgba(25,28,29,0.04)",
            textAlign: "center" as const,
          }}>
            <Text style={{
              fontFamily: inter,
              fontSize: "11px",
              fontWeight: 600,
              color: "#454652",
              textTransform: "uppercase" as const,
              letterSpacing: "0.15em",
              margin: "0 0 8px 0",
            }}>
              {labels.sessionScore}
            </Text>
            <Text style={{
              fontFamily: manrope,
              fontSize: "36px",
              fontWeight: 900,
              color: "#29407d",
              margin: "0",
            }}>
              {sessionScore.toFixed(1)}{" "}
              <span style={{ fontSize: "16px", color: "#c5c5d4" }}>{labels.outOf}</span>
            </Text>
          </div>
        )}
      </Section>

      {aiSummary ? (
        <>
          {/* ─── Key Takeaways ─── */}
          <Section style={{
            backgroundColor: "#ffffff",
            padding: "40px",
            borderRadius: "12px",
            marginBottom: "16px",
            border: "1px solid #eceeef",
          }}>
            <Text style={{
              fontFamily: manrope,
              fontSize: "22px",
              fontWeight: 700,
              color: "#191c1d",
              letterSpacing: "-0.015em",
              margin: "0 0 24px 0",
            }}>
              ✦ {labels.keyTakeaways}
            </Text>
            {aiSummary.keyTakeaways.map((takeaway, i) => (
              <div key={i} style={{ display: "flex", marginBottom: "20px" }}>
                <div style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: "#004c47",
                  marginRight: "14px",
                  marginTop: "9px",
                  flexShrink: 0,
                }} />
                <Text style={{
                  fontFamily: inter,
                  fontSize: "15px",
                  lineHeight: "1.7",
                  color: "#454652",
                  margin: "0",
                }}>
                  {takeaway}
                </Text>
              </div>
            ))}
          </Section>

          {/* ─── Areas of Concern ─── */}
          {aiSummary.areasOfConcern.length > 0 && (
            <Section style={{
              backgroundColor: "#f2f4f5",
              padding: "40px",
              borderRadius: "12px",
              marginBottom: "48px",
            }}>
              <Text style={{
                fontFamily: manrope,
                fontSize: "22px",
                fontWeight: 700,
                color: "#191c1d",
                letterSpacing: "-0.015em",
                margin: "0 0 24px 0",
              }}>
                ⚠ {labels.areasOfConcern}
              </Text>
              {aiSummary.areasOfConcern.map((concern, i) => (
                <div key={i} style={{
                  backgroundColor: i === 0 ? "rgba(255, 218, 214, 0.3)" : "#e6e8e9",
                  borderRadius: "8px",
                  padding: "16px",
                  marginBottom: "8px",
                }}>
                  <Text style={{
                    fontFamily: inter,
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.05em",
                    color: i === 0 ? "#93000a" : "#191c1d",
                    margin: "0 0 4px 0",
                  }}>
                    {i === 0 ? labels.blocker : labels.needsClarity}
                  </Text>
                  <Text style={{
                    fontFamily: inter,
                    fontSize: "14px",
                    color: "#454652",
                    margin: "0",
                    lineHeight: "1.5",
                  }}>
                    {concern}
                  </Text>
                </div>
              ))}
            </Section>
          )}
        </>
      ) : (
        <Section style={{ marginBottom: "48px" }}>
          <Text style={{
            fontFamily: inter,
            fontSize: "15px",
            color: "#757684",
            fontStyle: "italic",
          }}>
            {labels.aiPending}
          </Text>
        </Section>
      )}

      {/* ─── Action Items ─── */}
      {actionItems.length > 0 && (
        <Section style={{ marginBottom: "48px" }}>
          <Text style={{
            fontFamily: manrope,
            fontSize: "26px",
            fontWeight: 800,
            color: "#191c1d",
            letterSpacing: "-0.025em",
            margin: "0 0 24px 0",
          }}>
            {labels.actionItems}
          </Text>

          {/* Your items */}
          {myItems.length > 0 && (
            <>
              <Text style={{
                fontFamily: inter,
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase" as const,
                letterSpacing: "0.1em",
                color: "#757684",
                margin: "0 0 12px 0",
              }}>
                {labels.yourActionItems}
              </Text>
              {myItems.map((item, i) => (
                <div key={i} style={{
                  backgroundColor: "#f8fafb",
                  padding: "20px 24px",
                  borderRadius: "12px",
                  marginBottom: "4px",
                  display: "flex",
                  alignItems: "center",
                }}>
                  <div style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "8px",
                    backgroundColor: "#cbdafd",
                    marginRight: "16px",
                    flexShrink: 0,
                  }} />
                  <div style={{ flex: 1 }}>
                    <Text style={{
                      fontFamily: manrope,
                      fontSize: "15px",
                      fontWeight: 700,
                      color: "#191c1d",
                      margin: "0 0 2px 0",
                    }}>
                      {item.title}
                    </Text>
                    <Text style={{
                      fontFamily: inter,
                      fontSize: "11px",
                      color: "#757684",
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.1em",
                      margin: "0",
                    }}>
                      {item.dueLabel || ""}
                    </Text>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Other person's items */}
          {otherItems.length > 0 && (
            <>
              <Text style={{
                fontFamily: inter,
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase" as const,
                letterSpacing: "0.1em",
                color: "#757684",
                margin: "24px 0 12px 0",
              }}>
                {labels.otherActionItems}
              </Text>
              {otherItems.map((item, i) => (
                <div key={i} style={{
                  backgroundColor: "#f8fafb",
                  padding: "20px 24px",
                  borderRadius: "12px",
                  marginBottom: "4px",
                  display: "flex",
                  alignItems: "center",
                }}>
                  <div style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "8px",
                    backgroundColor: "#eceeef",
                    marginRight: "16px",
                    flexShrink: 0,
                  }} />
                  <div style={{ flex: 1 }}>
                    <Text style={{
                      fontFamily: manrope,
                      fontSize: "15px",
                      fontWeight: 700,
                      color: "#191c1d",
                      margin: "0 0 2px 0",
                    }}>
                      {item.title}
                    </Text>
                    <Text style={{
                      fontFamily: inter,
                      fontSize: "11px",
                      color: "#757684",
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.1em",
                      margin: "0",
                    }}>
                      {item.assignedToLabel}{item.dueLabel ? ` · ${item.dueLabel}` : ""}
                    </Text>
                  </div>
                </div>
              ))}
            </>
          )}
        </Section>
      )}

      {/* ─── Manager-Only: Insights + Coaching ─── */}
      {variant === "manager" && aiAddendum && (
        <Section style={{ marginBottom: "48px" }}>
          {/* Manager Insights — gradient card */}
          <div style={{
            background: "linear-gradient(135deg, #29407d 0%, #425797 100%)",
            borderRadius: "12px",
            padding: "40px",
            marginBottom: "16px",
            color: "#ffffff",
          }}>
            <Text style={{
              fontFamily: manrope,
              fontSize: "22px",
              fontWeight: 700,
              color: "#ffffff",
              margin: "0 0 20px 0",
            }}>
              🧠 {labels.managerInsights}
            </Text>
            <Text style={{
              fontFamily: inter,
              fontSize: "16px",
              lineHeight: "1.7",
              color: "#c5d1ff",
              margin: "0",
            }}>
              &ldquo;{aiAddendum.sentimentAnalysis}&rdquo;
            </Text>
          </div>

          {/* Coaching Suggestions — teal accent card */}
          {aiAddendum.coachingSuggestions.length > 0 && (
            <div style={{
              backgroundColor: "rgba(0, 76, 71, 0.05)",
              borderRadius: "12px",
              padding: "40px",
              marginBottom: "16px",
            }}>
              <Text style={{
                fontFamily: manrope,
                fontSize: "22px",
                fontWeight: 700,
                color: "#004c47",
                margin: "0 0 20px 0",
              }}>
                📈 {labels.coachingSuggestions}
              </Text>
              {aiAddendum.coachingSuggestions.map((suggestion, i) => (
                <div key={i} style={{ display: "flex", marginBottom: "12px" }}>
                  <Text style={{
                    fontFamily: inter,
                    fontSize: "15px",
                    lineHeight: "1.6",
                    color: "#454652",
                    fontWeight: 500,
                    margin: "0",
                  }}>
                    • {suggestion}
                  </Text>
                </div>
              ))}
            </div>
          )}

          {/* Risk Indicators */}
          {aiAddendum.riskIndicators.length > 0 && (
            <div style={{
              backgroundColor: "#ffdad6",
              borderRadius: "12px",
              padding: "24px",
              borderLeft: "4px solid #ba1a1a",
            }}>
              <Text style={{
                fontFamily: inter,
                fontSize: "11px",
                fontWeight: 700,
                color: "#93000a",
                textTransform: "uppercase" as const,
                letterSpacing: "0.1em",
                margin: "0 0 12px 0",
              }}>
                {labels.riskIndicators}
              </Text>
              {aiAddendum.riskIndicators.map((risk, i) => (
                <Text key={i} style={{
                  fontFamily: inter,
                  fontSize: "14px",
                  color: "#93000a",
                  lineHeight: "1.5",
                  margin: "0 0 4px 0",
                }}>
                  {risk}
                </Text>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* ─── CTA ─── */}
      <Section style={{ textAlign: "center" as const, padding: "16px 0 0 0" }}>
        <Button
          href={viewSessionUrl}
          style={{
            backgroundColor: "#ffffff",
            color: "#29407d",
            fontFamily: manrope,
            fontSize: "15px",
            fontWeight: 700,
            padding: "16px 32px",
            borderRadius: "12px",
            textDecoration: "none",
            display: "inline-block",
            border: "1px solid #c5c5d4",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          {labels.button} →
        </Button>
      </Section>
    </EmailLayout>
  );
}
