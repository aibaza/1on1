# UX Flows

## Navigation Structure

```
┌──────────────────────────────────────────────────────────┐
│  🏠 1on1          [Company Name]        [Avatar ▼]       │
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

**Sidebar navigation:**
- **Overview** — Manager dashboard (home)
- **Sessions** — List of upcoming and past sessions
- **People** — People directory, profiles
- **Teams** — Team management
- **Templates** — Questionnaire builder
- **Analytics** — Charts and reports
- **Settings** — Company settings, account, notifications

---

## Flow 1: Company Onboarding

```
[Register Page]
    │
    │  Company name, admin email, password
    │
    ▼
[Email Verification]
    │
    ▼
[Setup Wizard - 3 steps]
    │
    ├── Step 1: Company Profile
    │   - Company name, timezone, logo (optional)
    │
    ├── Step 2: Invite Team
    │   - Paste emails or enter one by one
    │   - Assign roles (manager/member)
    │   - Can skip and do later
    │
    └── Step 3: Create First Template
        - Use a system template or create from scratch
        - Can skip and do later
    │
    ▼
[Dashboard - Overview]
```

---

## Flow 2: Invite & Onboard a User

```
Admin: People → Invite User
    │
    │  Email, first name, last name, role, manager (optional)
    │
    ▼
[System sends invite email with magic link]
    │
    ▼
User clicks link → [Accept Invite Page]
    │
    │  Set password, upload avatar (optional)
    │
    ▼
[User lands on their dashboard]
    - If member: sees upcoming sessions, action items
    - If manager: sees manager dashboard
```

---

## Flow 3: Create a Questionnaire Template

```
Templates → New Template
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  Template: Weekly Check-in                                   │
│  Category: [Check-in ▼]    Status: Draft                    │
│                                                              │
│  Questions                                          [+ Add] │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ≡ 1. How are you feeling this week?                    │ │
│  │   Type: Mood (😞😐😊😄🤩)   Category: Wellbeing       │ │
│  │   Required: Yes                              [Edit][✕] │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ ≡ 2. Rate your workload                                │ │
│  │   Type: Rating 1-5   Category: Wellbeing               │ │
│  │   Labels: Too light → Overwhelming           [Edit][✕] │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ ≡ 3. What blockers are you facing?                     │ │
│  │   Type: Free text   Category: Performance              │ │
│  │   Required: No                               [Edit][✕] │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ ≡ 4. Are you satisfied with your career growth?        │ │
│  │   Type: Rating 1-10   Category: Career                 │ │
│  │   Labels: Not at all → Absolutely            [Edit][✕] │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ≡ = drag handle for reordering                             │
│                                                              │
│  [Save Draft]                            [Publish Template] │
└─────────────────────────────────────────────────────────────┘
```

**Question edit dialog:**

```
┌──────────────────────────────────────────┐
│  Edit Question                      [✕]  │
│                                          │
│  Question text:                          │
│  ┌──────────────────────────────────┐    │
│  │ Rate your workload              │    │
│  └──────────────────────────────────┘    │
│                                          │
│  Help text (optional):                   │
│  ┌──────────────────────────────────┐    │
│  │ Consider your tasks, deadlines, │    │
│  │ and available time              │    │
│  └──────────────────────────────────┘    │
│                                          │
│  Answer type: [Rating 1-5 ▼]            │
│                                          │
│  Labels:                                 │
│  1: [Too light    ]                      │
│  2: [Manageable   ]                      │
│  3: [Just right   ]                      │
│  4: [Heavy        ]                      │
│  5: [Overwhelming ]                      │
│                                          │
│  Category: [Wellbeing ▼]                 │
│  Required: [✓]                           │
│                                          │
│  [Cancel]                       [Save]   │
└──────────────────────────────────────────┘
```

---

## Flow 4: Set Up a Meeting Series

```
Sessions → New 1:1 Series  (or People → [person] → Start 1:1 Series)
    │
    ▼
┌──────────────────────────────────────────┐
│  New 1:1 Series                          │
│                                          │
│  Manager: [Search user ▼]               │
│  Report:  [Search user ▼]               │
│                                          │
│  Cadence: ( ) Weekly                     │
│           (●) Biweekly                   │
│           ( ) Monthly                    │
│           ( ) Custom: [__ days]          │
│                                          │
│  Duration: [30] minutes                  │
│                                          │
│  Preferred day: [Wednesday ▼]            │
│  Preferred time: [10:00 ▼]              │
│                                          │
│  Default template: [Weekly Check-in ▼]   │
│                                          │
│  First session: [2026-03-04]            │
│                                          │
│  [Cancel]                     [Create]   │
└──────────────────────────────────────────┘
```

---

## Flow 5: Session Wizard (Core Experience)

This is the most important screen in the application.

### Pre-session state

The session appears on the dashboard as "Scheduled". Both manager and report can add talking points.

```
┌─────────────────────────────────────────────────────────────┐
│  1:1 with Ion Popescu · Wed, Mar 4, 2026 · 10:00           │
│  Status: Scheduled                                          │
│                                                              │
│  Agenda                                              [+ Add]│
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ☐ Discuss project timeline (added by you)             │  │
│  │ ☐ Training budget question (added by Ion)             │  │
│  │ ☐ Feedback on last sprint (added by you)              │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  Template: Weekly Check-in (4 questions)                     │
│                                                              │
│  [Start Session]                                             │
└─────────────────────────────────────────────────────────────┘
```

### During session — Wizard view

```
┌─────────────────────────────────────────────────────────────────────────┐
│  1:1 with Ion Popescu · Session #14 · In Progress            [End ✕]  │
├──────────────────────────────────────────┬──────────────────────────────┤
│                                          │                              │
│  WELLBEING                    Step 2/4   │  Context                     │
│                                          │                              │
│  ┌────────────────────────────────────┐  │  ┌─── Past Sessions ──────┐ │
│  │                                    │  │  │                        │ │
│  │  How are you feeling this week?    │  │  │  #13 · Feb 18, 2026   │ │
│  │                                    │  │  │  Score: 4.2/5.0       │ │
│  │   😞    😐    😊    😄    🤩     │  │  │  Mood: 😊              │ │
│  │                       ▲            │  │  │  "Excited about the   │ │
│  │                    selected         │  │  │   new project but     │ │
│  │                                    │  │  │   concerned about     │ │
│  └────────────────────────────────────┘  │  │   timeline..."        │ │
│                                          │  │                        │ │
│  ┌────────────────────────────────────┐  │  │  #12 · Feb 4, 2026    │ │
│  │  Rate your workload               │  │  │  Score: 3.8/5.0       │ │
│  │                                    │  │  │  Mood: 😐              │ │
│  │  Too light ○ ○ ○ ● ○ Overwhelming │  │  │  "Overloaded with     │ │
│  │               1 2 3 4 5            │  │  │   sprint work..."     │ │
│  │                                    │  │  └────────────────────────┘ │
│  │  Help: Consider your tasks,        │  │                              │
│  │  deadlines, and available time     │  │  ┌─── Action Items (2) ──┐ │
│  └────────────────────────────────────┘  │  │                        │ │
│                                          │  │  ☐ Complete React      │ │
│  ┌────────────────────────────────────┐  │  │    training course     │ │
│  │  Notes                      [Private│  │  │    Due: Feb 28        │ │
│  │  ┌──────────────────────────────┐ ]│  │  │    ⚠ Overdue          │ │
│  │  │ Discussed workload - agreed  │  │  │  │                        │ │
│  │  │ to redistribute 2 tasks to   │  │  │  │  ☐ Schedule meeting   │ │
│  │  │ Maria for next sprint...     │  │  │  │    with PM about      │ │
│  │  │                              │  │  │  │    requirements        │ │
│  │  └──────────────────────────────┘  │  │  │    Due: Mar 7          │ │
│  └────────────────────────────────────┘  │  └────────────────────────┘ │
│                                          │                              │
│  ┌─── Talking Points ─────────────────┐  │  ┌─── Score Trend ───────┐ │
│  │ ☑ Discuss project timeline         │  │  │  5│    *              │ │
│  │ ☐ Training budget question         │  │  │  4│  *   *  *        │ │
│  │ ☐ Feedback on last sprint          │  │  │  3│*                  │ │
│  │                          [+ Add]   │  │  │  2│                   │ │
│  └────────────────────────────────────┘  │  │  1│______________     │ │
│                                          │  │   #9 #10 #11 #12 #13 │ │
│  [+ Action Item]                         │  └────────────────────────┘ │
│                                          │                              │
│  ◀ Prev     ● ● ○ ○     Next ▶         │                              │
└──────────────────────────────────────────┴──────────────────────────────┘
```

**Key UX decisions:**

1. **Questions grouped by category**: Each wizard step shows all questions in one category (e.g., "Wellbeing" step shows mood + workload together). This prevents too many steps while keeping logical grouping.

2. **Context panel is collapsible**: On smaller screens, it collapses to an icon bar. Full panel on desktop (>1200px).

3. **Notes are always visible**: The shared notes area is visible on every step, not a separate step. This encourages note-taking during the conversation.

4. **Private notes toggle**: A `[Private]` toggle switches between shared notes (visible to both) and private notes (visible only to the manager). Clear visual indicator (different background color) when in private mode.

5. **Talking points are checkable**: Manager checks them off as discussed during the session.

6. **Auto-save**: Every input change triggers a debounced save (500ms). No "Save" button needed during the session.

7. **Action item creation inline**: The `[+ Action Item]` button opens a quick inline form without leaving the wizard.

### Post-session — Summary

```
┌─────────────────────────────────────────────────────────────┐
│  Session Summary · 1:1 with Ion Popescu · Mar 4, 2026       │
│  Duration: 28 minutes · Session Score: 4.0/5.0              │
│                                                              │
│  ┌── Answers ─────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │  Wellbeing                                              │ │
│  │  ├── Mood: 😄 (4/5)                                    │ │
│  │  └── Workload: 4/5 (Heavy)                             │ │
│  │                                                         │ │
│  │  Performance                                            │ │
│  │  └── Blockers: "Waiting on API specs from backend team" │ │
│  │                                                         │ │
│  │  Career                                                 │ │
│  │  └── Growth satisfaction: 7/10                          │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌── Notes ───────────────────────────────────────────────┐ │
│  │  Discussed workload - agreed to redistribute 2 tasks   │ │
│  │  to Maria for next sprint. Ion will focus on the new   │ │
│  │  API integration. Positive mood overall.               │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌── Action Items (3) ────────────────────────────────────┐ │
│  │  NEW  Redistribute tasks to Maria        You   Mar 7   │ │
│  │  NEW  Set up API integration env         Ion   Mar 11  │ │
│  │  OPEN Complete React training course     Ion   Feb 28  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌── Talking Points ─────────────────────────────────────┐  │
│  │  ☑ Discuss project timeline                            │  │
│  │  ☑ Training budget question                            │  │
│  │  ☑ Feedback on last sprint                             │  │
│  │  ☐ Career path discussion  ← will carry to next       │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  [◀ Back to Sessions]      [Send Summary Email]  [Complete] │
└─────────────────────────────────────────────────────────────┘
```

---

## Flow 6: Manager Dashboard (Overview)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Good morning, Maria                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─── Upcoming Sessions (This Week) ──────────────────────────────┐    │
│  │                                                                 │    │
│  │  TODAY                                                          │    │
│  │  ┌───────────────────────────────────────────────────────────┐  │    │
│  │  │  🟢 Ion Popescu        10:00  Weekly Check-in  [Start ▶] │  │    │
│  │  │     Agenda: 3 items · Last session: 4.2/5                │  │    │
│  │  └───────────────────────────────────────────────────────────┘  │    │
│  │  ┌───────────────────────────────────────────────────────────┐  │    │
│  │  │  🟡 Ana Marin          14:00  Career Dev       [Prepare] │  │    │
│  │  │     Agenda: not prepared · Last session: 3.5/5           │  │    │
│  │  └───────────────────────────────────────────────────────────┘  │    │
│  │                                                                 │    │
│  │  THURSDAY                                                       │    │
│  │  ┌───────────────────────────────────────────────────────────┐  │    │
│  │  │  🟢 Mihai Radu         11:00  Weekly Check-in  [Prepare] │  │    │
│  │  │     Agenda: 2 items · Last session: 4.5/5               │  │    │
│  │  └───────────────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌─── Overdue Action Items ──────────┐  ┌─── Quick Stats ──────────┐  │
│  │                                    │  │                           │  │
│  │  Ion Popescu                       │  │  Reports:     5           │  │
│  │  ☐ Complete React training         │  │  This month:  8 sessions │  │
│  │    Due: Feb 28 · 4 days overdue    │  │  Avg score:   4.1/5      │  │
│  │                                    │  │  Action items: 12 open   │  │
│  │  Ana Marin                         │  │                           │  │
│  │  ☐ Update project documentation    │  └───────────────────────────┘  │
│  │    Due: Mar 1 · 1 day overdue      │                                 │
│  │                                    │                                 │
│  └────────────────────────────────────┘                                 │
│                                                                         │
│  ┌─── Team Score Trends (Last 8 Weeks) ──────────────────────────┐     │
│  │                                                                │     │
│  │  5 │         *                                                 │     │
│  │    │    *  *   *  *        ── Ion Popescu                     │     │
│  │  4 │  *          *  *      ── Ana Marin                       │     │
│  │    │                  *    ── Mihai Radu                       │     │
│  │  3 │*   *                                                      │     │
│  │    │  *    *  *  *  *                                          │     │
│  │  2 │                                                           │     │
│  │    └────────────────────                                       │     │
│  │     W1  W2  W3  W4  W5  W6  W7  W8                           │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Dashboard status indicators:**
- 🟢 Green: Agenda prepared by both parties
- 🟡 Yellow: Agenda not yet prepared
- 🔴 Red: Session overdue or missed

---

## Flow 7: People Directory & Profile

```
People → [Ion Popescu]
┌─────────────────────────────────────────────────────────────┐
│  ┌──────┐                                                    │
│  │ foto │  Ion Popescu                                      │
│  │      │  Senior Developer · Engineering Team              │
│  └──────┘  Manager: Maria Ionescu                           │
│            Email: ion.popescu@company.com                    │
│                                                              │
│  ┌─ Tabs ──────────────────────────────────────────────────┐ │
│  │ [Sessions]  [Action Items]  [Analytics]  [Profile]      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  Sessions tab:                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  #14 · Mar 4, 2026 · Score: 4.0/5 · Completed         │ │
│  │  #13 · Feb 18, 2026 · Score: 4.2/5 · Completed        │ │
│  │  #12 · Feb 4, 2026 · Score: 3.8/5 · Completed         │ │
│  │  #11 · Jan 21, 2026 · Score: 4.5/5 · Completed        │ │
│  │  ...                                           [Load more]│
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  Analytics tab:                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  [Score Trend Chart]        [Category Breakdown Radar]  │ │
│  │                                                         │ │
│  │  5│      *  *               Wellbeing:    4.2          │ │
│  │  4│   *       *  *          Engagement:   3.8          │ │
│  │  3│ *                       Performance:  4.0          │ │
│  │  2│                         Career:       3.5          │ │
│  │   └──────────────           Feedback:     4.1          │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Flow 8: Analytics Page

```
Analytics → Individual → Ion Popescu
┌─────────────────────────────────────────────────────────────────────────┐
│  Analytics · Ion Popescu                                                │
│  Period: [Last 6 months ▼]   Compare with: [Team average ▼]           │
│                                                                         │
│  ┌─── Overall Score Trend ───────────────────────────────────────┐     │
│  │                                                                │     │
│  │  5│                                                            │     │
│  │   │      *──*        *──*──*                                   │     │
│  │  4│   *──      *──*──         *──*                             │     │
│  │   │──                                ── Employee               │     │
│  │  3│  ·····························    ·· Team avg              │     │
│  │   │  · · · · · · · · · · · · · ·                              │     │
│  │  2│                                                            │     │
│  │   └──────────────────────────────                              │     │
│  │    Sep  Oct  Nov  Dec  Jan  Feb  Mar                           │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                         │
│  ┌─── Category Scores ───────────┐  ┌─── Meeting Stats ───────────┐   │
│  │                                │  │                              │   │
│  │    Wellbeing      ████████ 4.2 │  │  Sessions held:    12/14    │   │
│  │    Engagement     ███████░ 3.8 │  │  Adherence:        86%      │   │
│  │    Performance    ████████ 4.0 │  │  Avg duration:     28 min   │   │
│  │    Career         ██████░░ 3.5 │  │  Action items:     23 total │   │
│  │    Feedback       ████████ 4.1 │  │  Completed:        18 (78%) │   │
│  │                                │  │  Avg completion:   5 days   │   │
│  └────────────────────────────────┘  └──────────────────────────────┘   │
│                                                                         │
│  ┌─── Category Trends (Detail) ──────────────────────────────────┐     │
│  │  [Wellbeing ▼]                                                 │     │
│  │                                                                │     │
│  │  5│                                                            │     │
│  │   │        *     *                                             │     │
│  │  4│  *  *     *     *  *  *                                    │     │
│  │   │                                                            │     │
│  │  3│*                                                           │     │
│  │   └──────────────────────                                      │     │
│  │    #3  #4  #5  #6  #7  #8  #9  #10 #11 #12 #13 #14           │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                         │
│  [Export CSV]                                        [Generate PDF]     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Responsive Design Strategy

| Breakpoint | Layout Adaptation |
|------------|-------------------|
| **Desktop (>1200px)** | Full sidebar + main content + context panel in session wizard |
| **Tablet (768-1200px)** | Collapsible sidebar (hamburger) + main content. Context panel becomes a bottom sheet or tab in session wizard |
| **Mobile (<768px)** | Bottom nav bar (5 items). Session wizard is full-screen with swipeable steps. Context panel is a separate tab/page |

---

## Dark Mode

Support both light and dark themes via Tailwind CSS `dark:` variants. Theme preference stored in `localStorage` with system detection as default. Company branding (primary color) adapts to both themes.

---

## Accessibility

- All interactive elements are keyboard navigable (Tab, Enter, Escape)
- ARIA labels on all form controls and interactive components
- Focus indicators visible on all focusable elements
- Color is never the only indicator (always paired with text or icons)
- Rating scales are keyboard-operable (arrow keys)
- Minimum contrast ratio of 4.5:1 for text (WCAG AA)
- Screen reader announcements for wizard step changes
