# Phase 5: Meeting Series & Session Wizard - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Managers can create 1:1 meeting series (recurring relationship with a report) and run structured sessions through a full-page step-by-step wizard organized by category. Each category screen groups its questions, notes, and action items together. A context sidebar shows previous session data relevant to the current category. Sessions auto-save, and a summary screen recaps everything before completion. Does NOT include: AI-generated meeting minutes (Phase 7), email notifications (Phase 9), or full action item management UI (Phase 6 — simplified).

</domain>

<decisions>
## Implementation Decisions

### Wizard flow
- One category/topic per screen — all questions for a category displayed together on a single scrollable screen
- Each category screen includes: questions with input widgets, a rich-text notes area, and an action items capture section
- First screen of each session shows a recap of the last meeting (structured data for Phase 5; AI-polished summary when Phase 7 lands)
- Final screen shows a full recap of all answers, notes, and action items grouped by category, with a "Complete Session" button
- Manager reviews the summary and confirms completion; can go back to edit before confirming

### Wizard layout
- Full-page immersive experience — app sidebar hidden, no navigation chrome
- Minimal top bar: exit button, session info (report name, date), save status indicator
- Category navigation at bottom (dots or tabs for each category + summary)
- Prev/Next buttons for category-to-category navigation

### Context panel
- Always-visible sidebar showing context relevant to the current category step
- As user navigates between categories, sidebar updates to show previous session's notes and answers for THAT category
- General context (open action items from previous sessions, overall score trends) shown on the opening recap screen
- Per-question history: a small button/icon on each question opens a dialog showing previous answers for that specific question across the last 3-6 sessions
- For Phase 5: sidebar shows structured data (previous answers, notes). Phase 7 replaces with AI-generated contextual summary

### Series management
- Card grid layout on the Sessions page, sorted by upcoming meeting date (soonest first)
- Each card shows: report avatar, name, cadence, next session date, status badge, "Start"/"Resume" button
- Creating a new series: dedicated page with a form (/series/new) — select report, cadence, preferred day/time, default template
- Clicking a series card opens the series detail page (/series/[id]) showing settings at top + session history timeline below
- "Start Session" button on both the series card and series detail page
- Single "Sessions" nav item in the sidebar (leads to series card grid)

### Notes
- Rich text editor with tiptap — simple editor with markdown support (bold, italic, lists, links)
- Notes are per-category — each category screen has its own notes area
- Shared notes visible to both manager and report
- Private notes (encrypted, author-only) accessible via toggle tab next to shared notes within each category

### Action items
- Captured per-category during the session (inline within each category screen)
- Action items include: title, assignee, optional due date
- Resurfaced in the next session's context (sidebar shows previous action items per category)
- No full action item management UI — capture + resurface + email. Management outsourced to each company's existing tools (Jira, Asana, etc.)
- On session completion, all action items compiled into the summary and emailed to both parties (email in Phase 9)

### Talking points
- Added during the session only (no pre-session entry)
- Live within each category screen alongside notes and action items

### Session lifecycle
- Click "Start Session" → creates session record → opens full-page wizard immediately (no pre-session review)
- Auto-save all answers, notes, action items with 500ms debounce
- Exiting mid-session: session stays "in_progress", series card shows "Resume" with progress indicator
- Completion: manager clicks "Complete Session" on summary screen → session marked complete → redirect to series detail page
- Session score computed as average of all numeric answers, displayed on summary screen

### Series lifecycle
- States: Active, Paused, Archived
- Next session date auto-computed based on cadence after completing a session

### Claude's Discretion
- Navigation component design (dots vs tabs for categories)
- Progress indicator styling
- Mobile responsive behavior (context panel collapse strategy)
- Paused/archived series display (sorted to bottom vs hidden behind filter)
- Tiptap editor toolbar configuration (which formatting options to include)
- Empty states for new series with no session history
- Keyboard shortcuts within the wizard

</decisions>

<specifics>
## Specific Ideas

- The session wizard should feel like conducting a real 1:1 — moving through topics with all relevant context right there. Not filling out a form.
- AI-generated meeting minutes are the north star for the summary screen — Phase 5 builds the structured version, Phase 7 makes it intelligent. The email template applies the AI markdown into a standardized format.
- "Forever history" per person — the series is the container that links all sessions between two people across time.
- Action items are a communication tool, not a project management feature. Capture them, surface them, email them — let companies manage them in their own systems.
- Sidebar context should feel like having your meeting notebook open to the right page — you see what was discussed last time for THIS topic, not everything at once.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- Template system (Phase 4): 6 question types with input widgets, categories, conditional logic — wizard renders these
- Encryption infrastructure: `encryptNote`/`decryptNote` in `src/lib/encryption/private-notes.ts` — ready for private notes
- Auth session with tenantId, userId, role: `src/lib/auth/config.ts`
- withTenantContext() wrapper: `src/lib/db/tenant-context.ts`
- shadcn/ui: 40+ components including Card, Dialog, Tabs, Badge, Skeleton, Avatar, Checkbox
- Existing API route pattern: auth check → RBAC guard → Zod validation → withTenantContext → audit log
- TanStack Query pattern: Server Component initial fetch → Client Component with useQuery({ initialData })
- Sonner toast notifications available globally

### Established Patterns
- Server Components by default, "use client" only for interactivity
- Zod schemas shared client/server in `src/lib/validations/`
- Soft-delete (archive) pattern — never hard delete
- Audit logging via `logAuditEvent()` inside withTenantContext
- Card grid pattern (teams page) — reusable for series cards
- URL-based tab navigation pattern (people/teams tabs)

### Integration Points
- Sidebar (`src/components/layout/sidebar.tsx`): needs "Sessions" nav item added to `mainNavItems`
- Dashboard layout (`src/app/(dashboard)/layout.tsx`): wizard needs a separate layout that hides the sidebar
- DB schema fully deployed: meeting_series, session, session_answer, private_note, talking_point, action_item tables all exist
- Seed data: 3 series, 3 sessions, 15 answers, 3 action items, 1 encrypted private note — ready for testing
- No tiptap installed — needs `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-*` packages
- No useDebounce hook — needs to be created in `src/lib/hooks/`

</code_context>

<deferred>
## Deferred Ideas

- **AI-driven template generation** — AI conducts a dynamic questionnaire with the manager to understand their team, time constraints, and priorities, then generates tailored 1:1 templates. Phase 7+ or new phase.
- **Role-based template assignment** — Templates assigned to roles (Engineer, Sales, etc.) so the right template is auto-selected based on the report's role when creating a series. Enhancement to series creation.
- **Simplified Phase 6** — User's vision for action items is lighter than original Phase 6 scope. Original: full CRUD, status tracking, dedicated list view, velocity charts. User's vision: capture, resurface in next meeting, email to both parties, management in external tools. Phase 6 scope should be revisited.
- **AI meeting minutes** — AI compiles all answers, notes, and action items from a session into a polished markdown meeting minute. Phase 7.
- **Auto-email on completion** — Meeting minute rendered into a standardized email template and sent to both participants automatically. Phase 9.

</deferred>

---

*Phase: 05-meeting-series-session-wizard*
*Context gathered: 2026-03-04*
