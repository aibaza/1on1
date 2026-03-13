---
phase: 26
slug: email-notification-i18n
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `bun run test --reporter=verbose src/lib/notifications/` |
| **Full suite command** | `bun run test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run test --reporter=verbose src/lib/notifications/`
- **After every plan wave:** Run `bun run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 26-01-01 | 01 | 0 | NOTIF-01 | unit | `bun run test src/lib/notifications/correction-email.test.ts` | ❌ W0 | ⬜ pending |
| 26-01-02 | 01 | 0 | NOTIF-04 | unit | `bun run test src/lib/notifications/correction-email.test.ts` | ❌ W0 | ⬜ pending |
| 26-01-03 | 01 | 1 | NOTIF-01 | unit | `bun run test src/lib/notifications/correction-email.test.ts` | ❌ W0 | ⬜ pending |
| 26-01-04 | 01 | 1 | NOTIF-02 | unit | `bun run test src/lib/notifications/correction-email.test.ts` | ❌ W0 | ⬜ pending |
| 26-01-05 | 01 | 1 | NOTIF-04 | unit | `bun run test src/lib/notifications/correction-email.test.ts` | ❌ W0 | ⬜ pending |
| 26-02-01 | 02 | 2 | NOTIF-01, NOTIF-02 | unit | `bun run test src/lib/email/templates/correction-notification.test.ts` | ❌ W0 | ⬜ pending |
| 26-02-02 | 02 | 2 | NOTIF-01 | e2e/manual | manual email client check | N/A | ⬜ pending |
| 26-03-01 | 03 | 3 | NOTIF-01, NOTIF-02 | integration | `bun run test src/app/api/corrections/` | ❌ W0 | ⬜ pending |
| 26-04-01 | 04 | 4 | NOTIF-01, NOTIF-02, NOTIF-04 | unit | `bun run test` (parity check) | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/notifications/correction-email.test.ts` — RED stubs for dedup logic, recipient assembly, and notification insert (NOTIF-01, NOTIF-02, NOTIF-04)
- [ ] `src/lib/email/templates/correction-notification.test.ts` — RED stubs for template rendering in EN and RO (NOTIF-01)
- [ ] `src/app/api/corrections/route.test.ts` — RED stub for fire-and-forget integration (NOTIF-01, NOTIF-02)

*Existing infrastructure (`translation-parity.test.ts`, Vitest) covers infrastructure; Wave 0 adds phase-specific RED tests.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Email renders without visual defects in real mail client | NOTIF-01 | React Email rendering is automated but pixel-level visual check requires a mail client | Send correction on staging/UAT, open email in Gmail/Outlook, verify layout and branding |
| EN and RO emails look identical structurally | NOTIF-01 | Visual symmetry not captured by unit tests | Change tenant locale, trigger correction, compare both emails side-by-side |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
