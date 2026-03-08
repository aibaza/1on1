---
phase: 20
slug: mobile-responsiveness
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (happy-dom for component tests) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `bun run test` |
| **Full suite command** | `bun run test && bun run typecheck && bun run lint` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run test`
- **After every plan wave:** Run `bun run test && bun run typecheck`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 0 | MOB-03, MOB-04, MOB-05 | unit | `bun run test 2>&1 \| tail -20` | ❌ Wave 0 | ⬜ pending |
| 20-02-01 | 02 | 1 | MOB-03 | unit | `bun run test src/components/dashboard/__tests__/nudge-card-touch-target.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 20-02-02 | 02 | 1 | MOB-01, MOB-02 | manual | Browser DevTools resize to 375px | manual-only | ⬜ pending |
| 20-03-01 | 03 | 1 | MOB-04 | unit | `bun run test src/components/people/__tests__/people-table-columns-mobile.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 20-03-02 | 03 | 1 | MOB-05 | unit | `bun run test src/app/(dashboard)/settings/audit-log/__tests__/audit-log-columns-mobile.test.tsx` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/dashboard/__tests__/nudge-card-touch-target.test.tsx` — asserts `size-11` class on dismiss button (MOB-03)
- [ ] `src/components/people/__tests__/people-table-columns-mobile.test.tsx` — asserts `meta.className` includes `hidden` on secondary columns (MOB-04)
- [ ] `src/app/(dashboard)/settings/audit-log/__tests__/audit-log-columns-mobile.test.tsx` — asserts Target column has hide class (MOB-05)

*`@testing-library/react` already installed in Phase 19.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Template list action bar collapses on mobile | MOB-01 | CSS responsive show/hide cannot be tested in Vitest JSDOM | Open templates page in DevTools at 375px — verify overflow DropdownMenu appears |
| Template detail action bar collapses on mobile | MOB-02 | Same — CSS breakpoint test requires real browser | Open template detail in DevTools at 375px — verify secondary actions collapse into menu |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
