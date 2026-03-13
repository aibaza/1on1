# Roadmap: 1on1

## Milestones

- ✅ **v1.0 MVP** — Phases 1-10 (shipped 2026-03-05)
- ✅ **v1.1 Internationalization** — Phases 11-14 (shipped 2026-03-07)
- ✅ **v1.2 AI-Ready Templates** — Phases 15-17 (shipped 2026-03-07)
- 🚧 **v1.3 UI/UX Improvements** — Phases 18-23 (in progress)
- 📋 **v1.4 Session Corrections & Accountability** — Phases 24-27 (planned)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-10) — SHIPPED 2026-03-05</summary>

- [x] Phase 1: Foundation & Infrastructure (3/3 plans) — completed 2026-03-03
- [x] Phase 2: Authentication & Organization (3/3 plans) — completed 2026-03-03
- [x] Phase 3: User & Team Management (4/4 plans) — completed 2026-03-03
- [x] Phase 4: Questionnaire Templates (3/3 plans) — completed 2026-03-03
- [x] Phase 5: Meeting Series & Session Wizard (5/5 plans) — completed 2026-03-04
- [x] Phase 6: Action Items & Session History (3/3 plans) — completed 2026-03-04
- [x] Phase 7: AI Pipeline (5/5 plans) — completed 2026-03-04
- [x] Phase 8: Manager Dashboard & Analytics (7/7 plans) — completed 2026-03-04
- [x] Phase 9: Email Notifications (2/2 plans) — completed 2026-03-05
- [x] Phase 10: Integration & Polish (5/5 plans) — completed 2026-03-05

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 Internationalization (Phases 11-14) — SHIPPED 2026-03-07</summary>

- [x] Phase 11: i18n Foundation (2/2 plans) — completed 2026-03-05
- [x] Phase 12: UI Translation (6/6 plans) — completed 2026-03-06
- [x] Phase 13: Email Translation (3/3 plans) — completed 2026-03-06
- [x] Phase 14: Romanian & Quality (2/2 plans) — completed 2026-03-07

Full details: `.planning/milestones/v1.2-ROADMAP.md`

</details>

<details>
<summary>✅ v1.2 AI-Ready Templates (Phases 15-17) — SHIPPED 2026-03-07</summary>

- [x] Phase 15: Schema, Spec & Export (4/4 plans) — completed 2026-03-07
- [x] Phase 16: Template Import (5/5 plans) — completed 2026-03-07
- [x] Phase 17: AI Generator & DIY Kit (7/7 plans) — completed 2026-03-07

Full details: `.planning/milestones/v1.2-ROADMAP.md`

</details>

### 🚧 v1.3 UI/UX Improvements (In Progress)

**Milestone Goal:** Systematically close all findings from the March 2026 UX audit — fix critical rendering bugs, establish design system conventions, improve mobile responsiveness, fix content density and data display issues, add safety and error handling, and apply low-priority polish — elevating the app from 6.5/10 to 8.5/10.

- [x] **Phase 18: Critical Bugs** — Fix 4 rendering bugs breaking content and layout (completed 2026-03-08)
- [x] **Phase 19: Design System** — Establish consistent button colors, badge weights, casing, and empty-state component (completed 2026-03-08)
- [x] **Phase 20: Mobile Responsiveness** — Fix action bars, touch targets, and table layouts on mobile (completed 2026-03-08)
- [x] **Phase 21: Content & Data Display** — Analytics aggregate metrics, score display, session card data density (completed 2026-03-08)
- [ ] **Phase 22: Safety, Errors & Inputs** — Danger zones, 404 pages, date picker consistency
- [ ] **Phase 23: Low-Priority Polish** — 9 small text, visual, and layout tweaks

### 📋 v1.4 Session Corrections & Accountability (Planned)

**Milestone Goal:** Allow managers to correct answers in past sessions with a mandatory AI-validated explanation, producing a full append-only audit trail and email notification to all involved parties — bringing EHR-grade amendment accountability to 1:1 meeting records.

- [x] **Phase 24: Schema Foundation** — Append-only history table with RLS, notificationTypeEnum extension, migration (completed 2026-03-10)
- [x] **Phase 25: Core API & Business Logic** — RBAC helper, AI validation service, both API routes, in-transaction audit log, score recompute (completed 2026-03-10)
- [ ] **Phase 26: Email Notification & i18n** — Correction email template in EN+RO, session-level deduplication sender
- [ ] **Phase 27: UI Integration** — Correction dialog, Amended badge, correction history panel wired into session detail

## Phase Details

### Phase 18: Critical Bugs
**Goal**: Users see correct content throughout the app — no raw object output, no broken layouts, no missing translations, no dev artifacts in production
**Depends on**: Phase 17
**Requirements**: BUG-01, BUG-02, BUG-03, BUG-04
**Success Criteria** (what must be TRUE):
  1. Wizard recap notes display formatted rich text (paragraphs, bullets, bold) instead of `[object Object]`
  2. AI template editor is usable on screens narrower than 1024px — panels stack vertically or toggle between tabs
  3. Templates schema page renders translated UI text in both English and Romanian — no raw `spec.*` keys visible
  4. Recap screen contains no dashed-border sparkline placeholder div from development
**Plans**: 3 plans
Plans:
- [ ] 18-01-PLAN.md — TDD: Write failing unit tests for contentToHtml helper (Wave 0)
- [ ] 18-02-PLAN.md — Implement contentToHtml, fix recap notes rendering, remove sparkline div (Wave 1)
- [ ] 18-03-PLAN.md — Add spec.json to i18n loader + AI editor mobile responsive layout (Wave 1)

### Phase 19: Design System
**Goal**: Users experience a visually consistent interface — a single primary action color, badge weights that signal importance, consistent section header casing, and empty states instead of blank whitespace
**Depends on**: Phase 18
**Requirements**: DES-01, DES-02, DES-03, DES-04
**Success Criteria** (what must be TRUE):
  1. All primary CTA buttons (auth pages and app pages) use the same color — no inconsistency between auth and app
  2. "In progress" badges are visually heavier (filled) than "completed" badges (outlined), matching semantic importance
  3. Wizard section headers use sentence-case: "Notes", "Talking Points", "Action Items" — no ALL-CAPS headers
  4. Pages that previously showed blank whitespace now show an empty-state component with icon, heading, description, and optional CTA
**Plans**: 3 plans
Plans:
- [ ] 19-01-PLAN.md — Wave 0: Write failing test scaffolds for DES-02, DES-03, DES-04
- [ ] 19-02-PLAN.md — Build EmptyState component and replace all inline empty-state patterns (DES-04)
- [ ] 19-03-PLAN.md — Fix badge variant semantics, remove uppercase section headers, audit button colors (DES-01, DES-02, DES-03)

### Phase 20: Mobile Responsiveness
**Goal**: Users can operate all app surfaces on mobile — action bars fit within viewport, touch targets meet minimum size, and list pages are readable on small screens
**Depends on**: Phase 18
**Requirements**: MOB-01, MOB-02, MOB-03, MOB-04, MOB-05
**Success Criteria** (what must be TRUE):
  1. Template list and template detail action bars do not overflow on mobile — secondary actions collapse into an overflow menu below 768px
  2. AI nudge dismiss button is at least 44×44px and tappable on mobile without precision
  3. People list is readable on mobile — shows at minimum Name and Role columns, or renders as cards
  4. Audit log table is readable on mobile — renders as card rows or shows only priority columns
**Plans**: 4 plans
Plans:
- [ ] 20-01-PLAN.md — Wave 0: Write failing unit tests for MOB-03, MOB-04, MOB-05
- [ ] 20-02-PLAN.md — Fix nudge touch target (MOB-03) + template list overflow menu (MOB-01) (Wave 1)
- [ ] 20-03-PLAN.md — People table mobile columns (MOB-04) + audit log mobile columns (MOB-05) (Wave 1)
- [ ] 20-04-PLAN.md — Template editor overflow menu (MOB-02) (Wave 2)

### Phase 21: Content & Data Display
**Goal**: Users see accurate, appropriately dense data — analytics show company-wide aggregate metrics, session cards show scores not stars, the wizard shows section counts, and the team heatmap communicates data requirements
**Depends on**: Phase 18
**Requirements**: CON-01, CON-02, CON-03, CON-04, CON-05, SCORE-01
**Success Criteria** (what must be TRUE):
  1. Analytics overview page shows aggregate company-wide metrics (score trend, sessions completed, action item completion rate) above the team/individual directory
  2. Session list cards with no completed sessions do not show a star rating row
  3. Session list cards with completed sessions show a numeric score badge, not hollow stars
  4. Wizard "Talking Points" and "Action Items" sections display an item count badge and a working expand/collapse chevron
  5. Team heatmap shows a threshold message ("requires ≥3 contributors") when fewer than 3 contributors have session data
  6. Session summary score label displays the correct maximum scale (e.g., "7.5 out of 10")
**Plans**: 4 plans
Plans:
- [ ] 21-01-PLAN.md — Replace star row with numeric score badge on session list cards (CON-02, CON-03) (Wave 1)
- [ ] 21-02-PLAN.md — Add count badges and expand/collapse to Talking Points and Action Items in wizard (CON-04) (Wave 1)
- [ ] 21-03-PLAN.md — Team heatmap threshold message + session summary score label fix (CON-05, SCORE-01) (Wave 1)
- [ ] 21-04-PLAN.md — Analytics overview aggregate stats section (CON-01) (Wave 1)

### Phase 22: Safety, Errors & Inputs
**Goal**: Users are protected from accidental data loss, see helpful context-aware error pages instead of bare Next.js defaults, and use consistent date picker controls
**Depends on**: Phase 19
**Requirements**: SAFE-01, ERR-01, INP-01
**Success Criteria** (what must be TRUE):
  1. "Delete Team" button appears in a visually distinct "Danger Zone" section at the bottom of the team detail page, styled with outlined red — visually separated from non-destructive actions
  2. Navigating to a session URL that does not exist shows a contextual 404 page with a "Back to Sessions" link, not the bare Next.js error page
  3. Date filter inputs on History and Audit Log pages use the shadcn DatePicker component — no native `<input type="date">` elements remain
**Plans**: TBD

### Phase 23: Low-Priority Polish
**Goal**: Users see a professionally finished product — correct placeholder text, accurate copy, properly styled dividers, centered auth pages, hidden redundant badges, and mobile-optimized layout details
**Depends on**: Phase 19
**Requirements**: POL-01, POL-02, POL-03, POL-04, POL-05, POL-06, POL-07, POL-08, POL-09
**Success Criteria** (what must be TRUE):
  1. Registration company name field shows a company name placeholder ("Acme Corp") — not a person name
  2. Audit log action names use correct acronym casing ("AI Pipeline Completed", not "Ai Pipeline Completed")
  3. Forgot-password page card is vertically centered, matching login and register page alignment
  4. People list hides the "Active" status badge when all users are active — badge only appears for non-default states
  5. Action items "COMPLETED" section divider uses 13px font and a hairline hr — readable and unobtrusive
  6. Team cards have a visible border in dark mode for definition against the page background
  7. Session cards with no sessions show a "Start first session" link below the AI summary placeholder
  8. Mobile history page search input placeholder is short enough to display without truncation
**Plans**: TBD

### Phase 24: Schema Foundation
**Goal**: The database is structurally ready for corrections — original answer values can never be lost, cross-tenant exposure is impossible, and the notification system recognizes correction events
**Depends on**: Phase 23
**Requirements**: CORR-02
**Success Criteria** (what must be TRUE):
  1. A `session_answer_history` table exists with typed snapshot columns (`answer_text`, `answer_numeric`, `answer_json`) that mirror `session_answers` — original values are captured, not overwritten
  2. The table has `tenant_id` on every row and an active Row-Level Security policy — no cross-tenant reads are possible, including via `adminDb`
  3. `notificationTypeEnum` includes `session_correction` — the enum is extended in the same migration without recreating it
  4. Drizzle schema is exported from `index.ts` and `bunx drizzle-kit migrate` runs cleanly against the local database
**Plans**: 2 plans
Plans:
- [ ] 24-01-PLAN.md — TDD: Write failing tests + implement sessionAnswerHistory schema + extend notificationTypeEnum (Wave 1)
- [ ] 24-02-PLAN.md — Hand-written migration SQL, journal registration, apply migration + full phase gate (Wave 2)

### Phase 25: Core API & Business Logic
**Goal**: The full correction transaction is implemented and tested — a manager can submit a correction that atomically snapshots the original, updates the answer, recomputes the session score, writes the audit log, and separately validates reasons through an AI endpoint
**Depends on**: Phase 24
**Requirements**: ANLT-01, WFLOW-01, WFLOW-02, WFLOW-03, NOTIF-03
**Success Criteria** (what must be TRUE):
  1. `POST /api/sessions/[id]/corrections` accepts a valid correction, writes the history snapshot, updates the answer, and writes a `session.answer_corrected` audit log entry all within a single database transaction — no partial state is possible
  2. When a numeric answer is corrected, `session.session_score` is recomputed within that same transaction before the response is returned
  3. `POST /api/sessions/[id]/corrections/validate-reason` returns AI feedback (pass/fail + one sentence) without performing any database write — AI availability does not block the mutation endpoint
  4. A manager can only correct sessions from their own series; an admin can correct any session in the tenant — any other actor receives a 403 response
  5. Submitting a reason shorter than 20 characters or longer than 500 characters is rejected by Zod validation before any AI or database call is made
**Plans**: 3 plans
Plans:
- [ ] 25-01-PLAN.md — TDD Wave 1: Write failing tests for Zod schemas, canCorrectSession RBAC, AI result schema, scoring
- [ ] 25-02-PLAN.md — Wave 2: Implement Zod schemas, canCorrectSession, AI schemas/model/service — make tests GREEN
- [ ] 25-03-PLAN.md — Wave 3: Implement correction mutation route and validate-reason AI route

### Phase 26: Email Notification & i18n
**Goal**: All involved parties receive one notification email per correction event — report and admins are informed with a session link, emails render correctly in English and Romanian, and multiple rapid corrections to the same session produce a single email rather than a flood
**Depends on**: Phase 25
**Requirements**: NOTIF-01, NOTIF-02, NOTIF-04
**Success Criteria** (what must be TRUE):
  1. When a session answer is corrected, the report (employee) receives an email containing a direct link to the session — no inline answer content appears in the email body
  2. All active tenant admins receive the same correction notification email — admins added after the correction do not receive retroactive emails
  3. The correction email renders correctly in both English and Romanian using `createEmailTranslator` — no raw translation keys appear in either language
  4. Five corrections to the same session within a 5-minute window produce exactly one email per recipient, not five — the deduplication window resets on each new correction within the window
**Plans**: 3 plans
Plans:
- [ ] 26-01-PLAN.md — TDD Wave 0: RED tests for sendCorrectionEmails, React Email template, i18n keys EN+RO (Wave 1)
- [ ] 26-02-PLAN.md — Implement correction-email.ts sender module — make Wave 0 tests GREEN (Wave 2)
- [ ] 26-03-PLAN.md — Wire sendCorrectionEmails into corrections route as fire-and-forget + full phase gate (Wave 3)

### Phase 27: UI Integration
**Goal**: Users can initiate, review, and track corrections entirely within the session detail page — inline before/after form, AI feedback on the reason field, Amended badges on modified answers, and a correction history panel accessible without navigation
**Depends on**: Phase 26
**Requirements**: CORR-01, CORR-03, WFLOW-04, WFLOW-05
**Success Criteria** (what must be TRUE):
  1. Every corrected answer row on the session detail page shows an "Amended" badge — a user viewing the session can immediately identify which answers have been modified
  2. A manager (or admin) clicking the edit icon on an answer row sees the original and new answer values side by side inline on the same page — no separate page navigation occurs
  3. The correction reason field shows AI feedback (pass/fail + one-sentence note) after the manager stops typing, without leaving the session detail page
  4. A correction history panel at the bottom of the session detail page lists all amendments with timestamp, actor name, and reason — the panel is collapsed when no corrections exist and expanded by default when corrections are present
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & Infrastructure | v1.0 | 3/3 | Complete | 2026-03-03 |
| 2. Authentication & Organization | v1.0 | 3/3 | Complete | 2026-03-03 |
| 3. User & Team Management | v1.0 | 4/4 | Complete | 2026-03-03 |
| 4. Questionnaire Templates | v1.0 | 3/3 | Complete | 2026-03-03 |
| 5. Meeting Series & Session Wizard | v1.0 | 5/5 | Complete | 2026-03-04 |
| 6. Action Items & Session History | v1.0 | 3/3 | Complete | 2026-03-04 |
| 7. AI Pipeline | v1.0 | 5/5 | Complete | 2026-03-04 |
| 8. Manager Dashboard & Analytics | v1.0 | 7/7 | Complete | 2026-03-04 |
| 9. Email Notifications | v1.0 | 2/2 | Complete | 2026-03-05 |
| 10. Integration & Polish | v1.0 | 5/5 | Complete | 2026-03-05 |
| 11. i18n Foundation | v1.1 | 2/2 | Complete | 2026-03-05 |
| 12. UI Translation | v1.1 | 6/6 | Complete | 2026-03-06 |
| 13. Email Translation | v1.1 | 3/3 | Complete | 2026-03-06 |
| 14. Romanian & Quality | v1.1 | 2/2 | Complete | 2026-03-07 |
| 15. Schema, Spec & Export | v1.2 | 4/4 | Complete | 2026-03-07 |
| 16. Template Import | v1.2 | 5/5 | Complete | 2026-03-07 |
| 17. AI Generator & DIY Kit | v1.2 | 7/7 | Complete | 2026-03-07 |
| 18. Critical Bugs | v1.3 | 3/3 | Complete | 2026-03-08 |
| 19. Design System | v1.3 | 3/3 | Complete | 2026-03-08 |
| 20. Mobile Responsiveness | v1.3 | 4/4 | Complete | 2026-03-08 |
| 21. Content & Data Display | v1.3 | 4/4 | Complete | 2026-03-08 |
| 22. Safety, Errors & Inputs | v1.3 | 0/? | Not started | — |
| 23. Low-Priority Polish | v1.3 | 0/? | Not started | — |
| 24. Schema Foundation | 2/2 | Complete    | 2026-03-10 | — |
| 25. Core API & Business Logic | 3/3 | Complete    | 2026-03-10 | — |
| 26. Email Notification & i18n | 1/3 | In Progress|  | — |
| 27. UI Integration | v1.4 | 0/? | Not started | — |
