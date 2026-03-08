# Requirements: 1on1 — v1.3 UI/UX Improvements

**Defined:** 2026-03-08
**Core Value:** The AI context layer that makes every meeting smarter than the last
**Audit Source:** `screenshots/UX-AUDIT-REPORT.md` (March 8, 2026 — 35 screens × 4 configs)
**Baseline Score:** 6.5/10 → **Target:** 8.5/10

---

## v1.3 Requirements

### Critical Bugs (BUG)

- [x] **BUG-01**: User sees formatted rich-text content in wizard recap notes (not `[object Object]`) — fix `generateHTML()` conversion of Tiptap JSON before `dangerouslySetInnerHTML`
- [x] **BUG-02**: AI template editor is usable on mobile — responsive layout (stack panels vertically on <1024px or tab-based toggle)
- [x] **BUG-03**: Templates schema page displays translated UI text (not raw `spec.*` i18n keys) — add missing keys to `en.json` / `ro.json`
- [x] **BUG-04**: Sparkline placeholder dev artifact removed from recap screen — delete the dashed-border "Score trend sparkline (Plan 03)" div or replace with real component

### Design System (DES)

- [ ] **DES-01**: All primary CTA buttons use a single consistent color across auth pages and app pages — choose monochrome (recommended) or orange and apply globally
- [x] **DES-02**: Badge visual weight matches semantic importance — "in progress" uses filled/high-weight badge; "completed" uses outlined/low-weight badge
- [x] **DES-03**: Section headers inside wizard use consistent sentence-case casing — "Notes", "Talking Points", "Action Items" (not uppercase "NOTES", "TALKING POINTS")
- [x] **DES-04**: Reusable empty-state component created — accepts icon, heading, description, optional CTA button; used on pages currently showing blank whitespace

### Mobile Responsiveness (MOB)

- [ ] **MOB-01**: Template list action bar fits within mobile viewport — overflow menu (`...`) collapses secondary actions below 768px
- [ ] **MOB-02**: Template detail action bar fits within mobile viewport — overflow menu for secondary actions
- [ ] **MOB-03**: AI nudge dismiss button meets 44×44px minimum touch target (WCAG 2.5.5)
- [ ] **MOB-04**: People list is readable on mobile — card layout or priority columns visible (Name, Role)
- [ ] **MOB-05**: Audit log table is readable on mobile — card-based row layout or priority columns

### Content Density & Empty States (CON)

- [ ] **CON-01**: Analytics overview page shows aggregate company-wide metrics (score trend, sessions completed, action item rate) above the Teams/Individuals directory
- [ ] **CON-02**: Session list cards with no completed sessions hide the star rating row
- [ ] **CON-03**: Session list cards with sessions show numeric score badge (not hollow stars)
- [ ] **CON-04**: Talking Points and Action Items sections in wizard show item count badge and expand/collapse chevron
- [ ] **CON-05**: Team heatmap shows a threshold message ("requires ≥3 contributors") when fewer than 3 contributors have session data

### Destructive Action Safety (SAFE)

- [ ] **SAFE-01**: "Delete Team" button uses outlined red styling and appears in a dedicated "Danger Zone" section at the bottom of the team detail page

### Error Handling (ERR)

- [ ] **ERR-01**: Session routes show a contextual 404 page ("Session not found. [Back to Sessions]") instead of the bare Next.js default error page

### Input Consistency (INP)

- [ ] **INP-01**: Date filter inputs on History and Audit Log pages use shadcn `DatePicker` (not native `<input type="date">`)

### Score Display (SCORE)

- [ ] **SCORE-01**: Session summary score label displays the correct maximum (e.g., "out of 10" if 10-point scale) — review score aggregation logic to confirm or fix the scale

### Low-Priority Polish (POL)

- [ ] **POL-01**: Company name field on registration page uses a company name placeholder ("Acme Corp"), not a person name ("Jane Smith")
- [ ] **POL-02**: Template seed data category "1:1 Structurat" corrected to "1:1 Structured" (English)
- [ ] **POL-03**: Audit log action names use correct acronym casing: "AI Pipeline Completed" (not "Ai Pipeline Completed")
- [ ] **POL-04**: Forgot-password page card is vertically centered consistently with login and register pages
- [ ] **POL-05**: People list hides "Active" status badge when all users are active (default state = no badge)
- [ ] **POL-06**: Action items "COMPLETED" section divider is readable: 13px font, hairline `<hr>` above
- [ ] **POL-07**: Team cards have visible border in dark mode (`border border-border`) for definition against page background
- [ ] **POL-08**: Session cards with no sessions show a "Start first session" link below the AI summary placeholder text
- [ ] **POL-09**: Mobile history page search input uses a short placeholder ("Search sessions...") that fits without truncation

---

## Out of Scope for v1.3

| Feature | Reason |
|---------|--------|
| Playwright E2E testing suite | Planned for v1.4 |
| Keyboard navigation audit (WCAG 2.1.1) | Requires interactive testing, not screenshot-based — defer to v1.4 test suite |
| pgvector embeddings for AI context | v2 feature, already deferred |
| People/Teams moved under separate nav | Structural IA change; requires deeper UX validation |
| Score trend sparkline implementation | Implement real sparkline if team agrees; placeholder removal (BUG-04) is sufficient for v1.3 |
| Swipe-left-to-dismiss nudges | Enhancement beyond minimum WCAG fix; defer |
| Analytics overview charts | Summary stat cards (CON-01) are sufficient; full chart overhaul is v2 scope |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUG-01 | Phase 18 | Complete |
| BUG-02 | Phase 18 | Complete |
| BUG-03 | Phase 18 | Complete |
| BUG-04 | Phase 18 | Complete |
| DES-01 | Phase 19 | Pending |
| DES-02 | Phase 19 | Complete |
| DES-03 | Phase 19 | Complete |
| DES-04 | Phase 19 | Complete |
| MOB-01 | Phase 20 | Pending |
| MOB-02 | Phase 20 | Pending |
| MOB-03 | Phase 20 | Pending |
| MOB-04 | Phase 20 | Pending |
| MOB-05 | Phase 20 | Pending |
| CON-01 | Phase 21 | Pending |
| CON-02 | Phase 21 | Pending |
| CON-03 | Phase 21 | Pending |
| CON-04 | Phase 21 | Pending |
| CON-05 | Phase 21 | Pending |
| SCORE-01 | Phase 21 | Pending |
| SAFE-01 | Phase 22 | Pending |
| ERR-01 | Phase 22 | Pending |
| INP-01 | Phase 22 | Pending |
| POL-01 | Phase 23 | Pending |
| POL-02 | Phase 23 | Pending |
| POL-03 | Phase 23 | Pending |
| POL-04 | Phase 23 | Pending |
| POL-05 | Phase 23 | Pending |
| POL-06 | Phase 23 | Pending |
| POL-07 | Phase 23 | Pending |
| POL-08 | Phase 23 | Pending |
| POL-09 | Phase 23 | Pending |

**Coverage:**
- v1.3 requirements: 31 total
- Mapped to phases: 31 ✓
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-08*
*Source: UX audit of 35 screens × 4 configurations (desktop-light, desktop-dark, mobile-light, mobile-dark)*
*Last updated: 2026-03-08 — traceability populated (phases 18-23)*
