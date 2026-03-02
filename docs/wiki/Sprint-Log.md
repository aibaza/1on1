# Sprint Log

## Overview

Implementation plan for the 1on1 MVP (v1), broken into 15 two-week sprints. Each sprint has focused goals, concrete deliverables, and acceptance criteria. Sprints are ordered by dependency — each sprint builds on the previous ones.

**Total estimated timeline**: 30 weeks (15 sprints x 2 weeks)

## Sprint Summary

| Sprint | Name | Focus | Dependencies |
|--------|------|-------|-------------|
| [[Sprint-01]] | Bootstrap & Infrastructure | Next.js project setup, tooling, CI | None |
| [[Sprint-02]] | Database Schema & RLS | All Drizzle schemas, RLS policies, migrations | Sprint 01 |
| [[Sprint-03]] | Auth & Company Onboarding | Registration, login, OAuth, setup wizard | Sprint 02 |
| [[Sprint-04]] | User Management & Invites | Invite flow, profiles, roles, org chart | Sprint 03 |
| [[Sprint-05]] | Team Management | Team CRUD, membership, people directory | Sprint 04 |
| [[Sprint-06]] | Template Builder | Template CRUD, 6 answer types, drag-and-drop | Sprint 04 |
| [[Sprint-07]] | Meeting Series & Scheduling | Series CRUD, cadence, auto-scheduling | Sprint 05, 06 |
| [[Sprint-08]] | Session Wizard — Core | Session state machine, question flow, answer widgets, auto-save | Sprint 07 |
| [[Sprint-09]] | Session Wizard — Context & Notes | Context panel, shared/private notes, talking points, summary | Sprint 08 |
| [[Sprint-10]] | Action Items | Action item CRUD, status tracking, list view | Sprint 09 |
| [[Sprint-11]] | Manager Dashboard | Dashboard widgets, upcoming sessions, overdue items, stats | Sprint 10 |
| [[Sprint-12]] | Session History & Search | Timeline view, detail view, full-text search, filters | Sprint 09 |
| [[Sprint-13]] | Basic Analytics | Score trends, category charts, snapshots, CSV export | Sprint 12 |
| [[Sprint-14]] | Email Notifications | Resend setup, email templates, Inngest reminder jobs | Sprint 10 |
| [[Sprint-15]] | Polish & Launch Prep | Responsive design, dark mode, accessibility, security hardening, testing | Sprint 01-14 |

## Dependency Graph

```
Sprint 01 (Bootstrap)
  └── Sprint 02 (DB Schema)
        └── Sprint 03 (Auth)
              └── Sprint 04 (Users)
                    ├── Sprint 05 (Teams)
                    │     └─┐
                    │        ├── Sprint 07 (Series)
                    └── Sprint 06 (Templates)
                          └─┘
                              └── Sprint 08 (Wizard Core)
                                    └── Sprint 09 (Context & Notes)
                                          ├── Sprint 10 (Actions)
                                          │     ├── Sprint 11 (Dashboard)
                                          │     └── Sprint 14 (Email)
                                          └── Sprint 12 (History)
                                                └── Sprint 13 (Analytics)

Sprint 15 (Polish) ← depends on all above
```

## Conventions

- Each sprint page lists **Goals**, **Deliverables**, **Acceptance Criteria**, and **Key Files**
- Acceptance criteria are testable conditions that define "done"
- Key files list the primary files/directories that will be created or modified
- Sprints 05 and 06 can run in parallel if two developers are available
- Sprints 11 and 12 can run in parallel
- Sprints 13 and 14 can run in parallel
