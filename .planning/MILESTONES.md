# Milestones

## v1.5 Playwright E2E Test Suite (Shipped: 2026-03-16)

**Phases completed:** 10 phases, 36 plans, 10 tasks

**Key accomplishments:**
- (none recorded)

---

## v1.4 Session Corrections & Accountability (Shipped: 2026-03-16)

**Phases completed:** 10 phases, 36 plans, 10 tasks

**Key accomplishments:**
- (none recorded)

---

## v1.3 UI/UX Improvements (Shipped: 2026-03-16)

**Phases completed:** 10 phases, 36 plans, 10 tasks

**Key accomplishments:**
- (none recorded)

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
