# Milestones

## v1.7.0 Unified AI + Infrastructure (Released: 2026-03-21)

**Work done outside GSD phase system.**
**Git tag:** v1.7.0

**Delivered:** Unified AI pipeline (3 calls → 1 Sonnet call), company context for AI (Internal Manifesto + team descriptions), shared SessionListItem component with sentiment borders, Vercel Web Analytics, Frankfurt serverless region, dev preview environment, and AI score migration to 1-5 scale.

**Key accomplishments:**
1. Unified AI pipeline: single `analyzeSession` call replaces `generateSummary` + `generateManagerAddendum` + `generateActionSuggestions`
2. Company "Internal Manifesto" textarea in org settings — fed to AI as company context
3. Team description included in AI context for session analysis
4. Full session history sent to AI (tiered: recent 5 full, older summaries only)
5. `objectiveRating` (1-5 stars) replaces `assessmentScore` (1-100)
6. `SessionListItem` shared component — unified session row with sentiment color borders
7. Vercel Web Analytics integration
8. Vercel serverless moved to Frankfurt (fra1) — eliminates transatlantic DB round-trip
9. Dev preview environment (`develop` branch + separate Neon DB)
10. Quick deploy script + simplified pre-push hook (typecheck only)

---

## v1.6 Polish + Versioning (Shipped: 2026-03-20)

**Phases completed:** 3 phases (23, 24, 29), 8 plans

**Delivered:** Low-priority UI polish (9 visual/copy tweaks), role-based sessions access control with talking points, and template versioning with snapshot-on-publish, version history UI, diff, and restore.

**Key accomplishments:**
1. Registration placeholder, audit log casing, forgot-password centering, active badge, action items divider, dark mode team cards, empty series link, mobile history search
2. Role-based series filtering (admin/manager/member views), talking points status gate relaxation
3. AgendaSheet component for pre-meeting talking points
4. Template versioning: `template_version` table with JSONB snapshots on publish
5. Version history UI: read-only preview, change list diff, restore capability

---

## v1.5 Playwright E2E Test Suite (Shipped: 2026-03-13)

**Phases completed:** 1 phase (28), 6 plans

**Delivered:** Full Playwright E2E test suite with multi-role auth setup, flow coverage across sessions/templates/people/analytics, RBAC assertions, correction specs, and GitHub Actions CI pipeline.

**Key accomplishments:**
1. Multi-role fixture system (admin/manager/member) with persistent auth state
2. Full flow E2E specs: session wizard, template CRUD, people management, analytics
3. RBAC boundary assertions — role isolation verified end-to-end
4. Correction flow E2E with amended badge verification
5. GitHub Actions CI workflow with Docker PostgreSQL service

---

## v1.4 Session Corrections & Accountability (Shipped: 2026-03-13)

**Phases completed:** 4 phases (24-27), 12 plans

**Delivered:** Manager can amend answers in completed sessions with append-only audit history, AI-validated correction reasons, atomic writes, email notifications with 5-minute deduplication.

**Key accomplishments:**
1. `session_answer_history` append-only table with RLS and direct `tenant_id`
2. AI reason validation via Claude Haiku (advisory-only — never blocks submission)
3. Atomic correction: history insert + answer update + audit log in single transaction
4. Correction email template (EN+RO) with session-level 5-minute deduplication
5. Correction dialog UI, Amended badge, correction history panel in session detail

---

## v1.3 UI/UX Improvements (Shipped: 2026-03-16)

**Phases completed:** 5 phases (18-22), 18 plans

**Delivered:** Design system consistency (badge semantics, sentence-case, EmptyState component), mobile responsiveness (44px touch targets, responsive columns, overflow menus), content display improvements (score badges, collapsible sections, analytics stats), and safety patterns (Danger Zone, shared DatePicker, contextual 404).

**Key accomplishments:**
1. Badge semantic system: status/type/info variants with consistent styling
2. EmptyState shared component used across all empty views
3. Mobile-first responsive tables with column priority hiding
4. Collapsible wizard sections with answer counts
5. Danger Zone pattern with AlertDialog for destructive actions
6. Shared DatePicker component for consistent date input across history/audit pages

---

## v1.2 AI-Ready Templates (Shipped: 2026-03-07)

**Phases completed:** 3 phases (15-17), 16 plans
**Timeline:** 2 days (2026-03-06 → 2026-03-07)
**Files changed:** 268 (26,546 insertions, 1,859 deletions) since v1.1
**Git tag:** v1.2.0

**Delivered:** Template portability and AI co-authoring — users can export/import templates as tenant-neutral JSON, generate templates via in-app AI chat in their company language, and access a copyable DIY prompt kit for external AI tools.

**Key accomplishments:**
1. TemplateExport interface + `buildExportPayload()` — TDD-validated UUID stripping and portable JSON contract (EXP-02 through EXP-05)
2. Export API (`GET /api/templates/[id]/export`) + `/templates/schema` docs page — 3-tab JSON Schema/Methodology/Weights in EN+RO
3. ExportButton component with role-gating (admin/manager only), hover-reveal on template cards and editor toolbar
4. Template import pipeline — `templateImportSchema` Zod validation, `derivePreviewStats`, conflict detection, atomic insert with audit log
5. Multi-step ImportDialog — language mismatch warning, rename/copy/cancel conflict resolution, field-specific validation errors
6. AI template editor — chat→generate→preview→save with company language awareness, version history, resizable panels
7. DIY Prompt Kit tab — copyable schema + methodology + worked example for Claude, ChatGPT, etc.

---

## v1.1 Internationalization (Shipped: 2026-03-07)

**Phases completed:** 4 phases (11-14), 13 plans
**Timeline:** 2 days (2026-03-05 → 2026-03-07)
**Git tag:** v1.1

**Delivered:** Full i18n framework with dual-layer architecture (per-user UI language + per-company content language), complete English and Romanian translations (~650-800 keys), locale-aware formatting throughout.

**Key accomplishments:**
1. next-intl framework with middleware locale resolution, DB preference propagation via JWT, independent UI/content language layers
2. Complete UI translation across all 10 major page groups (auth, dashboard, wizard, people, templates, analytics, settings, command palette)
3. Locale-aware date/number/relative-time formatting in all components including analytics chart axes and tooltips
4. Standalone `createEmailTranslator` utility (use-intl/core) for background job email translation outside Next.js request lifecycle
5. Complete Romanian translations with correct ICU plural forms (one/few/other), comma-below diacritics, no layout overflow
6. CI key-parity Vitest test enforcing EN/RO translation key symmetry

---

## v1.0 MVP (Shipped: 2026-03-05)

**Phases completed:** 10 phases, 40 plans
**Timeline:** 4 days (2026-03-02 → 2026-03-05)
**Commits:** 224 (73 feature commits)
**Codebase:** 41,464 LOC TypeScript/TSX across 290 source files
**Git range:** 4de0b8e → a68f772

**Delivered:** Complete AI-powered 1:1 meeting management platform with structured session wizard, AI insights pipeline, manager dashboard with analytics, and multi-tenant infrastructure.

**Key accomplishments:**
1. Multi-tenant foundation with PostgreSQL RLS, AES-256-GCM encryption, Docker & Vercel deployment
2. Auth system: email/password, Google/Microsoft OAuth, password reset, session management
3. Organization management: invites, RBAC (admin/manager/member), teams, reporting lines, audit log
4. Template builder: 6 question types, versioning, drag-and-drop reordering, conditional logic
5. Session wizard: step-by-step flow, context panel with history, auto-save, talking points, private notes, inline action items
6. AI pipeline: post-session summaries, pre-session nudges, suggested action items (Vercel AI SDK)
7. Manager dashboard: upcoming sessions, overdue items, quick stats, recent sessions
8. Analytics: score trends, category breakdown, team heatmap, velocity charts, meeting adherence, CSV export
9. Email notifications: invites, reminders, agenda prep, post-session summaries with AI insights
10. Polish: dark mode, org color themes, horizontal nav, responsive design, E2E tests

**Known Gaps:**
- AI-06 (pgvector embeddings): Deferred to v2. Full-text search used for AI context retrieval instead.

---
