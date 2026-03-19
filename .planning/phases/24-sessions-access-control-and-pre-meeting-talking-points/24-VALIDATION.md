---
phase: 24
slug: sessions-access-control-and-pre-meeting-talking-points
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-19
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `bun run test` |
| **Full suite command** | `bun run test && bun run typecheck` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run test`
- **After every plan wave:** Run `bun run test && bun run typecheck`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 24-00-01 | 00 | 0 | ACC-01, ACC-02, ACC-03 | unit | `bun run test -- src/lib/queries/__tests__/series.test.ts` | Wave 0 creates | ⬜ pending |
| 24-00-02 | 00 | 0 | TP-01 | unit | `bun run test -- src/app/api/sessions/__tests__/talking-points.test.ts` | Wave 0 creates | ⬜ pending |
| 24-01-01 | 01 | 1 | ACC-01, ACC-02, ACC-03 | unit | `bun run test -- src/lib/queries/__tests__/series.test.ts` | Created by 24-00 | ⬜ pending |
| 24-01-02 | 01 | 1 | ACC-04, TP-01 | unit | `bun run test -- src/app/api/sessions/__tests__/talking-points.test.ts` | Created by 24-00 | ⬜ pending |
| 24-02-01 | 02 | 2 | TP-02 | manual | -- visual inspection | -- | ⬜ pending |
| 24-02-02 | 02 | 2 | TP-03, I18N-01 | unit | `bun run test && bun run typecheck` | -- | ⬜ pending |

*Status: ⬜ pending / ✅ green / ❌ red / ⚠️ flaky*

---

## Wave 0 Requirements

Plan 24-00 (Wave 0, TDD) creates the following test files BEFORE implementation begins:

| File | Created By | Tests |
|------|-----------|-------|
| `src/lib/queries/__tests__/series.test.ts` | 24-00 Task 1 | SeriesCardData contract (manager field, scheduledAt, talkingPointCount), role filtering smoke |
| `src/app/api/sessions/__tests__/talking-points.test.ts` | 24-00 Task 2 | Status gate contract (scheduled accepted, completed rejected) |

These tests establish behavioral contracts. Plan 01 makes the series contract tests pass (by extending SeriesCardData and fixing the manager OR-query). Plan 01 Task 2 ensures the talking-points route matches the status gate contract.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Agenda button shows only when scheduled session exists | TP-02 | Requires rendered component + DB state | Log in as manager, verify button appears on card with scheduled session, not on series with no/completed session |
| Admin sees own group first with "(You)" label | ACC-02 | Requires rendered component + role-based SSR | Log in as admin who is also manager, verify their group appears first with "(You)" suffix |
| Manager "My 1:1s" section shows manager name top-right | ACC-01 | UI/visual verification | Log in as user who reports to a manager, verify manager name appears muted top-right on cards |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved
