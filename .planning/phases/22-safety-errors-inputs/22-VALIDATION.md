---
phase: 22
slug: safety-errors-inputs
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `bun run test --run` |
| **Full suite command** | `bun run test --run && bun run typecheck && bun run lint` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run test --run`
- **After every plan wave:** Run `bun run test --run && bun run typecheck && bun run lint`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 1 | SAFE-01 | typecheck | `bun run typecheck` | ✅ | ⬜ pending |
| 22-01-02 | 01 | 1 | SAFE-01 | visual/manual | n/a | ✅ | ⬜ pending |
| 22-02-01 | 02 | 1 | ERR-01 | typecheck | `bun run typecheck` | ❌ W0 | ⬜ pending |
| 22-02-02 | 02 | 1 | ERR-01 | manual | n/a | ❌ W0 | ⬜ pending |
| 22-03-01 | 03 | 1 | INP-01 | unit | `bun run test --run` | ❌ W0 | ⬜ pending |
| 22-03-02 | 03 | 1 | INP-01 | typecheck | `bun run typecheck` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/app/(dashboard)/sessions/[id]/summary/not-found.tsx` — stub for ERR-01
- [ ] `src/components/ui/date-picker.tsx` — stub for INP-01
- [ ] `src/components/ui/calendar.tsx` — install via `bunx shadcn@latest add calendar` for INP-01
- [ ] `react-day-picker` + `date-fns` — install via `bun add react-day-picker date-fns`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Danger Zone section is visually distinct at bottom of team detail page | SAFE-01 | Visual layout/styling; no automated snapshot tests | Navigate to team detail page, verify red outlined button in separate section below a divider |
| AlertDialog confirmation prevents accidental deletion | SAFE-01 | User interaction flow | Click Delete button, verify modal appears with warning text, confirm cancel works |
| 404 page shown for non-existent session URL | ERR-01 | Routing/rendering behavior | Navigate to `/sessions/nonexistent-id/summary`, verify custom 404 with "Back to Sessions" link |
| DatePicker calendar popup opens correctly | INP-01 | UI interaction | Click date filter on History/Audit Log page, verify calendar popup appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
