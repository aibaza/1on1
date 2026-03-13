# Phase 27: UI Integration - Research

**Researched:** 2026-03-13
**Domain:** React/Next.js Client Components — inline editing, debounced AI feedback, badge overlays, collapsible history panel
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CORR-01 | User can view which answers have been corrected via an "Amended" badge on each modified answer row | sessionAnswerHistory schema confirms which answerId rows have been corrected; badge renders on every answer card that has ≥1 history row |
| CORR-03 | Manager/admin can view a correction history panel on the session detail page showing all amendments with timestamps, actor, and reason | sessionAnswerHistory table has `correctedById`, `createdAt`, `correctionReason`; actor name resolved via join; Collapsible pattern already in codebase |
| WFLOW-04 | Manager sees inline AI feedback on the reason field (pass/fail + one-sentence note) without navigating away | `/api/sessions/[id]/corrections/validate-reason` already built; useDebounce hook exists; useMutation pattern established in ai-summary-section |
| WFLOW-05 | Correction form shows the original and new answer values side by side inline on the session detail page | sessionAnswerHistory records `originalAnswer*` values; correction POST endpoint accepts `newAnswer*`; no new API work needed |
</phase_requirements>

---

## Summary

Phase 27 is a pure UI phase. The API layer (correction endpoint, validate-reason endpoint, email pipeline) is fully operational from Phases 25–26. The only work left is making corrections visible and actionable inside `SessionSummaryView` and its surrounding page. No new API routes, no schema changes, no migration files.

The session detail page lives at `/sessions/[id]/summary/page.tsx` and renders `SessionSummaryView` (a client component). Answer rows are already rendered per question inside a `Collapsible` per category. The inline correction form, Amended badges, and history panel all slot into the existing layout without structural surgery.

The project has `useDebounce`, `useMutation`, `useQuery` (TanStack Query), `Collapsible`, `Badge`, `Dialog`, and `Textarea` already available. No new dependencies are needed. The validate-reason endpoint accepts `{ reason: string }` and returns `{ pass: boolean, feedback: string | null }` — already confirmed working. The corrections endpoint accepts `correctionInputSchema` and returns `{ sessionId, newScore }`.

**Primary recommendation:** Build three focused components — `AnswerCorrectionForm` (inline before/after + reason field + AI feedback), `AmendedBadge` (overlaid on corrected rows), `CorrectionHistoryPanel` (collapsible bottom panel) — and wire them into the existing `SessionSummaryView` by adding a `corrections` prop and `isManager` guard. Fetch history data server-side at page load, then optimistically update via TanStack Query after submission.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React (Next.js App Router) | 16 / 19 | Client Components with `"use client"` | Project standard |
| TanStack Query (`@tanstack/react-query`) | latest | useMutation for correction POST + validate-reason, useQuery for history refetch | Already used in `ai-summary-section`, `notes-editor`, `series-list` |
| next-intl | latest | All user-visible strings via `useTranslations("sessions")` | Project i18n standard |
| shadcn/ui — Collapsible | installed | CorrectionHistoryPanel expand/collapse | Already used in `session-summary-view` |
| shadcn/ui — Badge | installed | "Amended" badge on answer rows | Already used throughout |
| shadcn/ui — Textarea | installed | Reason field input | Standard form element |
| shadcn/ui — Button | installed | Submit correction, cancel | Standard |
| useDebounce | project hook | Trigger validate-reason after user stops typing | Already at `src/lib/hooks/use-debounce.ts` |
| Lucide React | installed | Pencil icon (edit trigger), History icon, CheckCircle2/XCircle for AI pass/fail | Already used |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod (client-side) | installed | Mirror `correctionInputSchema` validation before submit | Match server schema so errors are caught early |
| React Hook Form | installed | Reason field form management | Only if form complexity warrants it; single-field form may be simpler with useState |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| useState for reason field | React Hook Form | Single field — useState is simpler and matches existing pattern in `session-summary-view` |
| Server-side corrections refetch | optimistic update | Optimistic update is faster UX but requires manual rollback on error; simple refetch is safer for correctness |

**Installation:** No new packages needed. All dependencies are already installed.

---

## Architecture Patterns

### Recommended Component Structure

```
src/components/session/
├── session-summary-view.tsx     # MODIFIED: add corrections prop, AmendedBadge, edit button, CorrectionHistoryPanel
├── answer-correction-form.tsx   # NEW: inline before/after + reason + AI feedback
├── amended-badge.tsx            # NEW: small badge overlay for corrected answers
└── correction-history-panel.tsx # NEW: collapsible panel at page bottom
```

The page file `/src/app/(dashboard)/sessions/[id]/summary/page.tsx` also requires modification to:
1. Join `sessionAnswerHistory` at load time and pass corrections data to the view
2. Resolve actor names (join `users` on `correctedById`)

### Pattern 1: Amended Badge Overlay on Answer Rows

**What:** A small `Badge` with variant `"outline"` and an amber/yellow tone rendered inline next to the answer value on any row where `answerId` exists in the corrections map.

**When to use:** Every answer row in `SessionSummaryView` that has ≥1 history entry.

**Example:**
```tsx
// Source: existing Badge usage in session-summary-view.tsx
{isAmended && (
  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 dark:text-amber-400">
    Amended
  </Badge>
)}
```

The server page builds a `Map<answerId, CorrectionEntry[]>` at load time and passes it as a `corrections` prop to `SessionSummaryView`.

### Pattern 2: Inline Correction Form (WFLOW-05)

**What:** A `"use client"` component that renders below the answer display when the manager clicks the edit icon. Shows original value (read-only snapshot from history), the new answer input (matching the question's `answerType`), and the reason `Textarea`.

**When to use:** Visible only to `isManager === true` on completed sessions, and only when `status === "completed"`.

**Key design point:** Each answer row has its own local open/closed state (`useState<string | null>(null)` tracking which `answerId` is being edited). Only one form is open at a time — clicking a different edit icon closes the current one.

```tsx
// Pattern: controlled per-row editing state in parent
const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);

// In answer row:
{isManager && status === "completed" && (
  <Button
    variant="ghost"
    size="icon"
    className="h-6 w-6"
    onClick={() => setEditingAnswerId(editingAnswerId === question.id ? null : answerId)}
  >
    <Pencil className="h-3.5 w-3.5" />
  </Button>
)}

{editingAnswerId === answerId && (
  <AnswerCorrectionForm
    answerId={answerId}
    sessionId={sessionId}
    questionAnswerType={answerType}
    originalAnswer={answer}
    onSuccess={() => {
      setEditingAnswerId(null);
      // Trigger page data refetch or local state update
    }}
    onCancel={() => setEditingAnswerId(null)}
  />
)}
```

### Pattern 3: Debounced AI Feedback on Reason Field (WFLOW-04)

**What:** After manager stops typing for 800ms, fire a POST to `/api/sessions/[id]/corrections/validate-reason` with `{ reason }`. Show pass/fail indicator inline below the textarea.

**When to use:** Inside `AnswerCorrectionForm`, wired to the reason `textarea`.

**Key implementation notes:**
- Use `useDebounce(reason, 800)` — the project's `useDebounce` hook is exactly this pattern
- Only call validate-reason when `debouncedReason.length >= 20` (matches schema minimum)
- Use `useQuery` with `enabled: debouncedReason.length >= 20` — NOT a mutation (it's a read operation with side effects — but a mutation is also fine because the endpoint is POST)
- API returns `{ pass: boolean, feedback: string | null }` — render a green checkmark with feedback string if `pass === true`, amber warning with feedback if `pass === false`, nothing if `feedback === null` (degraded/AI outage mode)
- Submission should NOT be blocked by `pass === false` per the business rules (AI is advisory only) — show warning but allow submit

```tsx
// Source: src/lib/hooks/use-debounce.ts + pattern from notes-editor.tsx
const debouncedReason = useDebounce(reason, 800);

const { data: aiValidation, isFetching: isValidating } = useQuery({
  queryKey: ["validate-reason", sessionId, debouncedReason],
  queryFn: async () => {
    const res = await fetch(`/api/sessions/${sessionId}/corrections/validate-reason`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: debouncedReason }),
    });
    if (!res.ok) return { pass: true, feedback: null }; // degrade gracefully
    return res.json();
  },
  enabled: debouncedReason.length >= 20,
  staleTime: 30_000,
});
```

### Pattern 4: Correction History Panel (CORR-03)

**What:** A `Collapsible` panel at the bottom of the session page (after all category sections, before the back link footer). Lists all `sessionAnswerHistory` rows for this session sorted by `createdAt` DESC. Collapsed when no corrections, expanded by default when corrections exist.

**When to use:** Always rendered on completed sessions (for all roles — report can view that corrections were made). Manager/admin can also see the reason text.

```tsx
// Source: Collapsible pattern from session-summary-view.tsx categories
const hasCorrectionHistory = corrections.length > 0;
const [historyOpen, setHistoryOpen] = useState(hasCorrectionHistory);

<Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
  <CollapsibleTrigger className="flex w-full items-center justify-between ...">
    <h2 className="text-lg font-semibold flex items-center gap-2">
      <History className="h-5 w-5" />
      {t("corrections.historyTitle")}
      {hasCorrectionHistory && (
        <Badge variant="outline" className="text-xs">{corrections.length}</Badge>
      )}
    </h2>
    {historyOpen ? <ChevronDown ... /> : <ChevronRight ... />}
  </CollapsibleTrigger>
  <CollapsibleContent>
    {hasCorrectionHistory ? (
      <div className="space-y-3">
        {corrections.map((entry) => (
          <CorrectionHistoryEntry key={entry.id} entry={entry} isManager={isManager} />
        ))}
      </div>
    ) : (
      <p className="text-sm text-muted-foreground italic">{t("corrections.noHistory")}</p>
    )}
  </CollapsibleContent>
</Collapsible>
```

### Pattern 5: Server Page Data Join for Corrections

The page at `/src/app/(dashboard)/sessions/[id]/summary/page.tsx` must be extended to:
1. Query `sessionAnswerHistory` WHERE `sessionId = :sessionId` joined with `users` on `correctedById` for actor name
2. Build a `correctionsByAnswerId: Record<string, CorrectionEntry[]>` map
3. Build a flat `allCorrections: CorrectionEntry[]` list for the history panel
4. Pass both as new props to `SessionSummaryView`

The existing data fetch pattern uses parallel `Promise.all` — add the history query to the array.

```tsx
// Source: existing pattern in summary/page.tsx lines 108-201
const [
  sectionData, questions, answers,
  talkingPointRows, privateNoteRows, actionItemRows,
  historyRows,                    // NEW
] = await Promise.all([
  // ... existing queries ...
  tx
    .select({
      id: sessionAnswerHistory.id,
      sessionAnswerId: sessionAnswerHistory.sessionAnswerId,
      correctedById: sessionAnswerHistory.correctedById,
      correctorFirstName: users.firstName,
      correctorLastName: users.lastName,
      originalAnswerText: sessionAnswerHistory.originalAnswerText,
      originalAnswerNumeric: sessionAnswerHistory.originalAnswerNumeric,
      originalAnswerJson: sessionAnswerHistory.originalAnswerJson,
      correctionReason: sessionAnswerHistory.correctionReason,
      createdAt: sessionAnswerHistory.createdAt,
    })
    .from(sessionAnswerHistory)
    .innerJoin(users, eq(users.id, sessionAnswerHistory.correctedById))
    .where(eq(sessionAnswerHistory.sessionId, sessionId))
    .orderBy(desc(sessionAnswerHistory.createdAt)),
]);
```

### Anti-Patterns to Avoid

- **Opening multiple inline forms simultaneously:** Use a single `editingAnswerId` state at the `SessionSummaryView` level. One open form at a time.
- **Blocking submission on AI fail:** AI validation is advisory. The submit button must always be enabled when the reason meets the length constraint (20–500 chars). Show the AI warning but never disable submit.
- **Polling validate-reason on every keystroke:** Debounce to 800ms and use `enabled` guard. Spamming the AI endpoint on every character change degrades AI cost budget.
- **Refetching full page on correction success:** Prefer local state update for the Amended badge + history panel after a successful mutation, then optionally `router.refresh()` for score update. Avoid full page reload.
- **i18n string literals in component files:** All user-visible strings must go through `useTranslations`. Add new keys to `messages/en/sessions.json` and `messages/ro/sessions.json` in the same wave.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Debouncing user input | Custom setTimeout ref | `useDebounce` in `src/lib/hooks/use-debounce.ts` | Already exists in project, handles cleanup correctly |
| Collapsible panel | Custom show/hide with CSS | `Collapsible` from shadcn/ui | Already installed, used in same file being modified |
| Badge component | Custom styled span | `Badge` from `@/components/ui/badge` | Already installed |
| Answer type rendering | Duplicate switch statement | Extract / reuse `renderAnswerDisplay` from `session-summary-view.tsx` | Function already handles all answer types correctly — export it or inline-reference it |
| Form validation | Custom string length checks | Mirror `correctionInputSchema` from `src/lib/validations/correction.ts` | Schema is the source of truth; min 20, max 500 |

---

## Common Pitfalls

### Pitfall 1: `correctionsByAnswerId` not passed to answer rows

**What goes wrong:** The answer row map in `SessionSummaryView` is built from `category.answers` keyed by `questionId`. The `sessionAnswerHistory` rows are keyed by `sessionAnswerId` (which is the `session_answer.id`, not the question ID). There is a mismatch.

**Why it happens:** The existing `SummaryAnswer` type uses `questionId` as the map key. History rows use the UUID primary key of the `session_answers` row.

**How to avoid:** In the server page, the `answers` query already fetches `sessionAnswers.id` as `id`. Map corrections by `sessionAnswerId` matching `answer.id` (the session_answers PK), not `questionId`. The page must pass `answer.id` down to each row alongside the existing data.

**Warning signs:** Amended badges never appear even after a correction is applied.

### Pitfall 2: Stale "Amended" badge after correction submit

**What goes wrong:** Manager submits a correction, the form closes, but the badge does not appear because the `corrections` prop comes from server-rendered initial data (not reactively updated).

**Why it happens:** `SessionSummaryView` is a client component but its `corrections` prop is passed from the server page. After a client-side mutation, the server data is stale.

**How to avoid:** After a successful `useMutation` for the correction:
1. Update local React state (add the new history entry to a local corrections list)
2. Optionally call `router.refresh()` (Next.js App Router) to re-run the server component and get fresh data including updated score

The `router.refresh()` approach is the standard Next.js App Router pattern for revalidating server component data after a client mutation.

### Pitfall 3: New answer input type mismatch

**What goes wrong:** The correction form shows a plain text input for rating/mood answers. The manager submits `newAnswerText` where `newAnswerNumeric` is required.

**Why it happens:** The correction form needs to render the correct input widget per `answerType` (same widgets as the wizard).

**How to avoid:** The `AnswerCorrectionForm` must branch on `answerType` to show:
- `text` → `Textarea`
- `rating_1_5`, `rating_1_10`, `yes_no`, `mood`, `multiple_choice` → same widget components from `src/components/session/widgets/`

Reuse existing widget components. Do not reinvent answer input.

### Pitfall 4: i18n keys missing in Romanian locale

**What goes wrong:** English display works, Romanian users see raw key strings (fallback behavior of next-intl).

**Why it happens:** New `corrections.*` keys added to `messages/en/sessions.json` but not `messages/ro/sessions.json`.

**How to avoid:** Any plan that adds EN keys must add RO keys in the same task. The ro/ messages files are at `messages/ro/`.

### Pitfall 5: validate-reason called with `sessionId` from URL but endpoint does not use sessionId for validation

**What goes wrong:** The validate-reason endpoint is at `/api/sessions/[id]/corrections/validate-reason` but the `[id]` (sessionId) is not used by the endpoint — it validates reason text only (no session RBAC). Calling with wrong sessionId will still work, but if the endpoint is moved or ID changes, it silently fails.

**How to avoid:** Pass the correct `sessionId` from the component prop. The endpoint ignores it but the URL must be well-formed.

---

## Code Examples

### Full correction submit mutation (correctionInputSchema shape)

```typescript
// Source: src/lib/validations/correction.ts
// Body shape for POST /api/sessions/[sessionId]/corrections
{
  answerId: string;          // UUID of the session_answers row (not questionId)
  reason: string;            // 20–500 chars
  newAnswerText?: string | null;
  newAnswerNumeric?: number | null;
  newAnswerJson?: unknown;
  skipped?: boolean;
}
// Response: { sessionId: string, newScore: number | null }
```

### Validate-reason endpoint call

```typescript
// Source: src/app/api/sessions/[id]/corrections/validate-reason/route.ts
// POST /api/sessions/[sessionId]/corrections/validate-reason
// Body: { reason: string }  (20-500 chars)
// Response: { pass: boolean, feedback: string | null }
// On AI outage: { pass: true, feedback: null } — never blocks correction
```

### renderAnswerDisplay reuse

```typescript
// Source: src/components/session/session-summary-view.tsx lines 111-184
// This function already handles all 6 answer types.
// Export it from session-summary-view.tsx and import in AnswerCorrectionForm
// to render the "original answer" read-only display without duplication.
export function renderAnswerDisplay(
  answerType: string,
  answer: SummaryAnswer | undefined,
  t: ReturnType<typeof useTranslations<"sessions">>
): React.ReactNode
```

### sessionAnswerHistory schema reference

```typescript
// Source: src/lib/db/schema/answer-history.ts
// Key fields for Phase 27:
sessionAnswerHistory.sessionAnswerId  // FK to session_answers.id
sessionAnswerHistory.correctedById    // FK to users.id — join for actor name
sessionAnswerHistory.originalAnswerText
sessionAnswerHistory.originalAnswerNumeric
sessionAnswerHistory.originalAnswerJson
sessionAnswerHistory.originalSkipped
sessionAnswerHistory.correctionReason
sessionAnswerHistory.createdAt
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate correction page navigation | Inline form within session detail page | Phase 27 design decision | No page navigation required (WFLOW-05) |
| Manual answer type handling per UI | Reuse existing widget components | Phase 27 | Consistent rendering |

---

## Open Questions

1. **Score display refresh after correction**
   - What we know: `corrections` POST returns `{ newScore }`. The header `StarRating` reads `sessionScore` from server-rendered props.
   - What's unclear: Should the score update immediately in the UI after correction, or only after page refresh?
   - Recommendation: Update the score via local state after a successful mutation. `router.refresh()` will resync the full server state including score. Use both: local optimistic score + refresh for accuracy.

2. **Can the report (employee) initiate a correction form?**
   - What we know: RBAC — only manager and admin can correct (WFLOW-01 is complete in Phase 25). `canCorrectSession` in `src/lib/auth/rbac` enforces this on the server.
   - What's unclear: Should the edit pencil icon be hidden entirely from reports, or shown but disabled?
   - Recommendation: Hide entirely. Non-managers should not see the edit affordance. Use `isManager` prop (already passed to `SessionSummaryView`).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (v8, node environment) |
| Config file | `/home/dc/work/1on1/vitest.config.ts` |
| Quick run command | `bun run test --run` |
| Full suite command | `bun run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CORR-01 | `amendedAnswerIds` correctly identifies corrected answers from history data | unit | `bun run test --run src/components/session/__tests__/amended-badge.test.tsx` | ❌ Wave 0 |
| CORR-03 | `CorrectionHistoryPanel` renders collapsed when no corrections, expanded when corrections exist | unit | `bun run test --run src/components/session/__tests__/correction-history-panel.test.tsx` | ❌ Wave 0 |
| WFLOW-04 | AI feedback indicator shows pass/fail/loading/null states correctly | unit | `bun run test --run src/components/session/__tests__/answer-correction-form.test.tsx` | ❌ Wave 0 |
| WFLOW-05 | Inline correction form renders original and new answer side by side for each answer type | unit | `bun run test --run src/components/session/__tests__/answer-correction-form.test.tsx` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `bun run test --run src/components/session/__tests__/`
- **Per wave merge:** `bun run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/components/session/__tests__/amended-badge.test.tsx` — covers CORR-01 (badge renders for corrected answers, not for uncorrected)
- [ ] `src/components/session/__tests__/correction-history-panel.test.tsx` — covers CORR-03 (collapsed/expanded default, entry rendering, actor name)
- [ ] `src/components/session/__tests__/answer-correction-form.test.tsx` — covers WFLOW-04 and WFLOW-05 (AI feedback states, original vs new layout)

---

## Sources

### Primary (HIGH confidence)

- Direct codebase read: `src/components/session/session-summary-view.tsx` — existing answer row structure, Collapsible usage, renderAnswerDisplay function
- Direct codebase read: `src/app/(dashboard)/sessions/[id]/summary/page.tsx` — server data fetch pattern, parallel Promise.all structure
- Direct codebase read: `src/app/api/sessions/[id]/corrections/route.ts` — correction POST API shape, correctionInputSchema
- Direct codebase read: `src/app/api/sessions/[id]/corrections/validate-reason/route.ts` — validate-reason API shape, degradation contract
- Direct codebase read: `src/lib/db/schema/answer-history.ts` — history table columns, FK relationships
- Direct codebase read: `src/lib/validations/correction.ts` — `correctionInputSchema` (answerId, reason 20-500, newAnswer*)
- Direct codebase read: `src/lib/ai/schemas/correction.ts` — `reasonValidationResultSchema` (pass, feedback)
- Direct codebase read: `src/lib/hooks/use-debounce.ts` — debounce hook exists, default 500ms
- Direct codebase read: `src/components/session/ai-summary-section.tsx` — TanStack Query useMutation/useQuery patterns used in session components
- Direct codebase read: `messages/en/sessions.json` — existing i18n keys, `corrections.*` namespace not yet present

### Secondary (MEDIUM confidence)

- Codebase pattern: notes-editor uses `useDebounce` + `useMutation` — established project pattern for debounced auto-save
- Next.js App Router docs: `router.refresh()` is the standard way to re-run server component data after client mutation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified present in project
- Architecture: HIGH — pattern directly modeled on existing session-summary-view code
- Pitfalls: HIGH — root causes identified from actual code structure (answerId vs questionId key mismatch)
- API contracts: HIGH — all endpoints read directly from Phase 25/26 implementation

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable codebase, no fast-moving dependencies)
