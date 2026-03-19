---
phase: 24
slug: sessions-access-control-and-pre-meeting-talking-points
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 24-01-01 | 01 | 1 | ACC-01 | unit | `bun run test -- series` | ✅ | ⬜ pending |
| 24-01-02 | 01 | 1 | ACC-02 | unit | `bun run test -- series` | ✅ | ⬜ pending |
| 24-01-03 | 01 | 1 | ACC-03 | unit | `bun run test -- series` | ✅ | ⬜ pending |
| 24-02-01 | 02 | 2 | TP-01 | unit | `bun run test -- talking-points` | ✅ | ⬜ pending |
| 24-02-02 | 02 | 2 | TP-02 | manual | — visual inspection | — | ⬜ pending |
| 24-02-03 | 02 | 2 | TP-03 | unit | `bun run test -- talking-points` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Agenda button shows only when scheduled session exists | TP-02 | Requires rendered component + DB state | Log in as manager, verify button appears on card with scheduled session, not on series with no/completed session |
| Admin sees own group first with "(You)" label | ACC-02 | Requires rendered component + role-based SSR | Log in as admin who is also manager, verify their group appears first with "(You)" suffix |
| Manager "My 1:1s" section shows manager name top-right | ACC-01 | UI/visual verification | Log in as user who reports to a manager, verify manager name appears muted top-right on cards |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
