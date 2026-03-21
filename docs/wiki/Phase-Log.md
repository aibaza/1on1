# Phase Log

## Overview

Implementation follows a phase-based roadmap managed via the [GSD workflow](https://github.com/cyanheads/claude-gsd). Each phase delivers a coherent, verifiable capability. Phases execute sequentially with some parallelization opportunities after Phase 5.

**Total phases**: 29 across 7 milestones (+ v1.7.0 non-phase work)
**Completed**: 29/29
**Latest release**: v1.7.0 (2026-03-21) — all milestones archived

## Phase Summary

### Milestone v1.0 — MVP (Shipped 2026-03-05)

| Phase | Name | Focus | Status | Dependencies |
|-------|------|-------|--------|--------------|
| [[Phase-01]] | Foundation & Infrastructure | Next.js scaffold, Docker, Drizzle schema, RLS, encryption | Complete | None |
| [[Phase-02]] | Authentication & Organization | Auth flows, org registration, multi-tenancy, settings | Complete | Phase 1 |
| [[Phase-03]] | User & Team Management | Invites, profiles, RBAC, teams, reporting lines, audit log | Complete | Phase 2 |
| [[Phase-04]] | Questionnaire Templates | Template builder, 6 question types, versioning, conditional logic | Complete | Phase 3 |
| [[Phase-05]] | Meeting Series & Session Wizard | Series lifecycle, step-by-step wizard, context panel, notes | Complete | Phase 4 |
| [[Phase-06]] | Action Items & Session History | Action tracking, carry-over, session timeline, full-text search | Complete | Phase 5 |
| [[Phase-07]] | AI Pipeline | Session summaries, pre-session nudges, direct pipeline, Vercel AI SDK | Complete | Phase 5 |
| [[Phase-08]] | Manager Dashboard & Analytics | Dashboard, score charts, team analytics, CSV export | Complete | Phase 6, 7 |
| [[Phase-09]] | Email Notifications | Invite emails, reminders, post-session summaries | Complete | Phase 5 |
| [[Phase-10]] | Integration & Polish | Dark mode, top nav, wizard redesign, responsive polish, E2E tests | Complete | Phase 8, 9 |

### Milestone v1.1 — Internationalization (Shipped 2026-03-07)

| Phase | Name | Focus | Status | Dependencies |
|-------|------|-------|--------|--------------|
| [[Phase-11]] | i18n Foundation | next-intl setup, DB migration, JWT extension, dual-layer locale architecture | Complete | Phase 10 |
| [[Phase-12]] | UI Translation | All string extraction, locale-aware formatting, validation errors, series card redesign | Complete | Phase 11 |
| [[Phase-13]] | Email Translation | Email templates in correct content language, standalone translator for background jobs | Complete | Phase 11 |
| [[Phase-14]] | Romanian & Quality | Complete RO translations, plural forms, diacritics, CI key parity | Complete | Phase 12, 13 |

### Milestone v1.2 — AI-Ready Templates (Shipped 2026-03-07)

| Phase | Name | Focus | Status | Dependencies |
|-------|------|-------|--------|--------------|
| [[Phase-15]] | Schema, Spec & Export | JSON schema spec with methodology and weight docs, portable JSON template export | Complete | Phase 14 |
| [[Phase-16]] | Template Import | JSON upload with preview, language mismatch warning, conflict resolution, field-specific validation errors | Complete | Phase 15 |
| [[Phase-17]] | AI Generator & DIY Kit | In-app AI chat editor for template generation, live preview, DIY prompt kit tab | Complete | Phase 15 |

### Milestone v1.3 — UI/UX Improvements (Shipped 2026-03-16)

| Phase | Name | Focus | Status | Dependencies |
|-------|------|-------|--------|--------------|
| [[Phase-18]] | Critical Bugs | Tiptap render fix, AI editor mobile, i18n spec.json, sparkline placeholder | Complete | Phase 17 |
| [[Phase-19]] | Design System | Badge semantics, casing, EmptyState component | Complete | Phase 18 |
| [[Phase-20]] | Mobile Responsiveness | Template action bars, touch targets, responsive table columns | Complete | Phase 19 |
| [[Phase-21]] | Content & Data Display | Analytics stat cards, score badges, collapsible sections, heatmap threshold | Complete | Phase 19 |
| [[Phase-22]] | Safety, Errors & Inputs | Danger zone, 404 pages, date picker consistency | Complete | Phase 19 |

### Milestone v1.4 — Session Corrections & Accountability (Shipped 2026-03-13)

| Phase | Name | Focus | Status | Dependencies |
|-------|------|-------|--------|--------------|
| [[Phase-24]] | Schema Foundation | Append-only history table with RLS, notificationTypeEnum extension, migration | Complete | Phase 23 |
| [[Phase-25]] | Core API & Business Logic | RBAC helper, AI validation service, atomic correction route, audit log, score recompute | Complete | Phase 24 |
| [[Phase-26]] | Email Notification & i18n | Correction email template EN+RO, session-level deduplication sender | Complete | Phase 25 |
| [[Phase-27]] | UI Integration | Correction dialog, Amended badge, correction history panel wired into session detail | Complete | Phase 26 |

### Milestone v1.5 — Playwright E2E Test Suite (Shipped 2026-03-13)

| Phase | Name | Focus | Status | Dependencies |
|-------|------|-------|--------|--------------|
| [[Phase-28]] | Playwright E2E Test Suite | Auth setup, full flow coverage, RBAC assertions, corrections specs, CI pipeline | Complete | Phase 27 |

### Milestone v1.6 — Polish + Versioning (Shipped 2026-03-20)

| Phase | Name | Focus | Status | Dependencies |
|-------|------|-------|--------|--------------|
| [[Phase-23]] | Low-Priority Polish | 9 small text/visual/layout tweaks | Complete | Phase 19 |
| [[Phase-24]] | Sessions Access Control & Talking Points | Role-based series filtering, AgendaSheet component | Complete | Phase 23 |
| [[Phase-29]] | Template Versioning & Answer Remapping | Snapshot-on-publish, version history UI, diff, restore | Complete | Phase 24 |

### v1.7.0 — Unified AI + Infrastructure (Released 2026-03-21)

No GSD phases — work done outside the phase system:
- Unified AI pipeline (3 calls → 1 Sonnet call)
- Company "Internal Manifesto" + team context for AI
- SessionListItem shared component + sentiment borders
- Vercel Web Analytics
- Vercel serverless moved to Frankfurt (fra1)
- Dev preview environment (develop branch + separate Neon DB)
- AI assessment score migrated from 1-100 to 1-5

## Execution Order

### v1.0 Phases

```
Phase 1 (Foundation)
  └── Phase 2 (Auth)
        └── Phase 3 (Users & Teams)
              └── Phase 4 (Templates)
                    └── Phase 5 (Series & Wizard)
                          ├── Phase 6 (Action Items)
                          ├── Phase 7 (AI Pipeline)     ← parallel
                          └── Phase 9 (Email)
                                │
                          Phase 6 + 7 ──► Phase 8 (Dashboard & Analytics)
                          Phase 8 + 9 ──► Phase 10 (Polish)
```

### v1.1 Phases

```
Phase 10 (Polish, v1.0 complete)
  └── Phase 11 (i18n Foundation)
        ├── Phase 12 (UI Translation)   ← parallel
        └── Phase 13 (Email Translation)
              │
        Phase 12 + 13 ──► Phase 14 (Romanian & Quality)
```

### v1.2 Phases

```
Phase 14 (v1.1 complete)
  └── Phase 15 (Schema, Spec & Export)
        ├── Phase 16 (Template Import)    ← parallel
        └── Phase 17 (AI Generator & DIY Kit)
```

### v1.3 Phases

```
Phase 17 (v1.2 complete)
  └── Phase 18 (Critical Bugs)
        └── Phase 19 (Design System)
              ├── Phase 20 (Mobile Responsiveness)   ← parallel
              ├── Phase 21 (Content & Data Display)
              └── Phase 22 (Safety, Errors & Inputs)
```

### v1.4 Phases

```
Phase 22 (v1.3 complete)
  └── Phase 24 (Schema Foundation)
        └── Phase 25 (Core API & Business Logic)
              └── Phase 26 (Email Notification & i18n)
                    └── Phase 27 (UI Integration)
```

### v1.5 Phases

```
Phase 27 (v1.4 complete)
  └── Phase 28 (Playwright E2E Test Suite)
```

### v1.6 Phases

```
Phase 19 (Design System, v1.3)
  └── Phase 23 (Low-Priority Polish)
        └── Phase 24 (Sessions Access Control & Talking Points)
              └── Phase 29 (Template Versioning & Answer Remapping)
```

## Conventions

- Each phase page lists **Goal**, **Success Criteria**, **Plans**, and **Key Decisions**
- Success criteria are testable conditions that define "done"
- Completed phases include what was built and key files created
- Phase plans are tracked in `.planning/phases/{phase-name}/` in the repo
