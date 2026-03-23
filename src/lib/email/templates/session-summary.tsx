import { Text, Button, Section, Img } from "@react-email/components";
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
  feedbackFrom: string;
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
  managerName?: string;
  companyName?: string;
  companyColor?: string;
}

const F = {
  manrope: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  inter: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

export function SessionSummaryEmail({
  variant,
  sessionScore,
  aiSummary,
  actionItems,
  viewSessionUrl,
  aiAddendum,
  labels,
  managerName,
  companyName,
  companyColor,
}: SessionSummaryEmailProps) {
  const myItems = actionItems.filter((a) => a.isAssignedToRecipient);
  const otherItems = actionItems.filter((a) => !a.isAssignedToRecipient);

  return (
    <EmailLayout footerText={labels.footer} companyName={companyName} companyColor={companyColor}>
      {/* ════════════════ HEADER SECTION ════════════════ */}
      <table cellPadding="0" cellSpacing="0" width="100%" style={{ marginBottom: "48px" }}>
        <tr>
          <td>
            {/* Eyebrow */}
            <p style={{ color: "#004c47", fontFamily: F.inter, fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", margin: "0 0 8px 0" }}>
              1on1 Intelligence
            </p>
            {/* Title — large like template */}
            <h1 style={{ fontFamily: F.manrope, fontSize: "44px", fontWeight: 800, color: "#191c1d", letterSpacing: "-0.025em", lineHeight: "1.1", margin: "0 0 16px 0" }}>
              {labels.heading}
            </h1>
            {/* Greeting — xl size */}
            <p style={{ fontFamily: F.inter, fontSize: "18px", lineHeight: "1.6", color: "#454652", margin: "0" }}>
              {labels.greeting}
            </p>
          </td>
          {/* Score Bento — right side */}
          {sessionScore !== null && (
            <td style={{ verticalAlign: "bottom", paddingLeft: "24px", width: "200px" }}>
              <div style={{
                backgroundColor: "#ffffff", padding: "32px 24px", borderRadius: "12px",
                border: "1px solid #eceeef", borderLeft: "4px solid #29407d",
                boxShadow: "0 4px 16px rgba(25,28,29,0.06)",
                textAlign: "center",
              }}>
                <p style={{ fontFamily: F.inter, fontSize: "11px", fontWeight: 600, color: "#454652", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 8px 0" }}>
                  {labels.sessionScore}
                </p>
                <p style={{ fontFamily: F.manrope, fontSize: "36px", fontWeight: 900, color: "#29407d", margin: "0", lineHeight: "1" }}>
                  {sessionScore.toFixed(1)} <span style={{ fontSize: "16px", color: "#c5c5d4" }}>{labels.outOf}</span>
                </p>
              </div>
            </td>
          )}
        </tr>
      </table>

      {/* ════════════════ RISK INDICATORS (manager only, before takeaways) ════════════════ */}
      {variant === "manager" && aiAddendum && aiAddendum.riskIndicators.length > 0 && (
        <div style={{
          backgroundColor: "#ffdad6", borderRadius: "12px", padding: "24px 32px",
          borderLeft: "4px solid #ba1a1a", marginBottom: "32px",
        }}>
          <p style={{ fontFamily: F.inter, fontSize: "11px", fontWeight: 700, color: "#93000a", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 12px 0" }}>
            {labels.riskIndicators}
          </p>
          {aiAddendum.riskIndicators.map((risk, i) => (
            <p key={i} style={{ fontFamily: F.inter, fontSize: "14px", color: "#93000a", lineHeight: "1.5", margin: "0 0 4px 0" }}>
              {risk}
            </p>
          ))}
        </div>
      )}

      {aiSummary ? (
        <>
          {/* ════════════════ BENTO GRID: Takeaways + Concerns ════════════════ */}
          <table cellPadding="0" cellSpacing="0" width="100%" style={{ marginBottom: "48px" }}>
            <tr>
              {/* Key Takeaways — 58% width */}
              <td style={{ verticalAlign: "top", width: "58%", paddingRight: "16px" }}>
                <div style={{
                  backgroundColor: "#ffffff", border: "1px solid #eceeef",
                  padding: "40px", borderRadius: "12px", height: "100%",
                }}>
                  <p style={{ fontFamily: F.manrope, fontSize: "22px", fontWeight: 700, color: "#191c1d", letterSpacing: "-0.015em", margin: "0 0 24px 0" }}>
                    {labels.keyTakeaways}
                  </p>
                  {aiSummary.keyTakeaways.map((takeaway, i) => (
                    <p key={i} style={{ fontFamily: F.inter, fontSize: "15px", lineHeight: "1.7", color: "#454652", margin: "0 0 16px 0" }}>
                      <span style={{ color: "#004c47", marginRight: "10px", fontSize: "8px", verticalAlign: "middle" }}>&#9679;</span>
                      {takeaway}
                    </p>
                  ))}
                </div>
              </td>
              {/* Concerns — 42% width */}
              {aiSummary.areasOfConcern.length > 0 && (
                <td style={{ verticalAlign: "top", width: "42%" }}>
                  <div style={{
                    backgroundColor: "#f2f4f5", padding: "24px", borderRadius: "12px", height: "100%",
                  }}>
                    <p style={{ fontFamily: F.manrope, fontSize: "22px", fontWeight: 700, color: "#191c1d", letterSpacing: "-0.015em", margin: "0 0 24px 0" }}>
                      {labels.areasOfConcern}
                    </p>
                    {aiSummary.areasOfConcern.map((concern, i) => (
                      <div key={i} style={{
                        backgroundColor: i === 0 ? "rgba(255,218,214,0.3)" : "#e6e8e9",
                        borderRadius: "8px", padding: "16px", marginBottom: "12px",
                      }}>
                        <p style={{ fontFamily: F.inter, fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: i === 0 ? "#93000a" : "#191c1d", margin: "0 0 6px 0" }}>
                          {i === 0 ? labels.blocker : labels.needsClarity}
                        </p>
                        <p style={{ fontFamily: F.inter, fontSize: "14px", color: "#454652", margin: "0", lineHeight: "1.5" }}>
                          {concern}
                        </p>
                      </div>
                    ))}
                  </div>
                </td>
              )}
            </tr>
          </table>
        </>
      ) : (
        <p style={{ fontFamily: F.inter, fontSize: "15px", color: "#757684", fontStyle: "italic", marginBottom: "48px" }}>
          {labels.aiPending}
        </p>
      )}

      {/* ════════════════ ACTION ITEMS ════════════════ */}
      {actionItems.length > 0 && (
        <div style={{ marginBottom: "48px" }}>
          <h2 style={{ fontFamily: F.manrope, fontSize: "28px", fontWeight: 800, color: "#191c1d", letterSpacing: "-0.025em", margin: "0 0 32px 0" }}>
            {labels.actionItems}
          </h2>

          {/* Your items */}
          {myItems.length > 0 && (
            <>
              <p style={{ fontFamily: F.inter, fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#757684", margin: "0 0 12px 0" }}>
                {labels.yourActionItems}
              </p>
              {myItems.map((item, i) => (
                <table key={i} cellPadding="0" cellSpacing="0" width="100%" style={{
                  backgroundColor: "#ffffff", border: "1px solid #eceeef",
                  borderRadius: "12px", marginBottom: "6px",
                }}>
                  <tr>
                    <td style={{ padding: "20px 24px", width: "48px", verticalAlign: "middle" }}>
                      <div style={{ width: "40px", height: "40px", borderRadius: "8px", backgroundColor: "#cbdafd" }} />
                    </td>
                    <td style={{ padding: "20px 0", verticalAlign: "middle" }}>
                      <p style={{ fontFamily: F.manrope, fontSize: "15px", fontWeight: 700, color: "#191c1d", margin: "0 0 2px 0" }}>
                        {item.title}
                      </p>
                      <p style={{ fontFamily: F.inter, fontSize: "11px", color: "#757684", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0" }}>
                        {item.dueLabel || ""}
                      </p>
                    </td>
                    <td style={{ padding: "20px 24px", textAlign: "right", verticalAlign: "middle" }}>
                      {item.dueLabel && (
                        <p style={{ fontFamily: F.inter, fontSize: "13px", fontWeight: 600, color: "#29407d", margin: "0" }}>
                          {item.dueLabel}
                        </p>
                      )}
                    </td>
                  </tr>
                </table>
              ))}
            </>
          )}

          {/* Other person's items */}
          {otherItems.length > 0 && (
            <>
              <p style={{ fontFamily: F.inter, fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#757684", margin: "24px 0 12px 0" }}>
                {labels.otherActionItems}
              </p>
              {otherItems.map((item, i) => (
                <table key={i} cellPadding="0" cellSpacing="0" width="100%" style={{
                  backgroundColor: "#ffffff", border: "1px solid #eceeef",
                  borderRadius: "12px", marginBottom: "6px",
                }}>
                  <tr>
                    <td style={{ padding: "20px 24px", width: "48px", verticalAlign: "middle" }}>
                      <div style={{ width: "40px", height: "40px", borderRadius: "8px", backgroundColor: "#eceeef" }} />
                    </td>
                    <td style={{ padding: "20px 0", verticalAlign: "middle" }}>
                      <p style={{ fontFamily: F.manrope, fontSize: "15px", fontWeight: 700, color: "#191c1d", margin: "0 0 2px 0" }}>
                        {item.title}
                      </p>
                      <p style={{ fontFamily: F.inter, fontSize: "11px", color: "#757684", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0" }}>
                        {item.assignedToLabel}{item.dueLabel ? ` · ${item.dueLabel}` : ""}
                      </p>
                    </td>
                  </tr>
                </table>
              ))}
            </>
          )}
        </div>
      )}

      {/* ════════════════ MANAGER-ONLY: INSIGHTS + COACHING ════════════════ */}
      {variant === "manager" && aiAddendum && (
        <table cellPadding="0" cellSpacing="0" width="100%" style={{ marginBottom: "48px" }}>
          <tr>
            {/* Manager Insights — gradient card */}
            <td style={{ width: "50%", paddingRight: "12px", verticalAlign: "top", height: "1px" }}>
              <div style={{
                background: "linear-gradient(135deg, #29407d 0%, #425797 100%)",
                borderRadius: "12px", padding: "40px", color: "#ffffff", height: "100%", minHeight: "280px",
              }}>
                <p style={{ fontFamily: F.manrope, fontSize: "22px", fontWeight: 700, color: "#ffffff", margin: "0 0 20px 0" }}>
                  {labels.managerInsights}
                </p>
                <p style={{ fontFamily: F.inter, fontSize: "16px", lineHeight: "1.7", color: "#c5d1ff", margin: "0 0 20px 0" }}>
                  &ldquo;{aiAddendum.sentimentAnalysis}&rdquo;
                </p>
                {managerName && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "16px" }}>
                    <p style={{ fontFamily: F.inter, fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0" }}>
                      {labels.feedbackFrom}
                    </p>
                  </div>
                )}
              </div>
            </td>
            {/* Coaching Suggestions */}
            <td style={{ width: "50%", paddingLeft: "12px", verticalAlign: "top", height: "1px" }}>
              <div style={{
                backgroundColor: "rgba(0,76,71,0.05)", border: "1px solid rgba(0,76,71,0.1)",
                borderRadius: "12px", padding: "40px", height: "100%", minHeight: "280px",
              }}>
                <p style={{ fontFamily: F.manrope, fontSize: "22px", fontWeight: 700, color: "#004c47", margin: "0 0 20px 0" }}>
                  {labels.coachingSuggestions}
                </p>
                {aiAddendum.coachingSuggestions.map((suggestion, i) => (
                  <p key={i} style={{ fontFamily: F.inter, fontSize: "15px", lineHeight: "1.6", color: "#454652", fontWeight: 500, margin: "0 0 12px 0" }}>
                    <span style={{ color: "#004c47", marginRight: "10px", fontSize: "8px", verticalAlign: "middle" }}>&#9679;</span>
                    {suggestion}
                  </p>
                ))}
              </div>
            </td>
          </tr>
        </table>
      )}

      {/* (Risk indicators rendered above key takeaways) */}

      {/* ════════════════ CTA ════════════════ */}
      <div style={{ textAlign: "center", padding: "24px 0 0 0" }}>
        <a
          href={viewSessionUrl}
          style={{
            display: "inline-block",
            backgroundColor: "#29407d", color: "#ffffff",
            fontFamily: F.manrope, fontSize: "16px", fontWeight: 700,
            padding: "18px 40px", borderRadius: "12px",
            textDecoration: "none",
            boxShadow: "0 4px 16px rgba(41,64,125,0.25)",
          }}
        >
          {labels.button} &rarr;
        </a>
      </div>
    </EmailLayout>
  );
}
