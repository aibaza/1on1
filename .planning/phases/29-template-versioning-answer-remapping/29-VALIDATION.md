---
phase: 29
slug: template-versioning-answer-remapping
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 29 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `bun run test` |
| **Full suite command** | `bun run test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run test`
- **After every plan wave:** Run `bun run test && bun run typecheck && bun run lint`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 29-01-01 | 01 | 1 | VER-01 | unit | `bunx vitest run src/lib/templates/snapshot.test.ts -t "build snapshot"` | ❌ W0 | ⬜ pending |
| 29-01-02 | 01 | 1 | VER-02 | unit | `bunx vitest run src/app/api/templates/[id]/publish/route.test.ts -t "version increment"` | ❌ W0 | ⬜ pending |
| 29-02-01 | 02 | 2 | VER-03 | unit | `bunx vitest run src/app/api/templates/[id]/versions/route.test.ts` | ❌ W0 | ⬜ pending |
| 29-02-02 | 02 | 2 | VER-04 | unit | `bunx vitest run src/lib/templates/version-diff.test.ts` | ❌ W0 | ⬜ pending |
| 29-02-03 | 02 | 2 | VER-05 | unit | `bunx vitest run src/app/api/templates/[id]/versions/[versionNumber]/restore/route.test.ts` | ❌ W0 | ⬜ pending |
| 29-02-04 | 02 | 2 | VER-06 | unit | Same as VER-05 | ❌ W0 | ⬜ pending |
| 29-03-01 | 03 | 3 | VER-07 | unit (happy-dom) | `bunx vitest run src/components/templates/version-history-tab.test.tsx` | ❌ W0 | ⬜ pending |
| 29-03-02 | 03 | 3 | VER-08 | unit (happy-dom) | `bunx vitest run src/components/templates/version-history-tab.test.tsx -t "confirm"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/templates/snapshot.test.ts` — stubs for VER-01 (snapshot creation)
- [ ] `src/lib/templates/version-diff.test.ts` — stubs for VER-04 (diff computation)
- [ ] `src/app/api/templates/[id]/versions/route.test.ts` — stubs for VER-03 (version list API)
- [ ] `src/app/api/templates/[id]/versions/[versionNumber]/restore/route.test.ts` — stubs for VER-05, VER-06 (restore + conditional remap)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| History tab renders correctly in template editor | VER-07 | Visual layout verification | Open template editor → click History tab → verify version list displays |
| Restore confirmation dialog shows impact summary | VER-08 | Visual + interaction | Click "Restore" on a version → verify dialog shows question count + session info |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
