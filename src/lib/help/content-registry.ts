// AUTO-GENERATED — do not edit. Run: npx tsx scripts/generate-help-content.ts
export const helpContent: Record<string, string> = {
  "en/account/profile": `Your profile controls how you appear to others in 1on1 and your personal preferences. All roles can access their profile from **Account > Profile**.

![Profile](account-settings.jpg)

## Update your name

1. Go to **Account > Profile**.
2. Edit the **Full Name** field.
3. Click **Save Changes**.

Your name appears in session summaries, action items, and notifications sent to other participants.

## Change your avatar

1. Click your current avatar or the placeholder image.
2. Upload a new photo (JPG or PNG, max 2 MB).
3. The avatar updates immediately across the application.

## Set your language

1. Under **Preferences**, open the **Language** dropdown.
2. Select **English** or **Romanian**.
3. Click **Save Changes**.

This overrides the company default and applies to the entire interface, including email notifications.

## Configure notifications

The **Notifications** section controls which emails you receive:

- **Session reminders** -- Get notified before an upcoming session.
- **Action item updates** -- Receive alerts when action items assigned to you are created or updated.
- **Summary emails** -- Get a post-session summary after each meeting.

Toggle each notification type on or off, then click **Save Changes**.
`,
  "en/account/security": `The security page lets you manage your password and connected sign-in accounts. Go to **Account > Security** to access these settings.

![Security](account-security.jpg)

## Change your password

1. Go to **Account > Security**.
2. Enter your **current password**.
3. Enter your **new password** and confirm it.
4. Click **Update Password**.

Your new password must be at least 8 characters. Use a mix of letters, numbers, and symbols for a strong password.

## Connected accounts

You can link external accounts to sign in with a single click instead of entering your password.

### Link an account

1. Under **Connected Accounts**, click **Connect** next to Google or Microsoft.
2. You are redirected to the provider's sign-in page.
3. Authorize 1on1 to access your basic profile information.
4. After authorization, the account appears as connected.

### Unlink an account

1. Find the connected account under **Connected Accounts**.
2. Click **Disconnect**.
3. Confirm the action.

You can only disconnect an OAuth account if you have another sign-in method available (password or another connected account). This prevents you from losing access.

## Active sessions

The **Active Sessions** section shows all devices where you are currently signed in. If you notice an unfamiliar session, click **Revoke** to sign out that device immediately.
`,
  "en/action-items/managing": `Action items are created during sessions and tracked across meetings. They help you turn conversation into concrete follow-up.

## Creating an action item

You create action items during a session in the meeting wizard.

1. Open the **Action Items** section in the wizard sidebar.
2. Click **Add action item**.
3. Enter a clear, specific title that describes what needs to happen.
4. Choose an **assignee** — either the manager or the report.
5. Set a **due date**. Pick a date before or on the next scheduled session.
6. Click **Save**.

![Create action item](action-item-create.jpg)

The item is immediately saved and linked to the current session.

## Assigning to people

Each action item is assigned to one person — either the manager or the report in that meeting series. The assignee is responsible for completing the task before the due date.

Only the manager can create and assign action items during a session. Members can view their assigned items and update the status.

## Setting due dates

Choose a realistic due date. The system highlights overdue items on both the action items page and in the session wizard, so missed deadlines are visible in your next meeting.

## Marking as complete

To update the status of an action item:

1. Go to the **Action Items** page or open a session wizard.
2. Find the item and click the **status dropdown**.
3. Select **In Progress**, **Completed**, or **Cancelled**.

Status changes are logged and visible in the session history.

## Tracking across sessions

Open action items carry forward automatically. When you start a new session, the wizard shows all outstanding items from previous meetings so you can review progress together.

Completed items remain in the history for reference but no longer appear in the active list.
`,
  "en/action-items/overview": `The **Action Items** page gives you a single view of every task created during your one-on-one sessions. Use it to stay on top of commitments between meetings.

![Action items](action-items-list.jpg)

## What you see

The page lists all action items that are relevant to you. Each item shows its title, assignee, due date, and current status.

- **Assigned to me** — tasks you are responsible for completing.
- **Assigned by me** — tasks you created and assigned to someone else. Only visible to managers and admins.

Switch between these views using the tabs at the top of the page.

## Filtering and sorting

Use the filters to narrow down the list:

1. **Status** — filter by **Open**, **In Progress**, **Completed**, or **Cancelled**.
2. **Due date** — show items due today, this week, overdue, or within a custom range.
3. **Meeting series** — show items from a specific one-on-one pairing.

Click any column header to sort the list by that field.

## Status meanings

| Status | Meaning |
|---|---|
| **Open** | Newly created, not yet started. |
| **In Progress** | Work has begun. |
| **Completed** | Done. Marked as finished by the assignee. |
| **Cancelled** | No longer relevant. |

## Quick actions

From the action items list you can:

- Click an item to view its details and the session where it was created.
- Change the status directly from the list using the status dropdown.
- Edit the due date or title inline.

Overdue items are highlighted so you can spot them at a glance. Review this page before each session to prepare for your next meeting.
`,
  "en/analytics/dashboard": `The analytics dashboard gives you a high-level view of how your one-on-one meetings are going across your team. You can spot trends, identify areas that need attention, and track engagement over time.

![Analytics](analytics-dashboard.jpg)

## Key metrics

The dashboard displays several core metrics at the top:

- **Average score** -- the mean session score across all your reports, with a trend indicator showing whether it's rising or falling.
- **Engagement rate** -- the percentage of scheduled sessions that were actually completed.
- **Action item completion** -- how many assigned action items were closed before the next session.
- **Sessions this period** -- total sessions conducted in the selected time range.

## Score trends chart

The main chart plots average session scores over time. You can filter by:

1. Select a **time range** (last 30 days, 90 days, 6 months, or 1 year) from the dropdown.
2. Toggle between **all reports** or a specific person using the filter controls.
3. Hover over any data point to see the exact score and session date.

## Using the dashboard

1. Navigate to **Analytics** in the sidebar.
2. Review the metric cards at the top for a quick health check.
3. Use the score trends chart to identify upward or downward patterns.
4. Click on any person's name in the breakdown table to jump to their individual report.

## What to look for

Declining scores over multiple sessions may signal disengagement or unresolved issues. A drop in action item completion often means follow-through needs attention. Consistently high engagement rates indicate your meeting cadence is working well.

Admins see data for the entire organization. Managers see data for their direct reports only.
`,
  "en/analytics/individual": `Individual reports show a single person's meeting history, score trends, and engagement metrics. Use them to prepare for upcoming sessions or to review how someone is progressing over time.

![Individual analytics](analytics-individual.jpg)

## Viewing an individual report

1. Navigate to **Analytics** in the sidebar.
2. Click on a person's name in the dashboard breakdown table, or go to **People** and select **View analytics** from their profile.
3. The report loads with their full session history and metrics.

## What the report includes

- **Score trend** -- a line chart showing how their session scores have changed over time. Look for sustained drops or improvements.
- **Session history** -- a list of all completed sessions with dates, scores, and the template used. Click any session to review its full summary.
- **Engagement metrics** -- completion rate for scheduled sessions, average preparation time, and response consistency.
- **Action items** -- a breakdown of assigned vs. completed action items, with an on-time completion percentage.

## Filtering and time ranges

Use the time range selector to narrow the view to a specific period. This adjusts all charts and metrics on the page.

## Practical uses

- **Before a session**: Review the person's recent scores and open action items so you can address trends directly.
- **During reviews**: Reference long-term score trends and engagement data to support performance conversations with concrete data.
- **Spotting issues early**: A sudden score drop or missed sessions can signal problems before they escalate.

Admins can view individual reports for anyone in the organization. Managers can only view reports for their direct reports.
`,
  "en/analytics/team": `Team reports aggregate meeting data across all members of a team, giving you a birds-eye view of team health and engagement patterns.

![Team analytics](analytics-team.jpg)

## Viewing a team report

1. Navigate to **Analytics** in the sidebar.
2. Select the **Team** tab.
3. Choose a team from the dropdown to load its report.

## Team-level metrics

The report shows aggregated data for the selected team:

- **Team average score** -- the mean session score across all team members, with a trend line.
- **Engagement rate** -- the percentage of scheduled sessions completed by team members.
- **Action item completion** -- aggregate completion rate for all action items assigned within the team.
- **Member count** -- how many active members are in the team.

## Comparing members

The member comparison table lists each team member alongside their individual metrics. This helps you identify:

- Members whose scores are trending differently from the team average.
- Differences in engagement or action item follow-through.
- Who might need more attention or a different meeting approach.

You can sort the table by any column to quickly find outliers.

## Using team reports effectively

1. Review the team report weekly or bi-weekly to stay aware of overall trends.
2. Compare the team average against individual scores to find people who may be struggling silently.
3. Use the engagement rate to assess whether your meeting cadence suits the team.
4. Share high-level findings in team meetings to reinforce accountability.

Admins can view reports for any team. Managers see reports only for teams they manage.
`,
  "en/getting-started/first-login": `After you receive your invitation email, click the link to access 1on1 for the first time. Here is what to expect.

![Login page](login-page.jpg)

## Verify your email

1. Open the invitation email from your company admin.
2. Click **Accept Invitation** to open the login page.
3. Sign in with your email address. You will receive a verification code -- enter it to complete authentication.

## Set up your profile

On your first login, you are prompted to complete your profile:

1. Add your **full name** and optionally upload a profile photo.
2. Choose your preferred **language** (English or Romanian).
3. Click **Save** to continue to the dashboard.

You can update these settings later from **Account > Profile**.

## Understand your dashboard

What you see on the **Dashboard** depends on your role.

**If you are an admin:**
- Company-wide analytics and recent activity
- Quick access to **People**, **Teams**, and **Settings**
- Overview of all active meeting series

**If you are a manager:**
- Your upcoming and recent sessions with each direct report
- Action items that need attention
- Team-level trends and insights

**If you are a member:**
- Your next scheduled session and past session history
- Your open action items with due dates
- Personal trends across your sessions

## Next steps

- **Admins**: Invite your team from **People > Invite** and create meeting templates under **Templates**.
- **Managers**: Set up a meeting series with each report from the **Dashboard** by clicking **Create Series**.
- **Members**: Review any upcoming sessions and prepare your notes.
`,
  "en/getting-started/navigation": `1on1 uses a sidebar layout with a collapsible menu, a top bar for search and quick actions, and contextual panels that appear when needed.

![Sidebar navigation](sidebar-navigation.jpg)

## Sidebar menu

The sidebar is your primary way to move between sections. Click the hamburger icon at the top to collapse it into icons-only mode, giving you more space for content.

The menu items you see depend on your role:

| Section | Admin | Manager | Member |
|---|---|---|---|
| **Dashboard** | Yes | Yes | Yes |
| **Sessions** | Yes | Yes | Yes |
| **Action Items** | Yes | Yes | Yes |
| **Templates** | Yes | Yes | -- |
| **Analytics** | Yes | Yes | -- |
| **People** | Yes | Yes | -- |
| **Teams** | Yes | Yes | -- |
| **Settings** | Yes | -- | -- |

Members see a focused interface with only the sections relevant to their participation.

## Top bar

The top bar appears on every page and contains:

- **Search** -- Find sessions, people, action items, or templates by typing keywords. Results update as you type.
- **Notifications** -- A bell icon shows unread alerts for upcoming sessions, overdue action items, and admin announcements.
- **Profile menu** -- Access your account settings, switch language, or sign out.

## Quick actions

From the **Dashboard**, you can take common actions without navigating away:

- Click **Start Session** on any upcoming meeting card to launch the wizard.
- Click **Create Series** to set up a new recurring meeting.
- Click an action item to update its status or add a comment.

## Keyboard shortcuts

Press **?** on any page to see available keyboard shortcuts. Common ones include **S** to open search and **N** to start a new session.
`,
  "en/getting-started/overview": `1on1 helps you run structured one-on-one meetings that drive real outcomes. Instead of ad-hoc conversations, you follow a consistent format that builds trust, surfaces issues early, and tracks progress over time.

## What you can do

- **Run structured meetings** using questionnaire templates with scored questions, open-ended prompts, and rating scales. Every session follows the same format, so nothing falls through the cracks.

- **Track action items** that carry forward between sessions. Assign owners, set due dates, and review completion during your next meeting.

- **Get AI-powered insights** that surface trends, suggest talking points, and highlight areas that need attention based on past session data.

- **View analytics** across individuals and teams to spot patterns in engagement, sentiment, and follow-through over time.

![Dashboard overview](dashboard-overview.jpg)

## How it works

1. An admin or manager creates a **meeting series** that pairs a manager with a report and sets a recurring cadence.
2. Before each meeting, both participants can prepare notes and review past action items.
3. During the session, you walk through the template questions in a step-by-step **wizard**.
4. After the session, 1on1 generates a summary and tracks any new action items.

## Who uses it

- **Admins** set up the company account, manage users, and configure templates.
- **Managers** conduct meetings with their direct reports and review team analytics.
- **Members** participate in their meetings, track their action items, and review their own history.

Your experience in 1on1 depends on your role. The sidebar, available features, and data access all adapt accordingly.
`,
  "en/people/inviting": `Admins can invite new people to the organization by sending email invitations. Invited users receive a link to create their account and join the company workspace.

![Invite people](people-invite.jpg)

## Sending invitations

1. Navigate to **People** in the sidebar.
2. Click the **Invite** button in the top right.
3. Enter one or more email addresses. You can type them individually or paste a comma-separated list.
4. Select a **role** for the invited users (member or manager).
5. Optionally assign them to a **team**.
6. Click **Send invitations**.

Each person receives an email with a unique invitation link. The link expires after 7 days.

## Managing pending invitations

Below the people list, the **Pending invitations** section shows all invitations that have not yet been accepted.

For each pending invitation, you can:

- **Resend** -- send the invitation email again if the original was missed or expired.
- **Revoke** -- cancel the invitation so the link no longer works.

## What happens when someone accepts

When an invited person clicks the link and creates their account:

1. They are added to the organization with the role you assigned.
2. If you assigned them to a team, they appear in that team immediately.
3. Their manager can then create a meeting series with them and start scheduling sessions.

## Tips

- Double-check email addresses before sending. Invitations go to the exact address you enter.
- Invite people in batches when onboarding a new team -- you can enter multiple addresses at once.
- If someone does not receive the email, check their spam folder before resending.

Only admins can send invitations. Managers and members do not have access to this feature.
`,
  "en/people/managing": `The **People** page shows everyone in your organization. Managers see their direct reports. Admins see all users across the company.

![People](people-management.jpg)

## Browsing the directory

1. Click **People** in the sidebar.
2. Use the search bar to find someone by name or email.
3. Filter by role (admin, manager, or member) or by team using the filter controls.

## Viewing a person's profile

Click on any person to open their profile page. The profile includes:

- **Basic information** -- name, email, role, and team membership.
- **Session history** -- a list of all their completed one-on-one sessions, with dates and scores. Click any session to review its summary.
- **Action items** -- open and completed action items assigned to or by this person. You can filter by status.
- **Score overview** -- a compact chart showing their score trend over recent sessions.

## What you can do from a profile

- **Start a session** -- if you are this person's manager and have an active meeting series, you can launch a new session directly.
- **View analytics** -- jump to the person's full individual analytics report for deeper trend analysis.
- **Edit role** (admin only) -- change the person's role within the organization.

## Role-based visibility

- **Managers** see profiles for their direct reports only. Session data and action items are scoped to the series you manage together.
- **Admins** see all profiles and can access any person's session history, action items, and analytics.

Members do not have access to the People directory.
`,
  "en/sessions/history": `The session history page lets you look back at all completed 1:1 sessions. Use it to track progress, spot trends, and revisit past discussions.

![Session history](session-history.jpg)

## Accessing session history

Go to **Sessions** in the sidebar and click **History**. You see a list of all completed sessions you have access to, sorted by date (newest first).

## Filtering sessions

Use the filters at the top of the page to narrow results:

- **Date range** -- select a start and end date to view sessions from a specific period.
- **Person** -- filter by a specific team member to see only their sessions.
- **Score range** -- show only sessions where the overall score falls within a minimum and maximum value.

Filters can be combined. Click **Clear Filters** to reset.

## Viewing a past session

Click on any session in the list to open its detail page. You will see:

- All answers and notes from the session.
- The AI-generated summary (key takeaways, areas of concern, risk indicators).
- Action items that were created or updated during the session.

## Score trends

The history page includes a **score trend chart** that plots overall session scores over time. This helps you visualize how a person's engagement, satisfaction, or other tracked metrics evolve across sessions.

Hover over any data point to see the exact score and date.

## Who can see what

- **Members** see only their own session history.
- **Managers** see sessions for all their direct reports.
- **Admins** have access to all session history across the company.
`,
  "en/sessions/scheduling": `As a manager or admin, you create a **meeting series** to set up recurring 1:1s with a team member. Each series defines who you meet, how often, and which template to use.

## Creating a meeting series

1. Go to **Sessions** in the sidebar and click **New Series**.
2. Select the **team member** you want to meet with from the dropdown.
3. Choose a **cadence**: weekly, biweekly, or monthly.
4. Pick a **template** that defines the questions for each session. You can use a built-in template or one your team has created.
5. Click **Create Series** to save.

![Create series](session-create-form.jpg)

The series now appears on your dashboard. Sessions are generated automatically based on the cadence you chose.

## Starting a session

When a session is due, it appears on your dashboard with a **Start** button. Click it to open the meeting wizard and begin the 1:1.

## Resuming an in-progress session

If you leave a session before completing it, your progress is saved automatically. Return to the dashboard and click **Resume** to pick up where you left off.

## Changing the cadence or template

Open the series settings by clicking the three-dot menu on the series card and selecting **Edit Series**. Changes apply to future sessions only -- past sessions keep their original template.

## Who can create a series?

- **Admins** can create a series for any manager-report pair in the company.
- **Managers** can create a series with any of their direct reports.
- **Members** cannot create series but can view and participate in sessions assigned to them.
`,
  "en/sessions/summary": `After you complete a session, AI analyzes the answers and generates a structured summary. This page explains what the summary includes and how to use it.

![Session summary](session-summary.jpg)

## What the summary contains

### Key takeaways

A concise overview of the most important points discussed during the session, drawn from answers and notes across all categories.

### Areas of concern

Topics where scores dropped compared to previous sessions or where answers suggest potential issues. These help you spot problems early.

### Coaching suggestions (manager only)

Actionable recommendations for the manager based on the report's answers. These are only visible to the manager and are not shared with the team member.

### Risk indicators

Flags that highlight patterns worth monitoring, such as declining engagement, repeated blockers, or unresolved action items from past sessions.

## Viewing the summary

After completing a session, you are redirected to the summary page automatically. You can also access any past summary from **Sessions** > **History**, then clicking on a specific session.

## Email notifications

Both the manager and the report receive an email after a session is completed. The email includes:

- A link to the full session summary.
- The key takeaways section for quick reference.

Managers additionally receive the coaching suggestions in their email.

## Who can see what

- **Both participants** see key takeaways, areas of concern, and risk indicators.
- **Managers only** see coaching suggestions.
- **Admins** can view any session summary across the company.
`,
  "en/sessions/wizard": `The meeting wizard guides you through a 1:1 session step by step. Each step corresponds to a category from the session template.

![Meeting wizard](session-wizard.jpg)

## Wizard steps

### 1. Recap

The first step shows a summary of your previous session: key takeaways, open action items, and any follow-ups. Review these together before moving forward.

### 2. Category steps

Each subsequent step presents questions from a template category (e.g., "How are you feeling?", "Retrospective", "Work environment"). For each question:

- Select a score or type your answer, depending on the question type.
- Add **notes** using the rich text editor for additional context.
- Use **talking points** to flag topics you want to discuss during the meeting.

Your answers are saved automatically as you go. You can move between steps freely -- nothing is lost.

### 3. Summary

The final step shows an overview of all your answers. Review everything, then click **Complete Session** to finish. Once completed, AI generates a session summary.

## Context panel

Click the **layers icon** to open the sidebar context panel. It gives you quick access to:

- **Action items** -- create, view, and check off tasks without leaving the wizard.
- **AI nudges** -- real-time suggestions based on your answers so far.
- **Score trends** -- how this person's scores compare to previous sessions (visible when there are 2+ past sessions).

## Tips

- Both the manager and the report can fill in answers during the session.
- You can leave and resume a session at any time -- progress is saved automatically.
- Complete all steps before clicking **Complete Session** for the best AI summary.
`,
  "en/settings/audit-log": `The audit log records every significant action in your company account. Use it to monitor security events, track configuration changes, and investigate issues. Only admins can access the audit log.

![Audit log](settings-audit-log.jpg)

## What gets logged

The audit log captures actions across three categories:

- **Authentication** -- Logins, logouts, failed sign-in attempts, and password changes.
- **Data changes** -- Creating, updating, or deleting sessions, templates, action items, and user records.
- **Admin actions** -- Inviting users, changing roles, updating company settings, and modifying billing.

Each entry includes the timestamp, the user who performed the action, the action type, and the affected resource.

## Filter the log

Use the filters at the top of the page to narrow results:

1. **Action type** -- Select a category such as "login", "user.updated", or "session.created".
2. **User** -- Search for a specific user to see only their actions.
3. **Date range** -- Set a start and end date to focus on a specific period.

Click **Apply Filters** to update the results. Click **Clear** to reset all filters.

## Read a log entry

Each row shows:

- **Timestamp** -- When the action occurred, displayed in your timezone.
- **User** -- The person who performed the action, with their role.
- **Action** -- A description of what happened (e.g., "Updated template: Weekly Check-in").
- **IP address** -- The source IP, useful for identifying unusual access patterns.

Click a row to expand details, including the before-and-after values for data changes.

## Retention

Log entries are retained based on your plan. Pro plans keep 90 days of history. Enterprise plans offer extended retention.
`,
  "en/settings/billing": `The billing page lets admins manage the company subscription, view invoices, and update payment details. 1on1 uses Paddle for secure payment processing.

![Billing](settings-billing.jpg)

## View your current plan

Go to **Settings > Billing** to see your active plan, billing cycle, and the number of seats in use. The available plans are:

- **Free** -- Up to 3 users, core meeting features.
- **Starter** -- For small teams, includes templates and action item tracking.
- **Pro** -- Adds AI insights, advanced analytics, and priority support.
- **Enterprise** -- Custom pricing with SSO, dedicated support, and audit log retention.

## Upgrade or downgrade

1. On the **Billing** page, click **Change Plan**.
2. Select the plan you want to switch to.
3. Review the pricing summary and confirm.

Upgrades take effect immediately. Downgrades apply at the end of your current billing cycle. You keep access to higher-tier features until then.

## Manage payment method

1. Click **Payment Method** to open the Paddle management portal.
2. Update your card or switch to a different payment method.
3. Changes are saved automatically through Paddle.

## View invoices

Scroll to the **Payment History** section to see past invoices. Click any invoice to download a PDF receipt. Invoices are generated automatically at each billing cycle.

## Cancel your subscription

1. Click **Cancel Subscription** at the bottom of the billing page.
2. Confirm the cancellation.

Your account remains active until the end of the paid period. After that, it reverts to the Free plan.
`,
  "en/settings/company": `Company settings control the global defaults for your organization. Only admins can access this page.

![Company settings](settings-company.jpg)

## Change your company name

1. Go to **Settings > Company**.
2. Edit the **Company Name** field.
3. Click **Save Changes**.

The company name appears in email notifications, session headers, and exported reports.

## Select a color theme

1on1 supports multiple color themes that apply across the entire application for all users in your company.

1. Under **Appearance**, browse the available themes.
2. Click a theme to preview it.
3. Click **Save Changes** to apply the theme company-wide.

## Configure defaults

Use the defaults section to set baseline preferences for new users:

- **Timezone** -- Select the timezone used for scheduling sessions and displaying dates. Individual users can override this in their profile.
- **Language** -- Choose the default language (English or Romanian) for new users joining your company. Each user can change their own language preference from **Account > Profile**.

## When changes take effect

Company name and theme changes apply immediately for all users. Timezone and language defaults only affect users who have not set their own preferences.
`,
  "en/teams/overview": `Teams group people together under a manager. They provide structure for analytics, make it easier to track meeting health across a group, and help admins organize the company.

![Teams](teams-list.jpg)

## Viewing teams

1. Click **Teams** in the sidebar.
2. You see a list of all teams you have access to, with the manager name, member count, and a quick health indicator.

Admins see all teams in the organization. Managers see only the teams they manage.

## Creating a team

1. On the **Teams** page, click **Create team**.
2. Enter a **team name**.
3. Assign a **manager** from the people in your organization.
4. Add **members** by selecting from the directory.
5. Click **Save**.

The team is immediately available in analytics and filters across the application.

## Editing a team

1. Click on a team to open its detail page.
2. Click **Edit** to change the team name, manager, or members.
3. Add or remove members as needed.
4. Click **Save** to apply changes.

## Team detail page

The team detail page shows:

- **Members list** -- all people in the team with their roles and last session dates.
- **Team analytics** -- aggregated score trends, engagement rates, and action item completion for the team. This is the same data available in the team analytics report.
- **Recent sessions** -- a feed of the latest sessions conducted within the team.

## Deleting a team

Admins can delete a team from the team detail page by clicking **Delete team**. This removes the team grouping but does not delete any users, sessions, or meeting series. Historical analytics snapshots that reference the team are preserved.

Only admins can create, edit, or delete teams. Managers can view their own teams and access team-level analytics.
`,
  "en/templates/ai-editor": `The AI template editor generates a complete meeting template from a short description of your goals. Instead of building sections and questions manually, you describe what you want to achieve and the AI creates a ready-to-use structure.

![AI editor](template-ai-editor.jpg)

## How it works

1. Go to the **Templates** page and click **Create with AI**.
2. Describe your meeting goals in the text field. Be specific about the topics you want to cover, the tone of the meeting, and what outcomes matter to you.
3. Click **Generate**. The AI produces a complete template with sections, questions, and suggested answer types.
4. Review the result. You can use it as-is or make changes.

## Writing a good prompt

The more context you provide, the better the result. Include details like:

- The purpose of the meeting (weekly check-in, quarterly review, onboarding).
- Topics to cover (wellbeing, project progress, career development).
- The kind of data you want to collect (ratings, open feedback, yes/no checks).
- The tone (casual, formal, coaching-focused).

For example: "Weekly check-in focused on wellbeing, blockers, and progress toward quarterly goals. Include a mood scale and rating questions for analytics."

## Editing AI suggestions

After the AI generates the template, you are in the standard template editor. You can:

- Rename or remove sections.
- Edit question text and change answer types.
- Add new questions or sections that the AI missed.
- Reorder everything by dragging and dropping.

The AI gives you a starting point. Adjust it to fit your style and your team's needs.

## Regenerating

If the result does not match what you need, update your description and click **Generate** again. Each generation creates a fresh template based on your latest input.
`,
  "en/templates/creating": `Build a custom template to match the structure of your one-on-one meetings. You control the sections, questions, and answer types.

## Starting a new template

1. Go to the **Templates** page.
2. Click **Create template**.
3. Enter a **name** and optional **description** for your template.

![Create template](template-create.jpg)

## Adding sections

Sections group related questions together. To add a section:

1. Click **Add section**.
2. Give the section a name (e.g., "Wellbeing", "Goals", "Feedback").
3. Optionally add a description that explains the section's purpose to participants.

## Adding questions

Within each section, add the questions you want to ask:

1. Click **Add question** inside the target section.
2. Write your question text.
3. Select the **answer type**: free text, yes/no, rating 1-5, rating 1-10, or mood scale.
4. Mark the question as **required** or optional.

Choose answer types intentionally. Rating and mood questions produce numeric data that appears in analytics dashboards, while free text questions capture qualitative detail.

## Reordering

Drag and drop to rearrange both sections and questions within sections. The order you set here is the order participants see in the meeting wizard.

To move a section, grab its **drag handle** and drop it in the new position. Questions can be reordered the same way within their section.

## Editing and deleting

- Click any section or question to edit its text, answer type, or settings.
- Click the **delete** icon to remove a question or an entire section.

Deleting a section removes all its questions. This does not affect data from past sessions that used the template.

## Saving

Click **Save** when you are done. The template is immediately available for use in meeting series.
`,
  "en/templates/overview": `Templates define the structure of your one-on-one meetings. Each template contains sections with questions that guide the conversation through a consistent format.

![Templates](templates-list.jpg)

## Template library

The **Templates** page shows all templates available in your company. You can browse, preview, and select templates to use in your meeting series. Only managers and admins can create or edit templates.

## Template structure

A template is organized into **sections** (also called categories). Each section groups related questions together. For example, a template might have sections for "Recap", "Wellbeing", "Retrospective", and "Goals".

Each section contains one or more **questions**. Questions appear in order within their section, and sections appear in order within the template.

## Question types

Every question has an answer type that determines how the participant responds:

| Type | Description |
|---|---|
| **Free text** | Open-ended written response. |
| **Yes / No** | Simple binary choice. |
| **Rating 1-5** | Five-point scale for quick scoring. |
| **Rating 1-10** | Ten-point scale for more granular scoring. |
| **Mood scale** | Emotional state indicator. |

Numeric question types (ratings, mood) feed into analytics. Over time they reveal trends in engagement, satisfaction, and sentiment.

## Using a template

When you create a meeting series, you select a default template. That template is used for every session in the series unless you override it for a specific session.

You can change the template on a per-session basis before the session starts. This lets you run a different format for quarterly reviews or special topics without changing your regular cadence.

## Who can manage templates

Template creation and editing is restricted to **managers** and **admins**. Members participate in sessions but do not manage the templates themselves.
`,
  "ro/account/profile": `Profilul tau controleaza modul in care apari pentru ceilalti in 1on1 si preferintele tale personale. Toate rolurile pot accesa profilul din **Cont > Profil**.

![Profil](account-profile.jpg)

## Actualizeaza-ti numele

1. Mergi la **Cont > Profil**.
2. Editeaza campul **Nume Complet**.
3. Apasa **Salveaza Modificarile**.

Numele tau apare in rezumatele sesiunilor, punctele de actiune si notificarile trimise celorlalti participanti.

## Schimba-ti avatarul

1. Apasa pe avatarul tau curent sau pe imaginea placeholder.
2. Incarca o fotografie noua (JPG sau PNG, maxim 2 MB).
3. Avatarul se actualizeaza imediat in intreaga aplicatie.

## Seteaza-ti limba

1. In sectiunea **Preferinte**, deschide dropdown-ul **Limba**.
2. Selecteaza **Engleza** sau **Romana**.
3. Apasa **Salveaza Modificarile**.

Aceasta suprascrie valoarea implicita a companiei si se aplica intregii interfete, inclusiv notificarilor prin email.

## Configureaza notificarile

Sectiunea **Notificari** controleaza ce emailuri primesti:

- **Memento sesiuni** -- Primesti o notificare inainte de o sesiune viitoare.
- **Actualizari puncte de actiune** -- Primesti alerte cand punctele de actiune atribuite tie sunt create sau actualizate.
- **Emailuri rezumative** -- Primesti un rezumat dupa fiecare intalnire.

Activeaza sau dezactiveaza fiecare tip de notificare, apoi apasa **Salveaza Modificarile**.
`,
  "ro/account/security": `Pagina de securitate iti permite sa gestionezi parola si conturile de autentificare conectate. Mergi la **Cont > Securitate** pentru a accesa aceste setari.

![Securitate](account-security.jpg)

## Schimba-ti parola

1. Mergi la **Cont > Securitate**.
2. Introdu **parola curenta**.
3. Introdu **parola noua** si confirma-o.
4. Apasa **Actualizeaza Parola**.

Parola noua trebuie sa aiba cel putin 8 caractere. Foloseste o combinatie de litere, cifre si simboluri pentru o parola puternica.

## Conturi conectate

Poti asocia conturi externe pentru a te autentifica cu un singur click in loc sa introduci parola.

### Asociaza un cont

1. In sectiunea **Conturi Conectate**, apasa **Conecteaza** langa Google sau Microsoft.
2. Esti redirectionat catre pagina de autentificare a furnizorului.
3. Autorizeaza 1on1 sa acceseze informatiile tale de baza de profil.
4. Dupa autorizare, contul apare ca fiind conectat.

### Disociaza un cont

1. Gaseste contul conectat in sectiunea **Conturi Conectate**.
2. Apasa **Deconecteaza**.
3. Confirma actiunea.

Poti deconecta un cont OAuth doar daca ai o alta metoda de autentificare disponibila (parola sau alt cont conectat). Acest lucru previne pierderea accesului.

## Sesiuni active

Sectiunea **Sesiuni Active** afiseaza toate dispozitivele pe care esti autentificat in prezent. Daca observi o sesiune necunoscuta, apasa **Revoca** pentru a deconecta imediat acel dispozitiv.
`,
  "ro/action-items/managing": `Sarcinile sunt create in timpul sesiunilor si urmarite de la o intalnire la alta. Te ajuta sa transformi conversatia in actiuni concrete.

## Crearea unui action item

Creezi action items in timpul unei sesiuni, in wizard-ul de intalnire.

1. Deschide sectiunea **Action Items** din sidebar-ul wizard-ului.
2. Apasa **Add action item**.
3. Introdu un titlu clar si specific care descrie ce trebuie facut.
4. Alege un **responsabil** — fie managerul, fie raportul direct.
5. Seteaza o **data limita**. Alege o data inainte de sau la urmatoarea sesiune programata.
6. Apasa **Save**.

![Create action item](action-item-create.jpg)

Elementul este salvat imediat si legat de sesiunea curenta.

## Atribuirea catre persoane

Fiecare action item este atribuit unei singure persoane — fie managerul, fie raportul direct din acea serie de intalniri. Persoana responsabila trebuie sa finalizeze sarcina inainte de data limita.

Doar managerul poate crea si atribui action items in timpul unei sesiuni. Membrii pot vedea sarcinile atribuite lor si pot actualiza statusul.

## Setarea datelor limita

Alege o data limita realista. Sistemul evidentiaza sarcinile intarziate atat pe pagina de action items, cat si in wizard-ul de sesiune, deci termenele depasite sunt vizibile in urmatoarea intalnire.

## Marcarea ca finalizat

Pentru a actualiza statusul unui action item:

1. Mergi la pagina **Action Items** sau deschide wizard-ul de sesiune.
2. Gaseste elementul si apasa pe **dropdown-ul de status**.
3. Selecteaza **In Progress**, **Completed** sau **Cancelled**.

Schimbarile de status sunt inregistrate si vizibile in istoricul sesiunilor.

## Urmarirea intre sesiuni

Sarcinile deschise se reporteaza automat. Cand incepi o sesiune noua, wizard-ul arata toate sarcinile nerezolvate din intalnirile anterioare, astfel incat puteti revizui progresul impreuna.

Sarcinile finalizate raman in istoric pentru referinta, dar nu mai apar in lista activa.
`,
  "ro/action-items/overview": `Pagina **Action Items** iti ofera o vedere completa a tuturor sarcinilor create in cadrul sesiunilor tale de one-on-one. Foloseste-o ca sa te asiguri ca nimic nu e uitat intre intalniri.

![Action items](action-items-list.jpg)

## Ce vezi pe aceasta pagina

Pagina listeaza toate sarcinile care te privesc. Fiecare element arata titlul, persoana responsabila, data limita si statusul curent.

- **Atribuite mie** — sarcini de care esti responsabil.
- **Atribuite de mine** — sarcini pe care le-ai creat si le-ai atribuit altcuiva. Vizibil doar pentru manageri si admini.

Comuta intre aceste vizualizari folosind taburile din partea de sus a paginii.

## Filtrare si sortare

Foloseste filtrele pentru a restrange lista:

1. **Status** — filtreaza dupa **Open**, **In Progress**, **Completed** sau **Cancelled**.
2. **Data limita** — arata sarcinile scadente azi, saptamana aceasta, intarziate sau intr-un interval personalizat.
3. **Serie de intalniri** — arata sarcinile dintr-o anumita pereche de one-on-one.

Apasa pe orice antet de coloana pentru a sorta lista dupa acel camp.

## Semnificatia statusurilor

| Status | Semnificatie |
|---|---|
| **Open** | Nou creat, inca neinceput. |
| **In Progress** | Lucrul a inceput. |
| **Completed** | Finalizat. Marcat ca terminat de persoana responsabila. |
| **Cancelled** | Nu mai este relevant. |

## Actiuni rapide

Din lista de action items poti:

- Sa apesi pe un element pentru a vedea detaliile si sesiunea in care a fost creat.
- Sa schimbi statusul direct din lista folosind dropdown-ul de status.
- Sa editezi data limita sau titlul inline.

Sarcinile intarziate sunt evidentiate pentru a le observa rapid. Verifica aceasta pagina inainte de fiecare sesiune ca sa te pregatesti pentru urmatoarea intalnire.
`,
  "ro/analytics/dashboard": `Panoul de analitice iti ofera o imagine de ansamblu asupra intalnirilor one-on-one din echipa ta. Poti identifica tendinte, observa zone care necesita atentie si urmari nivelul de implicare in timp.

![Analytics](analytics-dashboard.jpg)

## Metrici principale

In partea de sus a panoului gasesti cateva metrici esentiale:

- **Scor mediu** -- media scorurilor pe sesiuni pentru toti subordonatii tai, cu un indicator de tendinta.
- **Rata de implicare** -- procentul de sesiuni programate care au fost efectiv finalizate.
- **Finalizare actiuni** -- cate actiuni atribuite au fost inchise inainte de urmatoarea sesiune.
- **Sesiuni in perioada** -- numarul total de sesiuni desfasurate in intervalul selectat.

## Graficul de tendinte

Graficul principal afiseaza evolutia scorurilor medii pe sesiuni in timp. Poti filtra dupa:

1. Selecteaza un **interval de timp** (ultimele 30 de zile, 90 de zile, 6 luni sau 1 an) din meniul dropdown.
2. Comuta intre **toti subordonatii** sau o persoana specifica folosind filtrele.
3. Treci cu mouse-ul peste un punct din grafic pentru a vedea scorul exact si data sesiunii.

## Cum folosesti panoul

1. Navigheaza la **Analitice** din bara laterala.
2. Verifica cardurile cu metrici din partea de sus pentru o evaluare rapida.
3. Foloseste graficul de tendinte pentru a identifica evolutii ascendente sau descendente.
4. Apasa pe numele unei persoane din tabelul detaliat pentru a accesa raportul individual.

## Ce sa urmaresti

Scorurile in scadere pe mai multe sesiuni pot indica dezangajare sau probleme nerezolvate. O rata scazuta de finalizare a actiunilor inseamna ca follow-up-ul necesita atentie. Ratele ridicate de implicare confirma ca frecventa intalnirilor este potrivita.

Adminii vad datele pentru intreaga organizatie. Managerii vad doar datele subordonatilor directi.
`,
  "ro/analytics/individual": `Rapoartele individuale arata istoricul de sesiuni, tendintele scorurilor si metricile de implicare ale unei persoane. Foloseste-le pentru a te pregati de urmatoarea sesiune sau pentru a vedea cum evolueaza cineva in timp.

![Individual analytics](analytics-individual.jpg)

## Cum accesezi un raport individual

1. Navigheaza la **Analitice** din bara laterala.
2. Apasa pe numele unei persoane din tabelul de pe panou, sau mergi la **Persoane** si selecteaza **Vezi analitice** din profilul acesteia.
3. Raportul se incarca cu istoricul complet si metricile persoanei.

## Ce contine raportul

- **Tendinta scorurilor** -- un grafic care arata cum au evoluat scorurile pe sesiuni in timp. Urmareste scaderile sau imbunatatirile sustinute.
- **Istoricul sesiunilor** -- o lista cu toate sesiunile finalizate, incluzand date, scoruri si template-ul folosit. Apasa pe orice sesiune pentru a-i vedea rezumatul.
- **Metrici de implicare** -- rata de finalizare a sesiunilor programate, timp mediu de pregatire si consistenta raspunsurilor.
- **Actiuni** -- o defalcare a actiunilor atribuite vs. finalizate, cu procentul de finalizare la timp.

## Filtrare si intervale de timp

Foloseste selectorul de interval pentru a restringe vizualizarea la o perioada specifica. Toate graficele si metricile de pe pagina se ajusteaza automat.

## Utilizari practice

- **Inainte de o sesiune**: verifica scorurile recente si actiunile deschise pentru a putea discuta tendintele direct.
- **In cadrul evaluarilor**: refera-te la tendintele pe termen lung si la datele de implicare pentru a sustine conversatiile cu date concrete.
- **Identificarea problemelor devreme**: o scadere brusca a scorului sau sesiuni ratate pot semnala probleme inainte ca acestea sa escaladeze.

Adminii pot vedea rapoartele individuale ale oricui din organizatie. Managerii pot vedea doar rapoartele subordonatilor directi.
`,
  "ro/analytics/team": `Rapoartele de echipa agrega datele intalnirilor pentru toti membrii unei echipe, oferindu-ti o perspectiva de ansamblu asupra sanatatii si nivelului de implicare al echipei.

![Team analytics](analytics-team.jpg)

## Cum accesezi un raport de echipa

1. Navigheaza la **Analitice** din bara laterala.
2. Selecteaza tab-ul **Echipa**.
3. Alege o echipa din meniul dropdown pentru a-i incarca raportul.

## Metrici la nivel de echipa

Raportul afiseaza date agregate pentru echipa selectata:

- **Scor mediu al echipei** -- media scorurilor pe sesiuni pentru toti membrii echipei, cu o linie de tendinta.
- **Rata de implicare** -- procentul de sesiuni programate finalizate de membrii echipei.
- **Finalizare actiuni** -- rata agregata de finalizare a tuturor actiunilor atribuite in cadrul echipei.
- **Numar de membri** -- cati membri activi are echipa.

## Compararea membrilor

Tabelul comparativ listeaza fiecare membru al echipei alaturi de metricile sale individuale. Acest lucru te ajuta sa identifici:

- Membrii ale caror scoruri evolueaza diferit fata de media echipei.
- Diferente in implicare sau urmarirea actiunilor.
- Cine ar putea avea nevoie de mai multa atentie sau de o abordare diferita.

Poti sorta tabelul dupa orice coloana pentru a gasi rapid cazurile atipice.

## Cum folosesti rapoartele de echipa eficient

1. Verifica raportul de echipa saptamanal sau la doua saptamani pentru a fi la curent cu tendintele.
2. Compara media echipei cu scorurile individuale pentru a identifica persoane care ar putea avea dificultati.
3. Foloseste rata de implicare pentru a evalua daca frecventa intalnirilor este potrivita.
4. Impartaseste concluziile generale in sedintele de echipa pentru a intari responsabilitatea.

Adminii pot vedea rapoartele oricarei echipe. Managerii vad doar rapoartele echipelor pe care le conduc.
`,
  "ro/getting-started/first-login": `Dupa ce primesti email-ul de invitatie, da click pe link pentru a accesa 1on1 prima data. Iata la ce sa te astepti.

![Pagina de autentificare](login-page.jpg)

## Verificarea email-ului

1. Deschide email-ul de invitatie primit de la adminul companiei.
2. Da click pe **Accepta Invitatia** pentru a deschide pagina de login.
3. Autentifica-te cu adresa ta de email. Vei primi un cod de verificare -- introdu-l pentru a finaliza autentificarea.

## Configureaza-ti profilul

La prima autentificare, ti se cere sa completezi profilul:

1. Adauga **numele complet** si optional incarca o fotografie de profil.
2. Alege **limba** preferata (engleza sau romana).
3. Da click pe **Salveaza** pentru a continua catre dashboard.

Poti modifica aceste setari oricand din **Cont > Profil**.

## Intelege dashboard-ul

Ce vezi pe **Dashboard** depinde de rolul tau.

**Daca esti admin:**
- Analize la nivel de companie si activitate recenta
- Acces rapid la **Persoane**, **Echipe** si **Setari**
- Toate seriile de intalniri active

**Daca esti manager:**
- Sesiunile viitoare si recente cu fiecare raport direct
- Actiunile care necesita atentie
- Tendinte si recomandari la nivel de echipa

**Daca esti membru:**
- Urmatoarea sesiune programata si istoricul sesiunilor
- Actiunile tale deschise cu termenele aferente
- Tendinte personale de-a lungul sesiunilor

## Pasii urmatori

- **Admini**: Invita echipa din **Persoane > Invita** si creeaza template-uri in **Template-uri**.
- **Manageri**: Seteaza o serie de intalniri cu fiecare raport direct din **Dashboard**, prin click pe **Creeaza Serie**.
- **Membri**: Verifica sesiunile viitoare si pregateste-ti notele.
`,
  "ro/getting-started/navigation": `1on1 foloseste un layout cu meniu lateral pliabil, o bara superioara pentru cautare si actiuni rapide, si panouri contextuale care apar cand e nevoie.

![Navigare meniu lateral](sidebar-navigation.jpg)

## Meniul lateral

Meniul lateral e principalul mod de a naviga intre sectiuni. Da click pe iconita de meniu din colt pentru a-l restrange la mod iconite, eliberand spatiu pentru continut.

Ce vezi in meniu depinde de rolul tau:

| Sectiune | Admin | Manager | Membru |
|---|---|---|---|
| **Dashboard** | Da | Da | Da |
| **Sesiuni** | Da | Da | Da |
| **Actiuni** | Da | Da | Da |
| **Template-uri** | Da | Da | -- |
| **Analize** | Da | Da | -- |
| **Persoane** | Da | Da | -- |
| **Echipe** | Da | Da | -- |
| **Setari** | Da | -- | -- |

Membrii vad o interfata focalizata, doar cu sectiunile relevante pentru participarea lor.

## Bara superioara

Bara superioara apare pe fiecare pagina si contine:

- **Cautare** -- Gaseste sesiuni, persoane, actiuni sau template-uri tastand cuvinte cheie. Rezultatele se actualizeaza pe masura ce scrii.
- **Notificari** -- O iconita de clopot afiseaza alertele necitite pentru sesiuni viitoare, actiuni intarziate si anunturi de la admin.
- **Meniul de profil** -- Acceseaza setarile contului, schimba limba sau deconecteaza-te.

## Actiuni rapide

Din **Dashboard** poti face actiuni frecvente fara sa navighezi in alta parte:

- Da click pe **Incepe Sesiunea** pe orice card de intalnire viitoare pentru a lansa wizard-ul.
- Da click pe **Creeaza Serie** pentru a configura o noua intalnire recurenta.
- Da click pe o actiune pentru a-i actualiza statusul sau a adauga un comentariu.

## Scurtaturi de tastatura

Apasa **?** pe orice pagina pentru a vedea scurtaturile disponibile. Cele mai folosite: **S** pentru cautare si **N** pentru o sesiune noua.
`,
  "ro/getting-started/overview": `1on1 te ajuta sa conduci intalniri one-on-one structurate care duc la rezultate concrete. In loc de conversatii ad-hoc, urmezi un format consistent care construieste incredere, scoate la suprafata problemele devreme si urmareste progresul in timp.

## Ce poti face

- **Conduci intalniri structurate** folosind template-uri cu intrebari notate, prompturi deschise si scale de evaluare. Fiecare sesiune urmeaza acelasi format, asa ca nimic nu scapa.

- **Urmaresti actiunile** care se pastreaza intre sesiuni. Atribui responsabili, setezi termene si verifici progresul la urmatoarea intalnire.

- **Primesti recomandari AI** care identifica tendinte, sugereaza subiecte de discutie si evidentiaza zonele care necesita atentie, pe baza datelor din sesiunile anterioare.

- **Vizualizezi analize** la nivel individual si de echipa, pentru a observa tendinte in implicare, sentiment si respectarea angajamentelor.

![Prezentare generala Dashboard](dashboard-overview.jpg)

## Cum functioneaza

1. Un admin sau manager creeaza o **serie de intalniri** care asociaza un manager cu un raport direct si seteaza o cadenta recurenta.
2. Inainte de fiecare intalnire, ambii participanti pot pregati note si revizui actiunile anterioare.
3. In timpul sesiunii, parcurgi intrebarile din template pas cu pas, intr-un **wizard** interactiv.
4. Dupa sesiune, 1on1 genereaza un rezumat si inregistreaza noile actiuni.

## Cine foloseste platforma

- **Adminii** configureaza contul companiei, gestioneaza utilizatorii si seteaza template-urile.
- **Managerii** conduc intalnirile cu raportii lor directi si analizeaza datele echipei.
- **Membrii** participa la intalniri, isi urmaresc actiunile si revizuiesc istoricul propriu.

Ce vezi in 1on1 depinde de rolul tau. Meniul lateral, functiile disponibile si accesul la date se adapteaza automat.
`,
  "ro/people/inviting": `Administratorii pot invita persoane noi în organizație trimițând invitații pe email. Persoanele invitate primesc un link pentru a-și crea contul și a se alătura spațiului de lucru.

![Invită persoane](people-invite.jpg)

## Trimiterea invitațiilor

1. Navighează la **Persoane** din bara laterală.
2. Apasă butonul **Invită** din dreapta sus.
3. Introdu una sau mai multe adrese de email. Poți să le tastezi individual sau să lipești o listă separată prin virgulă.
4. Selectează un **rol** pentru utilizatorii invitați (membru sau manager).
5. Opțional, atribuie-i unui **echipe**.
6. Apasă **Trimite invitațiile**.

Fiecare persoană primește un email cu un link unic de invitație. Linkul expiră după 7 zile.

## Gestionarea invitațiilor în așteptare

Sub lista de persoane, secțiunea **Invitații în așteptare** arată toate invitațiile care nu au fost încă acceptate.

Pentru fiecare invitație poți:

- **Retrimite** -- trimite din nou emailul dacă cel original a fost ratat sau a expirat.
- **Revocă** -- anulează invitația astfel încât linkul să nu mai funcționeze.

## Ce se întâmplă când cineva acceptă

Când o persoană invitată apasă linkul și își creează contul:

1. Este adăugată în organizație cu rolul pe care l-ai atribuit.
2. Dacă ai atribuit-o unei echipe, apare imediat în acea echipă.
3. Managerul poate apoi să creeze o serie de ședințe cu ea și să înceapă programarea.

## Sfaturi

- Verifică adresele de email înainte de trimitere. Invitațiile ajung exact la adresa introdusă.
- Invită persoanele în grup când integrezi o echipă nouă -- poți introduce mai multe adrese simultan.
- Dacă cineva nu primește emailul, verifică folderul de spam înainte de a retrimite.

Doar administratorii pot trimite invitații. Managerii și membrii nu au acces la această funcție.
`,
  "ro/people/managing": `Pagina **Persoane** afiseaza toti utilizatorii din organizatia ta. Managerii isi vad subordonatii directi. Adminii vad toate persoanele din companie.

![People](people-management.jpg)

## Navigarea in director

1. Apasa pe **Persoane** in bara laterala.
2. Foloseste bara de cautare pentru a gasi pe cineva dupa nume sau email.
3. Filtreaza dupa rol (admin, manager sau membru) sau dupa echipa folosind controalele de filtrare.

## Vizualizarea profilului unei persoane

Apasa pe orice persoana pentru a-i deschide pagina de profil. Profilul include:

- **Informatii de baza** -- nume, email, rol si apartenenta la echipe.
- **Istoricul sesiunilor** -- o lista cu toate sesiunile finalizate, cu date si scoruri. Apasa pe orice sesiune pentru a-i vedea rezumatul.
- **Actiuni** -- actiuni deschise si finalizate atribuite acestei persoane sau de catre aceasta. Poti filtra dupa status.
- **Sumar scoruri** -- un grafic compact care arata tendinta scorurilor pe sesiunile recente.

## Ce poti face din profil

- **Incepe o sesiune** -- daca esti managerul acestei persoane si ai o serie de intalniri activa, poti lansa o sesiune noua direct.
- **Vezi analitice** -- acceseaza raportul complet de analitice individuale pentru o analiza mai detaliata.
- **Editeaza rolul** (doar admin) -- schimba rolul persoanei in cadrul organizatiei.

## Vizibilitate in functie de rol

- **Managerii** vad profilurile subordonatilor directi. Datele de sesiuni si actiuni sunt limitate la seriile pe care le gestionati impreuna.
- **Adminii** vad toate profilurile si pot accesa istoricul de sesiuni, actiuni si analitice al oricarei persoane.

Membrii nu au acces la directorul de persoane.
`,
  "ro/sessions/history": `Pagina de istoric iti permite sa revezi toate sesiunile 1:1 finalizate. Foloseste-o pentru a urmari progresul, a identifica tendinte si a revizita discutii din trecut.

![Session history](session-history.jpg)

## Accesarea istoricului

Mergi la **Sesiuni** in bara laterala si apasa **Istoric**. Vezi o lista cu toate sesiunile finalizate la care ai acces, ordonate dupa data (cele mai recente primele).

## Filtrarea sesiunilor

Foloseste filtrele din partea de sus a paginii pentru a restrange rezultatele:

- **Interval de date** -- selecteaza o data de inceput si una de sfarsit pentru a vedea sesiunile dintr-o anumita perioada.
- **Persoana** -- filtreaza dupa un anumit coleg pentru a vedea doar sesiunile lui.
- **Interval de scor** -- afiseaza doar sesiunile cu scorul general intr-un interval minim-maxim.

Filtrele se pot combina. Apasa **Sterge Filtrele** pentru a reseta.

## Vizualizarea unei sesiuni trecute

Apasa pe orice sesiune din lista pentru a deschide pagina de detalii. Vei vedea:

- Toate raspunsurile si notele din sesiune.
- Rezumatul generat de AI (concluzii principale, zone de atentie, indicatori de risc).
- Actiunile create sau actualizate in timpul sesiunii.

## Tendinte de scor

Pagina de istoric include un **grafic de tendinta a scorurilor** care traseaza scorurile generale pe o axa temporala. Te ajuta sa vizualizezi cum evolueaza implicarea, satisfactia sau alte metrici urmarite de la o sesiune la alta.

Treci cu mouse-ul peste orice punct pentru a vedea scorul exact si data.

## Cine vede ce

- **Membrii** vad doar istoricul propriilor sesiuni.
- **Managerii** vad sesiunile tuturor subordonatilor directi.
- **Adminii** au acces la tot istoricul de sesiuni din companie.
`,
  "ro/sessions/scheduling": `Ca manager sau admin, creezi un **serie de întâlniri** pentru a stabili 1:1-uri recurente cu un coleg. Fiecare series defineste cu cine te intalnesti, cat de des si ce template folosesti.

## Crearea unui serie de întâlniri

1. Mergi la **Sesiuni** in bara laterala si apasa **Serie noua**.
2. Selecteaza **colegul** cu care vrei sa te intalnesti.
3. Alege o **cadenta**: saptamanal, la doua saptamani sau lunar.
4. Alege un **template** care defineste intrebarile pentru fiecare sesiune. Poti folosi un template predefinit sau unul creat de echipa ta.
5. Apasa **Creeaza Serie** pentru a salva.

![Create series](session-create-form.jpg)

Seria apare acum pe dashboard. Sesiunile se genereaza automat pe baza cadentei alese.

## Pornirea unei sesiuni

Cand o sesiune este programata, apare pe dashboard cu butonul **Start**. Apasa pe el pentru a deschide wizard-ul si a incepe intalnirea.

## Reluarea unei sesiuni in curs

Daca parasesti o sesiune inainte de a o finaliza, progresul se salveaza automat. Revino pe dashboard si apasa **Reia** pentru a continua de unde ai ramas.

## Schimbarea cadentei sau template-ului

Deschide setarile seriei prin meniul cu trei puncte de pe cardul seriei si selecteaza **Editeaza Serie**. Modificarile se aplica doar sesiunilor viitoare -- sesiunile trecute pastreaza template-ul original.

## Cine poate crea un series?

- **Adminii** pot crea un series pentru orice pereche manager-subordonat din companie.
- **Managerii** pot crea un series cu oricare dintre subordonatii lor directi.
- **Membrii** nu pot crea serii, dar pot vedea si participa la sesiunile in care sunt inclusi.
`,
  "ro/sessions/summary": `Dupa ce finalizezi o sesiune, AI-ul analizeaza raspunsurile si genereaza un rezumat structurat. Aici afli ce contine si cum il folosesti.

![Session summary](session-summary.jpg)

## Ce contine rezumatul

### Concluzii principale

O sinteza a celor mai importante puncte discutate in sesiune, extrase din raspunsuri si note de la toate categoriile.

### Zone de atentie

Subiecte unde scorurile au scazut fata de sesiunile anterioare sau unde raspunsurile sugereaza posibile probleme. Te ajuta sa identifici problemele din timp.

### Sugestii de coaching (doar pentru manager)

Recomandari concrete pentru manager bazate pe raspunsurile subordonatului. Sunt vizibile doar pentru manager si nu sunt impartasite cu membrul echipei.

### Indicatori de risc

Semnale care evidentiaza tipare ce merita monitorizate, cum ar fi scaderea implicarii, blocaje repetate sau actiuni nerezolvate din sesiunile anterioare.

## Vizualizarea rezumatului

Dupa finalizarea sesiunii, esti redirectionat automat catre pagina de rezumat. Poti accesa orice rezumat din trecut din **Sesiuni** > **Istoric**, apoi apasand pe sesiunea dorita.

## Notificari prin email

Atat managerul cat si subordonatul primesc un email dupa finalizarea sesiunii. Emailul include:

- Un link catre rezumatul complet al sesiunii.
- Sectiunea cu concluzii principale pentru referinta rapida.

Managerii primesc suplimentar sugestiile de coaching in email.

## Cine vede ce

- **Ambii participanti** vad concluziile principale, zonele de atentie si indicatorii de risc.
- **Doar managerii** vad sugestiile de coaching.
- **Adminii** pot vizualiza orice rezumat de sesiune din companie.
`,
  "ro/sessions/wizard": `Wizard-ul te ghideaza pas cu pas printr-o sesiune 1:1. Fiecare pas corespunde unei categorii din template-ul sesiunii.

![Meeting wizard](session-wizard.jpg)

## Pasii wizard-ului

### 1. Recapitulare

Primul pas arata un rezumat al sesiunii anterioare: concluzii principale, actiuni deschise si follow-up-uri. Treceti-le in revista impreuna inainte de a continua.

### 2. Pasi pe categorii

Fiecare pas urmator prezinta intrebari dintr-o categorie a template-ului (de ex. "Cum te simti?", "Retrospectiva", "Mediul de lucru"). Pentru fiecare intrebare:

- Selecteaza un scor sau scrie raspunsul, in functie de tipul intrebarii.
- Adauga **note** folosind editorul de text pentru context suplimentar.
- Foloseste **punctele de discutie** pentru a marca subiecte pe care vrei sa le abordezi in intalnire.

Raspunsurile se salveaza automat pe masura ce completezi. Poti naviga liber intre pasi -- nu se pierde nimic.

### 3. Sumar

Ultimul pas arata o privire de ansamblu asupra tuturor raspunsurilor. Revizuieste totul, apoi apasa **Finalizeaza Sesiunea**. Dupa finalizare, AI-ul genereaza un rezumat al sesiunii.

## Panoul contextual

Apasa **iconita de straturi** pentru a deschide panoul lateral. Aici ai acces rapid la:

- **Actiuni** -- creeaza, vizualizeaza si bifeaza sarcini fara sa parasesti wizard-ul.
- **Sugestii AI** -- recomandari in timp real pe baza raspunsurilor de pana acum.
- **Tendinte scoruri** -- cum se compara scorurile persoanei cu sesiunile anterioare (vizibil cand exista 2+ sesiuni trecute).

## Sfaturi

- Atat managerul cat si subordonatul pot completa raspunsuri in timpul sesiunii.
- Poti parasi si relua o sesiune oricand -- progresul se salveaza automat.
- Completeaza toti pasii inainte de a apasa **Finalizeaza Sesiunea** pentru cel mai bun rezumat AI.
`,
  "ro/settings/audit-log": `Jurnalul de audit inregistreaza fiecare actiune semnificativa din contul companiei tale. Foloseste-l pentru a monitoriza evenimentele de securitate, a urmari modificarile de configurare si a investiga probleme. Doar administratorii au acces la jurnalul de audit.

![Jurnal de audit](settings-audit-log.jpg)

## Ce se inregistreaza

Jurnalul de audit captureaza actiuni din trei categorii:

- **Autentificare** -- Conectari, deconectari, incercari esuate de autentificare si schimbari de parola.
- **Modificari de date** -- Crearea, actualizarea sau stergerea sesiunilor, sabloanelor, punctelor de actiune si inregistrarilor de utilizatori.
- **Actiuni administrative** -- Invitarea utilizatorilor, schimbarea rolurilor, actualizarea setarilor companiei si modificarea facturarii.

Fiecare inregistrare include marca temporala, utilizatorul care a efectuat actiunea, tipul actiunii si resursa afectata.

## Filtreaza jurnalul

Foloseste filtrele din partea de sus a paginii pentru a restrange rezultatele:

1. **Tip actiune** -- Selecteaza o categorie precum "login", "user.updated" sau "session.created".
2. **Utilizator** -- Cauta un utilizator specific pentru a vedea doar actiunile lui.
3. **Interval de date** -- Seteaza o data de inceput si de sfarsit pentru a te concentra pe o anumita perioada.

Apasa **Aplica Filtrele** pentru a actualiza rezultatele. Apasa **Sterge** pentru a reseta toate filtrele.

## Citeste o inregistrare

Fiecare rand afiseaza:

- **Marca temporala** -- Cand a avut loc actiunea, afisata in fusul tau orar.
- **Utilizator** -- Persoana care a efectuat actiunea, impreuna cu rolul ei.
- **Actiune** -- O descriere a ceea ce s-a intamplat (de ex. "A actualizat sablonul: Check-in Saptamanal").
- **Adresa IP** -- IP-ul sursa, util pentru identificarea tiparelor de acces neobisnuite.

Apasa pe un rand pentru a extinde detaliile, inclusiv valorile dinainte si de dupa pentru modificarile de date.

## Retentie

Inregistrarile din jurnal sunt pastrate in functie de planul tau. Planurile Pro pastreaza 90 de zile de istoric. Planurile Enterprise ofera retentie extinsa.
`,
  "ro/settings/billing": `Pagina de facturare permite administratorilor sa gestioneze abonamentul companiei, sa vizualizeze facturile si sa actualizeze datele de plata. 1on1 foloseste Paddle pentru procesarea securizata a platilor.

![Facturare](settings-billing.jpg)

## Vizualizeaza planul curent

Mergi la **Setari > Facturare** pentru a vedea planul activ, ciclul de facturare si numarul de locuri utilizate. Planurile disponibile sunt:

- **Free** -- Pana la 3 utilizatori, functionalitati de baza pentru intalniri.
- **Starter** -- Pentru echipe mici, include sabloane si urmarirea punctelor de actiune.
- **Pro** -- Adauga informatii AI, analize avansate si suport prioritar.
- **Enterprise** -- Pret personalizat cu SSO, suport dedicat si retentie extinsa a jurnalului de audit.

## Upgrade sau downgrade

1. Pe pagina **Facturare**, apasa **Schimba Planul**.
2. Selecteaza planul dorit.
3. Verifica rezumatul pretului si confirma.

Upgrade-urile se aplica imediat. Downgrade-urile se aplica la sfarsitul ciclului de facturare curent. Pastrezi accesul la functiile planului superior pana atunci.

## Gestioneaza metoda de plata

1. Apasa **Metoda de Plata** pentru a deschide portalul Paddle.
2. Actualizeaza cardul sau schimba metoda de plata.
3. Modificarile se salveaza automat prin Paddle.

## Vizualizeaza facturile

Deruleaza pana la sectiunea **Istoric Plati** pentru a vedea facturile anterioare. Apasa pe orice factura pentru a descarca o chitanta PDF. Facturile se genereaza automat la fiecare ciclu de facturare.

## Anuleaza abonamentul

1. Apasa **Anuleaza Abonamentul** in partea de jos a paginii de facturare.
2. Confirma anularea.

Contul ramane activ pana la sfarsitul perioadei platite. Dupa aceea, revine la planul Free.
`,
  "ro/settings/company": `Setarile companiei controleaza valorile implicite pentru intreaga organizatie. Doar administratorii au acces la aceasta pagina.

![Setari companie](settings-company.jpg)

## Schimba numele companiei

1. Mergi la **Setari > Companie**.
2. Editeaza campul **Nume Companie**.
3. Apasa **Salveaza Modificarile**.

Numele companiei apare in notificarile prin email, in antetul sesiunilor si in rapoartele exportate.

## Alege o tema de culori

1on1 suporta mai multe teme de culori care se aplica in intreaga aplicatie pentru toti utilizatorii din companie.

1. In sectiunea **Aspect**, rasfoieste temele disponibile.
2. Apasa pe o tema pentru a o previzualiza.
3. Apasa **Salveaza Modificarile** pentru a aplica tema la nivel de companie.

## Configureaza valorile implicite

Foloseste sectiunea de valori implicite pentru a seta preferintele de baza pentru utilizatorii noi:

- **Fus orar** -- Selecteaza fusul orar folosit pentru programarea sesiunilor si afisarea datelor. Utilizatorii individuali pot suprascrie aceasta setare din profilul lor.
- **Limba** -- Alege limba implicita (engleza sau romana) pentru utilizatorii noi care se alatura companiei. Fiecare utilizator isi poate schimba preferinta de limba din **Cont > Profil**.

## Cand se aplica modificarile

Schimbarile de nume si tema se aplica imediat pentru toti utilizatorii. Valorile implicite pentru fus orar si limba afecteaza doar utilizatorii care nu si-au setat propriile preferinte.
`,
  "ro/teams/overview": `Echipele grupează persoanele sub un manager. Oferă structură pentru analize, facilitează urmărirea stării ședințelor și ajută administratorii să organizeze compania.

![Echipe](teams-list.jpg)

## Vizualizarea echipelor

1. Apasă pe **Echipe** din bara laterală.
2. Vei vedea o listă cu toate echipele accesibile, cu numele managerului, numărul de membri și un indicator rapid de sănătate.

Administratorii văd toate echipele din organizație. Managerii văd doar echipele pe care le conduc.

## Crearea unei echipe

1. Pe pagina **Echipe**, apasă **Creează echipă**.
2. Introdu un **nume de echipă**.
3. Atribuie un **manager** din persoanele din organizație.
4. Adaugă **membri** selectând din director.
5. Apasă **Salvează**.

Echipa este imediat disponibilă în analize și filtre în toată aplicația.

## Editarea unei echipe

1. Apasă pe o echipă pentru a deschide pagina de detalii.
2. Apasă **Editează** pentru a schimba numele, managerul sau membrii.
3. Adaugă sau elimină membri după necesitate.
4. Apasă **Salvează** pentru a aplica modificările.

## Pagina de detalii a echipei

Pagina de detalii afișează:

- **Lista membrilor** -- toți membrii echipei cu rolurile lor și datele ultimelor sesiuni.
- **Analize de echipă** -- tendințe agregate de scor, rate de implicare și finalizare a acțiunilor.
- **Sesiuni recente** -- un flux cu ultimele sesiuni din echipă.

## Ștergerea unei echipe

Administratorii pot șterge o echipă apăsând **Șterge echipa**. Aceasta elimină gruparea dar nu șterge utilizatorii, sesiunile sau seriile de ședințe.

Doar administratorii pot crea, edita sau șterge echipe. Managerii pot vizualiza propriile echipe și accesa analizele de echipă.
`,
  "ro/templates/ai-editor": `Editorul AI genereaza un template complet de intalnire pornind de la o scurta descriere a obiectivelor tale. In loc sa construiesti sectiuni si intrebari manual, descrii ce vrei sa obtii si AI-ul creeaza o structura gata de utilizare.

![AI editor](template-ai-editor.jpg)

## Cum functioneaza

1. Mergi la pagina **Templates** si apasa **Create with AI**.
2. Descrie obiectivele intalniri in campul de text. Fii specific despre subiectele pe care vrei sa le acoperi, tonul intalniri si ce rezultate conteaza pentru tine.
3. Apasa **Generate**. AI-ul produce un template complet cu sectiuni, intrebari si tipuri de raspunsuri sugerate.
4. Revizuieste rezultatul. Il poti folosi ca atare sau poti face modificari.

## Scrierea unui prompt bun

Cu cat oferi mai mult context, cu atat rezultatul e mai bun. Include detalii precum:

- Scopul intalniri (check-in saptamanal, review trimestrial, onboarding).
- Subiecte de acoperit (stare de bine, progres proiecte, dezvoltare profesionala).
- Tipul de date pe care vrei sa le colectezi (rating-uri, feedback deschis, verificari da/nu).
- Tonul (casual, formal, orientat spre coaching).

De exemplu: "Check-in saptamanal focusat pe stare de bine, blocaje si progres catre obiectivele trimestriale. Include scala de dispozitie si intrebari de rating pentru analytics."

## Editarea sugestiilor AI

Dupa ce AI-ul genereaza template-ul, te afli in editorul standard de template-uri. Poti:

- Sa redenumesti sau sa stergi sectiuni.
- Sa editezi textul intrebarilor si sa schimbi tipurile de raspunsuri.
- Sa adaugi intrebari sau sectiuni noi pe care AI-ul le-a omis.
- Sa reordonezi totul prin drag and drop.

AI-ul iti ofera un punct de plecare. Ajusteaza-l sa se potriveasca stilului tau si nevoilor echipei tale.

## Regenerare

Daca rezultatul nu corespunde cu ce ai nevoie, actualizeaza descrierea si apasa **Generate** din nou. Fiecare generare creeaza un template nou bazat pe cel mai recent input.
`,
  "ro/templates/creating": `Construieste un template personalizat care sa se potriveasca structurii intalnirilor tale de one-on-one. Tu controlezi sectiunile, intrebarile si tipurile de raspunsuri.

## Pornirea unui template nou

1. Mergi la pagina **Templates**.
2. Apasa **Create template**.
3. Introdu un **nume** si optional o **descriere** pentru template.

![Create template](template-create.jpg)

## Adaugarea sectiunilor

Sectiunile grupeaza intrebarile legate intre ele. Pentru a adauga o sectiune:

1. Apasa **Add section**.
2. Da sectiunii un nume (de exemplu, "Stare de bine", "Obiective", "Feedback").
3. Optional, adauga o descriere care explica scopul sectiunii pentru participanti.

## Adaugarea intrebarilor

In cadrul fiecarei sectiuni, adauga intrebarile pe care vrei sa le adresezi:

1. Apasa **Add question** in sectiunea dorita.
2. Scrie textul intrebarii.
3. Selecteaza **tipul de raspuns**: text liber, da/nu, rating 1-5, rating 1-10 sau scala de dispozitie.
4. Marcheaza intrebarea ca **obligatorie** sau optionala.

Alege tipurile de raspuns cu intentie. Intrebarile de tip rating si dispozitie produc date numerice care apar in dashboard-urile de analytics, in timp ce intrebarile de text liber captureaza detalii calitative.

## Reordonarea

Trage si plaseaza pentru a rearanja atat sectiunile, cat si intrebarile din cadrul sectiunilor. Ordinea pe care o setezi aici este ordinea pe care participantii o vad in wizard-ul de intalnire.

Pentru a muta o sectiune, apuca **manerul de drag** si plaseaz-o in noua pozitie. Intrebarile pot fi reordonate in acelasi mod in cadrul sectiunii lor.

## Editare si stergere

- Apasa pe orice sectiune sau intrebare pentru a edita textul, tipul de raspuns sau setarile.
- Apasa pe iconita **delete** pentru a sterge o intrebare sau o sectiune intreaga.

Stergerea unei sectiuni sterge toate intrebarile ei. Asta nu afecteaza datele din sesiunile anterioare care au folosit template-ul.

## Salvare

Apasa **Save** cand ai terminat. Template-ul este disponibil imediat pentru utilizare in seriile de intalniri.
`,
  "ro/templates/overview": `Template-urile definesc structura intalnirilor tale de one-on-one. Fiecare template contine sectiuni cu intrebari care ghideaza conversatia printr-un format consistent.

![Templates](templates-list.jpg)

## Biblioteca de template-uri

Pagina **Templates** arata toate template-urile disponibile in compania ta. Poti naviga, previzualiza si selecta template-uri pentru seriile tale de intalniri. Doar managerii si adminii pot crea sau edita template-uri.

## Structura unui template

Un template este organizat in **sectiuni** (numite si categorii). Fiecare sectiune grupeaza intrebari legate intre ele. De exemplu, un template poate avea sectiuni pentru "Recap", "Stare de bine", "Retrospectiva" si "Obiective".

Fiecare sectiune contine una sau mai multe **intrebari**. Intrebarile apar in ordine in cadrul sectiunii lor, iar sectiunile apar in ordine in cadrul template-ului.

## Tipuri de intrebari

Fiecare intrebare are un tip de raspuns care determina cum raspunde participantul:

| Tip | Descriere |
|---|---|
| **Text liber** | Raspuns scris deschis. |
| **Da / Nu** | Alegere binara simpla. |
| **Rating 1-5** | Scala de cinci puncte pentru scoruri rapide. |
| **Rating 1-10** | Scala de zece puncte pentru scoruri mai detaliate. |
| **Scala de dispozitie** | Indicator al starii emotionale. |

Tipurile numerice (rating, dispozitie) alimenteaza analytics-ul. In timp, dezvaluie tendinte in engagement, satisfactie si sentiment.

## Folosirea unui template

Cand creezi o serie de intalniri, selectezi un template implicit. Acel template este folosit pentru fiecare sesiune din serie, cu exceptia cazului in care il suprascrii pentru o sesiune specifica.

Poti schimba template-ul per sesiune inainte ca sesiunea sa inceapa. Asta iti permite sa rulezi un format diferit pentru review-uri trimestriale sau subiecte speciale fara sa schimbi cadenta obisnuita.

## Cine poate gestiona template-urile

Crearea si editarea template-urilor este restrictionata la **manageri** si **admini**. Membrii participa la sesiuni, dar nu gestioneaza template-urile.
`,
};
