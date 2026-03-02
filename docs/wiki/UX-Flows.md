# UX Flows

## Navigation Structure

```
┌──────────────────────────────────────────────────────────┐
│  1on1              [Company Name]        [Avatar ▼]       │
├──────────┬───────────────────────────────────────────────┤
│          │                                               │
│ Overview │   Main Content Area                           │
│ Sessions │                                               │
│ People   │                                               │
│ Teams    │                                               │
│ Template │                                               │
│ Analytics│                                               │
│          │                                               │
│ ──────── │                                               │
│ Settings │                                               │
│          │                                               │
└──────────┴───────────────────────────────────────────────┘
```

- **Overview** — Manager dashboard (home)
- **Sessions** — Upcoming and past sessions
- **People** — People directory, profiles
- **Teams** — Team management
- **Templates** — Questionnaire builder
- **Analytics** — Charts and reports
- **Settings** — Company, account, notifications

---

## Flow 1: Company Onboarding

```
[Register Page] → [Email Verification] → [Setup Wizard - 3 steps] → [Dashboard]
```

**Setup Wizard**:
1. Company Profile — name, timezone, logo
2. Invite Team — paste emails, assign roles (skippable)
3. Create First Template — use system template or create (skippable)

## Flow 2: Invite & Onboard a User

```
Admin: People → Invite User (email, name, role, manager)
  → System sends invite email with magic link
  → User: Accept Invite Page (set password, avatar)
  → User lands on their dashboard
```

## Flow 3: Create a Questionnaire Template

Template editor with:
- Template name, category, status (draft/published)
- Question list with drag handles (≡) for reordering
- Each question shows: text, type, category, required flag
- [+ Add] to add questions, [Edit] / [✕] per question
- Question edit dialog: text, help text, answer type picker, type-specific config (labels, options), category, required toggle
- [Save Draft] and [Publish Template] actions

## Flow 4: Set Up a Meeting Series

```
Sessions → New 1:1 Series  (or People → [person] → Start 1:1)
```

Form: Manager, Report, Cadence (weekly/biweekly/monthly/custom), Duration, Preferred day/time, Default template, First session date.

## Flow 5: Session Wizard (Core Experience)

### Pre-session
- Appears as "Scheduled" on dashboard
- Both parties can add talking points to agenda
- Shows template info and question count
- [Start Session] button

### During session — Wizard view

Two-column layout:

**Left column (main)**:
- Category header + step indicator (e.g., "WELLBEING — Step 2/4")
- Questions grouped by category with appropriate input widgets
- Notes area (shared/private toggle with visual indicator)
- Talking points checklist
- [+ Action Item] inline creation
- Navigation: ◀ Prev / Next ▶ + dot indicators

**Right column (context panel)**:
- Past 3 sessions (score, mood, notes excerpt)
- Open action items with overdue warnings
- Score trend sparkline (last 6 sessions)

**Key UX decisions**:
1. Questions grouped by category per step
2. Context panel collapsible on smaller screens, full on desktop (>1200px)
3. Notes always visible on every step
4. Private notes toggle with different background color
5. Talking points checkable during session
6. Auto-save on every input change (500ms debounce)
7. Action item creation inline without leaving wizard

### Post-session — Summary

- Session metadata (duration, score)
- All answers grouped by category
- Notes
- Action items (new + carried over)
- Talking points (discussed + undiscussed)
- [Send Summary Email] and [Complete] actions

## Flow 6: Manager Dashboard

- Greeting + upcoming sessions (this week) with status indicators
  - 🟢 Agenda prepared by both
  - 🟡 Not yet prepared
  - 🔴 Overdue or missed
- Overdue action items grouped by report
- Quick stats: reports, sessions this month, avg score, open action items
- Team score trends chart (last 8 weeks, one line per report)

## Flow 7: People Directory & Profile

Tabbed profile view:
- **Sessions** — chronological list with scores
- **Action Items** — open/completed items
- **Analytics** — score trend + category radar chart
- **Profile** — personal info

## Flow 8: Analytics Page

Individual analytics with:
- Period selector, comparison selector (vs team average)
- Overall score trend line chart (employee vs team)
- Category scores horizontal bar chart
- Meeting stats (sessions held, adherence %, avg duration, action items)
- Category detail trend with session-by-session granularity
- [Export CSV] and [Generate PDF] (v2)

## Responsive Design

| Breakpoint | Adaptation |
|------------|-----------|
| Desktop (>1200px) | Full sidebar + main + context panel |
| Tablet (768-1200px) | Collapsible sidebar, context panel as bottom sheet/tab |
| Mobile (<768px) | Bottom nav bar, full-screen wizard with swipeable steps |

## Additional

- **Dark mode**: Tailwind `dark:` variants, system detection default, localStorage preference
- **Accessibility**: Keyboard navigation, ARIA labels, focus indicators, 4.5:1 contrast (WCAG AA), screen reader announcements for wizard steps
