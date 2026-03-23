/**
 * Test script: send both manager and report session summary emails.
 * Usage: bun run scripts/test-email.ts
 */
import "dotenv/config";
import { render } from "@react-email/render";
import { createTransport } from "nodemailer";
import { SessionSummaryEmail } from "../src/lib/email/templates/session-summary";

const transport = createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "ssl",
  ...(process.env.SMTP_USERNAME
    ? { auth: { user: process.env.SMTP_USERNAME, pass: process.env.SMTP_PASSWORD } }
    : {}),
});

const from = process.env.EMAIL_FROM || "1on1 <noreply@example.com>";

const aiSummary = {
  overallSentiment: "positive",
  keyTakeaways: [
    "Team alignment on Q1 OKRs is strong — all three key results are on track with 85% completion.",
    "The new onboarding flow reduced time-to-productivity by 30%, exceeding the target of 20%.",
    "Cross-team collaboration between Engineering and Product has improved significantly since the last session.",
  ],
  areasOfConcern: [
    "Engineering bandwidth for the workspace UI component is limited until Sprint 14.",
    "Budget approval for the high-fidelity asset library renewal needs clarity from leadership.",
  ],
};

const aiAddendum = {
  sentimentAnalysis: "Maria shows strong ownership over the project vision. There's a noticeable shift from executing tasks to defining the creative north star. This is a critical transition for her path to Senior Engineer.",
  coachingSuggestions: [
    "Delegate the legacy component audits to the junior team to free up strategic focus time.",
    "Present the architecture rationale at the next All-Hands to build company-wide buy-in.",
  ],
  riskIndicators: [
    "Workload capacity trending at 90% — risk of burnout if sustained beyond 2 more sprints.",
  ],
};

const baseActionItems = [
  {
    title: "Finalize Q1 OKR documentation",
    assigneeName: "Maria Turcan",
    dueDate: "2026-03-28",
    assignedToLabel: "Assigned to: Maria Turcan",
    dueLabel: "Due: Mar 28, 2026",
  },
  {
    title: "Review architecture decision record",
    assigneeName: "Maria Turcan",
    dueDate: "2026-04-01",
    assignedToLabel: "Assigned to: Maria Turcan",
    dueLabel: "Due: Apr 1, 2026",
  },
  {
    title: "Schedule team retrospective",
    assigneeName: "Ciprian Dobrea",
    dueDate: "2026-03-30",
    assignedToLabel: "Assigned to: Ciprian Dobrea",
    dueLabel: "Due: Mar 30, 2026",
  },
  {
    title: "Prepare board presentation slides",
    assigneeName: "Ciprian Dobrea",
    dueDate: null,
    assignedToLabel: "Assigned to: Ciprian Dobrea",
    dueLabel: null,
  },
];

const viewSessionUrl = "https://1on1-git-develop-surcod.vercel.app/sessions/99999999-0001-4000-9000-000000000001/summary";

const baseLabels = {
  heading: "Session #8 Summary",
  score: "Score: 4.3 / 5.0",
  sessionScore: "Session Score",
  outOf: "/ 5.0",
  keyTakeaways: "Key Takeaways",
  areasOfConcern: "Areas of Concern",
  blocker: "Blocker",
  needsClarity: "Needs Clarity",
  aiPending: "AI summary is being generated...",
  actionItems: "Action Items",
  yourActionItems: "Your Action Items",
  otherActionItems: "",
  assignedTo: "",
  due: "",
  managerInsights: "Manager Insights",
  coachingSuggestions: "Coaching Suggestions",
  riskIndicators: "Risk Indicators",
  button: "View Full Session",
  footer: "This email was sent by 1on1 · © 2026 All rights reserved",
};

async function main() {
  console.log("Rendering manager email...");
  const managerItems = baseActionItems.map((ai) => ({
    ...ai,
    isAssignedToRecipient: ai.assigneeName === "Ciprian Dobrea",
  }));
  const managerHtml = await render(
    SessionSummaryEmail({
      variant: "manager",
      recipientName: "Ciprian",
      otherPartyName: "Maria Turcan",
      sessionNumber: 8,
      sessionScore: 4.3,
      aiSummary,
      actionItems: managerItems,
      viewSessionUrl,
      aiAddendum,
      managerName: "Ciprian Dobrea",
      companyName: "Acme Corp",
      companyColor: "#29407d",
      labels: {
        ...baseLabels,
        greeting: "Hi Ciprian, here is the summary of your 1:1 with Maria Turcan.",
        otherActionItems: "Assigned to Maria Turcan",
      },
    })
  );

  console.log("Rendering report email...");
  const reportItems = baseActionItems.map((ai) => ({
    ...ai,
    isAssignedToRecipient: ai.assigneeName === "Maria Turcan",
  }));
  const reportHtml = await render(
    SessionSummaryEmail({
      variant: "report",
      recipientName: "Ciprian",
      otherPartyName: "Ciprian Dobrea",
      sessionNumber: 8,
      sessionScore: 4.3,
      aiSummary,
      actionItems: reportItems,
      viewSessionUrl,
      companyName: "Acme Corp",
      companyColor: "#29407d",
      labels: {
        ...baseLabels,
        greeting: "Hi Ciprian, here is the summary of your 1:1 with Ciprian Dobrea.",
        otherActionItems: "Assigned to Ciprian Dobrea",
      },
    })
  );

  // Send manager version to Gmail
  console.log("Sending manager version to ciprian.dobrea@gmail.com...");
  await transport.sendMail({
    from,
    to: "ciprian.dobrea@gmail.com",
    subject: "1:1 Session #8 Summary (Manager View)",
    html: managerHtml,
  });
  console.log("✓ Manager email sent");

  // Send report version to Softexco
  console.log("Sending report version to ciprian.dobrea@softexco.ro...");
  await transport.sendMail({
    from,
    to: "ciprian.dobrea@softexco.ro",
    subject: "1:1 Session #8 Summary (Report View)",
    html: reportHtml,
  });
  console.log("✓ Report email sent");

  console.log("\nDone! Check both inboxes.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
