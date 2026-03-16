# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-05
**Phases:** 10 | **Plans:** 40 | **Commits:** 224

### What Was Built
- Full AI-powered 1:1 meeting platform: wizard, AI pipeline, dashboard, analytics, email notifications
- Multi-tenant SaaS with PostgreSQL RLS, encrypted private notes, RBAC
- 41,464 LOC TypeScript/TSX across 290 source files
- Dark mode, org color themes, responsive design, E2E test suite

### What Worked
- **Phase-based planning with parallel execution**: Phases 6, 7, 9 ran in parallel after Phase 5, maximizing throughput
- **UAT-driven gap closure**: Phases 7 and 8 each got gap-closure plans from UAT feedback, catching real issues
- **Yolo mode**: Fully autonomous execution with no manual checkpoints — 40 plans executed hands-off
- **Direct AI pipeline over Inngest**: Removing Inngest mid-milestone simplified the architecture significantly
- **Design-first per-phase**: Embedding mockups in plan files rather than a separate design phase was faster

### What Was Inefficient
- **Summary file format inconsistency**: Most summaries have "Dependency graph" as title instead of meaningful names — one-liner extraction failed for 37/40 summaries
- **ROADMAP.md checkbox drift**: Phase checkboxes in ROADMAP.md weren't updated as phases completed (3-7 still unchecked despite being done)
- **Requirements checkbox drift**: 3 ORG requirements were unchecked despite features being built in Phase 2
- **Performance metrics incomplete**: STATE.md velocity table only covers 26/40 plans with inconsistent formatting

### Patterns Established
- Manual SQL migrations via Docker exec (drizzle-kit generate is interactive)
- Delete-then-insert for analytics snapshots (NULL-safe unique index handling)
- Server Components for reads, API routes for writes, TanStack Query for client mutations
- useReducer for complex UI state (wizard), Collapsible sections for panels
- navigator.sendBeacon for reliable auto-save on page close
- Optimistic claim pattern for cron jobs (UPDATE...RETURNING to prevent double-sends)
- Non-blocking notification scheduling (.catch() fire-and-forget pattern)

### Key Lessons
1. **Checkbox/status tracking needs automation** — manual checkbox updates in ROADMAP.md and REQUIREMENTS.md drifted. Consider hooks or post-plan automation.
2. **Summary files need enforced structure** — one-liner field should be required, not optional. Milestone archival depends on extractable accomplishments.
3. **AI pipeline simplification paid off** — removing Inngest in favor of direct async functions reduced complexity without losing reliability.
4. **Full-text search is sufficient for v1 AI context** — pgvector was correctly deferred; websearch_to_tsquery handles the current use case.
5. **4-day MVP delivery** demonstrates the efficiency of structured phase planning with autonomous execution.

### Cost Observations
- Model mix: Primarily Opus for planning/execution, Sonnet for AI features (summaries, nudges), Haiku for lightweight AI tasks
- Average plan execution: ~7 minutes
- Total execution time: ~4.6 hours across 40 plans
- Notable: Phase 8 plans averaged 4 min each (dashboard/analytics were fastest)

---

## Milestone: v1.1 — Internationalization

**Shipped:** 2026-03-07
**Phases:** 4 | **Plans:** 13

### What Was Built
- next-intl i18n framework with dual-layer architecture (UI language per-user, content language per-company)
- Complete EN+RO translation (~650-800 keys) across all pages, components, analytics charts, and email templates
- Locale-aware date/number/relative-time formatting; standalone email translator for background jobs
- CI key-parity test enforcing EN/RO symmetry; Romanian plural forms (ICU one/few/other), diacritics

### What Worked
- **Dual-layer architecture clarity**: Keeping UI language (per-user) and content language (per-company) strictly separate avoided late-stage confusion
- **Standalone createEmailTranslator**: use-intl/core works outside Next.js lifecycle — clean solution for background jobs
- **Phase 12 mega-phase design**: Batching all 16 UI translation requirements into one phase was efficient; fewer handoffs
- **Wave 0 TDD for import schema** (v1.2, pattern carried forward): writing failing tests before implementation caught interface mismatches early

### What Was Inefficient
- **TypeScript complexity workaround**: NamespaceKeys union exceeds type complexity at 16+ namespaces — `getTranslations()` without namespace + `as any` cast is a recurring workaround, not a real fix
- **Romanian curly quotes**: U+201D breaks JSON parsing — discovered during plan 02, could have been caught in translation review earlier

### Patterns Established
- `getTranslations()` without namespace + `(t as any)(\`ns.${key}\`)` for large namespace unions (TypeScript complexity limit)
- Server Components own locale-aware formatting; pass translated labels as props to client components to avoid extra hydration boundaries
- `useFormatter()` captured at component level, passed into closures for Recharts callbacks

### Key Lessons
1. **Content vs. UI language must be separated at the data layer** — conflating them would have required a v2 refactor
2. **Locale-aware formatting needs to be applied everywhere at once** — chart axes and tooltips are easy to miss
3. **Romanian ICU plurals require three forms** (one/few/other) — CLDR spec; "few" and "other" can have identical text per spec

---

## Milestone: v1.2 — AI-Ready Templates

**Shipped:** 2026-03-07
**Phases:** 3 | **Plans:** 16

### What Was Built
- TemplateExport interface + `buildExportPayload()` — TDD-validated, UUID-stripped, portable JSON
- Export API + `/templates/schema` docs page with JSON Schema / Methodology / Score Weights tabs (EN+RO)
- ExportButton component — role-gated (admin/manager), hover-reveal on cards and editor toolbar
- Template import pipeline — Zod validation, preview stats, conflict detection, atomic insert with audit log
- Multi-step ImportDialog — language mismatch warning, rename/copy/cancel conflict, field-specific errors
- Full AI template editor — chat→generate→preview→save, company language, version history, resizable panels
- DIY Prompt Kit tab — copyable schema + methodology + worked example for external AI tools

### What Worked
- **TDD Wave 0 contract-first**: Writing failing test stubs before implementation (phases 15, 16, 17) caught interface mismatches before wiring — zero regression in downstream plans
- **Parallel execution (16 + 17 after 15)**: Both import and AI generator depended only on Phase 15 schema — running in parallel compressed timeline significantly
- **Reusing existing patterns**: Export followed `csv-export-button.tsx` blob download pattern; AI chat extended existing Vercel AI SDK pipeline; import route followed template builder atomic insert
- **Import route uses existing `/api/templates/import`**: Using POST import for both ImportDialog and AI editor save avoids a PATCH batch-save UUID-tracking problem — clean import creates fresh copy
- **Auto-advance**: All verification checkpoints (15-04, 16-05, 17-07) auto-approved via yolo mode + auto_advance

### What Was Inefficient
- **Pre-existing Playwright e2e conflicts**: 8 Playwright spec files picked up by Vitest due to config overlap — causes confusing test output without affecting unit tests; should be resolved for v1.3
- **AI editor layout regressions**: Multiple fixes needed for h-screen + overflow (`(fullscreen)` route group, `fixed inset-0`) — full-page editor patterns aren't covered by dashboard layout conventions

### Patterns Established
- Export transform: build UUID→sortOrder map first, then map sections/questions stripping internal fields
- Hover-reveal action buttons on cards: relative wrapper + `group`/`group-hover` Tailwind classes + absolute button
- AI chat route: no `withTenantContext` (no DB transaction needed for AI-only routes); use session content language directly
- DIY Prompt Kit: assembled server-side with translated headers + English JSON technical content

### Key Lessons
1. **Full-page (fullscreen) layouts need their own route group** — dashboard layout constraints (overflow, height) break full-page editors
2. **TDD Wave 0 is worth the 10-minute upfront cost** — it prevents cross-plan interface drift in multi-plan features
3. **AI generation prompt must include schema + methodology** — unguided AI output doesn't conform to scoring/weight conventions

### Cost Observations
- Sessions: 3 (one per phase approximately)
- Notable: Phase 17 was the heaviest (7 plans, AI UI components) but self-contained within one session

---

## Milestone: v1.3 — UI/UX Improvements

**Shipped:** 2026-03-16
**Phases:** 5 (18-22) | **Plans:** 18 | **Timeline:** 2026-03-08 → 2026-03-16 (8 days)

### What Was Built
- **Critical Bugs**: `contentToHtml()` utility for Tiptap JSON→HTML rendering; spec.json i18n namespace fix; AI editor mobile tab layout
- **Design System**: `EmptyState` shared component replacing 10 inline patterns; badge variant semantics (default=active, outline=complete); sentence-case section headers; button color audit
- **Mobile Responsiveness**: 44px touch targets on nudge cards; responsive column hiding via TanStack Table `meta.className`; dual-layout template editor with mobile overflow menu
- **Content & Data Display**: Numeric score badges on series cards; collapsible Talking Points/Action Items with count badges in wizard; team heatmap contributor threshold guard; aggregate analytics stat cards
- **Safety & Inputs**: Danger Zone with AlertDialog confirmation for destructive delete; shared DatePicker (react-day-picker v9 + date-fns); contextual 404 page scoped to session summary segment

### What Worked
- **TDD Wave 0 for all phases**: RED tests first on phases 19, 20, 22 — caught component interface mismatches before implementation on every phase
- **Audit-driven requirements**: Starting from UX audit findings (POL-*, DES-*, MOB-*, CON-*, SAFE-*, ERR-*, INP-*) made scope crisp and measurable
- **Dual-layout Tailwind pattern**: `hidden md:flex` / `flex md:hidden` sibling elements for responsive action bars — clean, no JS required
- **Controlled dialog from DropdownMenuItem**: Avoided Radix portal/focus-trap conflicts by using `onSelect + useState` instead of nested `DialogTrigger`

### What Was Inefficient
- **Phase 22 out-of-order execution**: Plans 22-01→04 were built but then additional plans ran after phase 28 was complete — history entries in STATE.md appear out of sequence
- **shadcn CLI unavailable**: `calendar.tsx` had to be written manually because `bunx shadcn` isn't accessible in execution context — requires knowing react-day-picker v9 API from memory

### Patterns Established
- `EmptyState` API: `icon?`, `heading`, `description?`, `action?`, `className?` — standardized across 10+ locations
- Badge semantics: `default` = active/in-progress (heavy), `outline` = completed/receded (light), `destructive` = error
- `meta.className` on TanStack Table `ColumnDef` for responsive column hiding — apply to both `TableHead` and `TableCell`
- `not-found.tsx` at segment level (not route level) to scope 404 interception precisely
- DatePicker string boundary: component accepts/emits `YYYY-MM-DD` string, never `Date` objects to consumers

### Key Lessons
1. **UX audit as milestone input works well** — external audit → requirement codes → phases → measurable success criteria is a clean pipeline
2. **Responsive patterns belong in design system** — dual-layout and `meta.className` patterns are now reusable conventions for all future tables and action bars
3. **Wave 0 TDD caught real issues again** — @testing-library/react install requirement discovered at Phase 19 Wave 0, not mid-phase
4. **react-day-picker v9 is a major API change from v8** — DayPicker props changed significantly; `shadcn` CLI would have handled this automatically

---

## Milestone: v1.4 — Session Corrections & Accountability

**Shipped:** 2026-03-16
**Phases:** 4 (24-27) | **Plans:** 12 | **Timeline:** 2026-03-10 → 2026-03-13 (3 days)

### What Was Built
- **Schema Foundation**: `session_answer_history` append-only table (typed snapshot columns, tenant_id RLS, FORCE RLS for adminDb); `notificationTypeEnum` extended with `session_correction` via hand-written ALTER TYPE migration; Drizzle journal gap fixed
- **Core API**: `canCorrectSession()` RBAC helper; `validateCorrectionReason()` AI service (claude-haiku, degrades to `{pass:true}` on outage); correction mutation route (atomic: history snapshot + answer update + score recompute + audit log in one transaction); validate-reason AI route (advisory-only, no DB writes)
- **Email Notification & i18n**: `CorrectionEmail` React Email component (EN+RO); `sendCorrectionEmails()` with 5-minute session-level deduplication; fire-and-forget IIFE pattern in mutation route; adminDb for post-commit email context resolution
- **UI Integration**: `AmendedBadge` on corrected answer rows; inline `AnswerCorrectionForm` with debounced AI feedback; `CorrectionHistoryPanel` (collapsed when empty, expanded when corrections present); full Vitest suite with happy-dom environment

### What Worked
- **Strict phase dependency chain** (schema → API → email → UI): Zero rework across phases — each layer consumed the previous cleanly
- **AI-advisory-only validation**: AI outages degrade gracefully to `{pass:true}` — never blocks the mutation, never causes user-facing failures
- **Chainable adminDb mock**: vi.mock factory returning `select().from().where().limit()` resolving to `[]` — enables dedup tests without per-test setup
- **`computeSessionScore` already implemented**: TDD RED tests discovered the function was already green — research phase saved implementation time

### What Was Inefficient
- **Drizzle migration tracking gap**: 6 migrations (0012-0017) unregistered in `__drizzle_migrations` — required manual INSERT fix before new migration could apply
- **Enum extension requires hand-written SQL**: drizzle-kit cannot handle `ALTER TYPE ... ADD VALUE` without dropping FK references — this pattern will recur whenever enums are extended

### Patterns Established
- Hand-written `ALTER TYPE ... ADD VALUE IF NOT EXISTS` migration pattern for extending PostgreSQL enums
- IIFE `(async () => { ... })()` fire-and-forget in API routes for post-commit async work (email sends)
- `adminDb` acceptable for notification infrastructure (outside RLS, operates on resolved context)
- AI validation endpoint: separate route, auth-only RBAC (no series check), returns `{pass, feedback}` — never a database write
- `correctionsByAnswerId: Map<string, Correction[]>` — O(1) lookup pattern for per-row badge display

### Key Lessons
1. **Enum extension is always hand-written SQL** — drizzle-kit generate breaks FK references when altering enums; document this as a standing pattern
2. **Migration tracking gaps accumulate silently** — `__drizzle_migrations` can fall out of sync; always verify before running `drizzle-kit migrate` on a mature DB
3. **AI as advisory layer (not gate) is the right UX** — blocking form submission on AI validation result would create frustrating experience; pass/fail is guidance, not enforcement
4. **Zod v4 uses `.issues` not `.errors`** — breaking change from Zod v3; affects ZodError catch blocks everywhere

---

## Milestone: v1.5 — Playwright E2E Test Suite

**Shipped:** 2026-03-16
**Phases:** 1 (28) | **Plans:** 6 | **Timeline:** 2026-03-13 → 2026-03-13 (1 day)

### What Was Built
- **Auth setup fix**: Resolved `CallbackRouteError` — auth uses `signIn(provider, credentials)` directly, not form submission; reusable `adminPage`, `managerPage`, `memberPage` fixtures with `storageState`
- **Core flow specs**: login/logout, dashboard load, sessions list, start-session wizard (complete flow), session summary page — semantic selectors throughout
- **RBAC specs**: manager can open correction form; member cannot see edit icon or correction controls
- **Template & People specs**: template CRUD (create, add section, add question, archive), people management flows
- **CI pipeline**: `bun run test:e2e` script; GitHub Actions workflow with Neon/local DB detection, browser install caching, `PLAYWRIGHT_BROWSERS_PATH`
- **Seed UUID fix**: Replaced 6000-variant UUIDs with RFC4122 8000-variant — enables correction POST (Zod uuid() validation); `DELETE` old rows before insert for idempotent re-seeding

### What Worked
- **Playwright fixtures for multi-role tests**: Fresh browser context per test enables role-switching within the same spec — cleaner than `storageState` at project level
- **Semantic selectors throughout**: Initials-based button (`getByRole('button', { name: /^AJ$/ })`), `menuitem` for Radix dropdowns — zero brittle CSS selector dependencies
- **Neon/local DB detection**: `URL.includes('.neon.tech')` pattern → WebSocket pool vs standard pg — enables same code to run in both CI and local dev
- **Debug spec as diagnostic tool**: Structured browser error capture → diagnosis conclusion in SUMMARY.md — the `[object ErrorEvent]` crash was attributed to Next.js HMR WebSocket, not app code

### What Was Inefficient
- **Seed UUID variant bug**: 6000-variant UUIDs (not RFC4122 compliant) caused `canCorrectSession` Zod validation to fail — required a second gap-closure plan to fix
- **Template flow brittleness**: Template create redirects to detail page in some environments — test had to handle both list and detail outcomes after creation

### Patterns Established
- Playwright fixtures pattern: `adminPage`, `managerPage`, `memberPage` via `test.extend()` — one fixture file, role-specific test context
- `vitest.config.ts` exclude: `['e2e/**', 'node_modules/**']` — prevents Playwright specs from being picked up by Vitest
- `PLAYWRIGHT_BROWSERS_PATH=/home/runner/.cache/ms-playwright` in GitHub Actions — browser binary caching
- `DELETE` old seed rows before insert when PKs change between runs — idempotent seeding for UUID-keyed tables

### Key Lessons
1. **Auth setup is the critical path for E2E** — once `storageState` is reliable, all subsequent specs run cleanly
2. **Seed data UUID compliance matters** — Zod `uuid()` validates RFC4122 variant bits; seeded test data must use proper UUIDs
3. **Playwright fixtures > storageState at project level** for multi-role specs — fresh context per test avoids cross-test contamination
4. **E2E suite maintenance requires fixtures abstraction** — role fixtures make it easy to add new specs without re-implementing auth

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 10 | 40 | First milestone — established all patterns |
| v1.1 | 4 | 13 | Mega-phase design; email standalone translator |
| v1.2 | 3 | 16 | TDD Wave 0 contract-first; parallel phases after schema |
| v1.3 | 5 | 18 | Audit-driven requirements; dual-layout Tailwind pattern |
| v1.4 | 4 | 12 | Strict dependency chain; AI-advisory-only pattern |
| v1.5 | 1 | 6 | Playwright fixtures; CI pipeline; UUID compliance fix |

### Cumulative Quality

| Milestone | Unit Tests | LOC | Source Files |
|-----------|------------|-----|--------------|
| v1.0 | initial suite | 41,464 | 290 |
| v1.1 | + CI key-parity test | ~49,000 | ~310 |
| v1.2 | + export/import/AI contract tests | ~+26,500 | 323 |
| v1.3 | + EmptyState, badge, mobile, date-picker tests | ~+4,000 | ~335 |
| v1.4 | + correction API, email dedup, UI component tests | ~+5,000 | ~345 |
| v1.5 | + full Playwright E2E suite + CI | 52,632 | 345 |

### Top Lessons (Verified Across Milestones)

1. Phase-based planning with parallel execution paths maximizes throughput
2. UAT gap closure as explicit follow-up plans catches real integration issues
3. Autonomous execution (yolo mode) works when plans are well-structured
4. TDD Wave 0 (contract-first failing stubs) prevents cross-plan interface drift in multi-plan features
5. Architecture decisions made at phase boundaries (dual-layer i18n, portable JSON schema, AI-advisory-only) pay dividends for downstream phases
6. Audit-driven requirements (external UX audit → requirement codes) produce crisp, measurable success criteria
7. E2E test suite requires fixtures abstraction from day one — role fixtures make new specs cheap to add
