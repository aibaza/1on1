---
phase: 18
slug: critical-bugs
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `bun run test` |
| **Full suite command** | `bun run test && bun run typecheck && bun run lint` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run test && bun run typecheck`
- **After every plan wave:** Run `bun run test && bun run typecheck && bun run lint`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 0 | BUG-01 | unit | `bun run test src/lib/session/__tests__/tiptap-render.test.ts` | ❌ Wave 0 | ⬜ pending |
| 18-01-02 | 01 | 1 | BUG-01 | unit | `bun run test src/lib/session/__tests__/tiptap-render.test.ts` | ❌ Wave 0 | ⬜ pending |
| 18-02-01 | 02 | 1 | BUG-02 | manual | n/a (browser viewport test) | manual-only | ⬜ pending |
| 18-03-01 | 03 | 1 | BUG-03 | unit | `bun run test src/lib/i18n/__tests__/translation-parity.test.ts` | ✅ exists | ⬜ pending |
| 18-04-01 | 04 | 1 | BUG-04 | unit | `bun run test && bun run typecheck` | ✅ exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/session/__tests__/tiptap-render.test.ts` — unit tests for `contentToHtml()` helper (BUG-01)

*All other bugs use existing infrastructure.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mobile layout renders without overflow at <1024px | BUG-02 | Visual/responsive — requires browser viewport resize | Open AI editor at 375px viewport width; verify Preview and Chat tabs render without horizontal overflow |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
