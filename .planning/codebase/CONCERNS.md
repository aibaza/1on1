# Codebase Concerns

**Analysis Date:** 2026-03-06

---

## 1. CRITICAL SECURITY — XSS via `dangerouslySetInnerHTML` without sanitization

**Severity: CRITICAL**

Multiple components render HTML from database content directly into the DOM without any sanitization library (DOMPurify, sanitize-html, etc.).

Files:
- `src/components/search/command-palette.tsx` — lines 208, 244 (`s.snippet`, `item.snippet`)
- `src/components/session/summary-screen.tsx` — line 313 (`catNotes`)
- `src/components/session/context-panel.tsx` — line 352 (`previousNotes`)
- `src/components/session/recap-screen.tsx` — line 119 (`content`)
- `src/components/session/floating-context-widgets.tsx` — line 294 (`previousNotes`)
- `src/components/session/session-summary-view.tsx` — lines 387, 498
- `src/components/history/history-page.tsx` — line 432 (`r.snippet`)

The search snippets (`ts_headline`) come from PostgreSQL full-text search and contain bold `<b>` highlight tags. User-entered content (talking points, notes, answers) stored in the DB could contain malicious HTML if an attacker previously submitted crafted input. Private notes use rich-text Tiptap output (HTML), and shared notes are also Tiptap HTML.

Impact: A user who can create a session or enter notes could store an XSS payload affecting other users viewing the same data. In a multi-tenant SaaS this is high-severity.

Fix approach: Install `dompurify` (and `@types/dompurify`). Wrap every `dangerouslySetInnerHTML` value:
```ts
import DOMPurify from "dompurify";
dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
```
For search snippets only `<b>` and `<em>` tags need to be allowed.

---

## 2. SECURITY — Impersonation cookie missing `secure` flag

**Severity: HIGH**

The `1on1_impersonate` cookie in `src/app/api/admin/impersonate/route.ts` (lines 51-56) is set with `httpOnly: true` and `sameSite: "lax"` but is missing `secure: true`.

In production (HTTPS), omitting `secure` means the cookie can be transmitted over plain HTTP if a browser makes an HTTP sub-request (mixed content, redirects). This could allow session hijacking of admin impersonation tokens on misconfigured load balancers.

Fix approach: Add `secure: process.env.NODE_ENV === "production"` to the `cookieStore.set()` call.

---

## 3. SECURITY — No rate limiting on any endpoint

**Severity: HIGH**

There is no rate-limiting middleware (confirmed: no `middleware.ts` exists; no `ratelimit`, `upstash`, or `limiter` in `src/`).

Exposed endpoints with no rate limiting:
- `POST /api/auth` — credential login, brute-force password attacks
- `POST /api/sessions/[id]/complete` — fires `runAIPipelineDirect` which makes 4 OpenAI calls. Replaying this endpoint = unlimited AI spend
- `POST /api/sessions/[id]/ai-retry` — same concern
- `POST /api/invites` — email spam

Fix approach: Add a `middleware.ts` at project root with `@upstash/ratelimit` or similar. At minimum: auth (5 req/min), AI endpoints (10 req/min per user).

---

## 4. SECURITY — Unvalidated date strings passed to `new Date()`

**Severity: MEDIUM**

In `src/app/api/audit-log/route.ts` (lines 38-44) and `src/app/api/history/route.ts` (lines 80-84), user-supplied `from`/`to` query parameters are passed directly to `new Date(from)` without validation. An invalid date string produces `Invalid Date`, causing a runtime error or unexpected SQL sent to PostgreSQL.

Fix approach: Validate with Zod (`z.string().datetime()` or `z.coerce.date()`) before passing to DB queries. Return a 400 if invalid.

---

## 5. SECURITY — `GET /api/users` accessible to all authenticated roles

**Severity: MEDIUM**

`src/app/api/users/route.ts` — the `GET` handler has only an auth check (`session.user` exists), but no role guard. Any authenticated user (including `member` role) can enumerate all users, emails, roles, job titles, and team memberships in their tenant.

Fix approach: Add `requireRole(session.user.role, "manager")` after the auth check, or filter fields returned to members.

---

## 6. PERFORMANCE — N+1 query pattern in `GET /api/sessions/[id]`

**Severity: HIGH**

In `src/app/api/sessions/[id]/route.ts` (lines 234-265), open action items are loaded in two sequential queries:

1. `SELECT * FROM action_item WHERE tenant_id = X AND status IN (...)` — returns ALL open items across the entire tenant in memory
2. `SELECT id FROM session WHERE series_id = Y` — fetches all sessions to build a filter set

Then JavaScript filters the items. This means every session load fetches potentially hundreds of action items from unrelated series into memory.

Fix approach: Replace with a single JOIN query:
```sql
SELECT ai.* FROM action_item ai
JOIN session s ON ai.session_id = s.id
WHERE s.series_id = $seriesId
  AND ai.status IN ('open', 'in_progress')
  AND ai.tenant_id = $tenantId
```

---

## 7. PERFORMANCE — `runAIPipelineDirect` opens 8-10 separate DB transactions

**Severity: MEDIUM**

`src/lib/ai/pipeline.ts` calls `withTenantContext` (opening a full DB transaction with 2 SET LOCAL statements each) at lines 34, 51, 68, 83, 96, 110, 126, 152, 181 — approximately 9 times per pipeline run. Each transaction adds ~16ms of round-trip overhead (2x `set_config` calls).

Fix approach: Consolidate into 3 transactions max: (1) read context, (2) write all AI results at once, (3) finalize + audit.

---

## 8. PERFORMANCE — N+1 in template reorder: one `UPDATE` per question

**Severity: MEDIUM**

`src/app/api/templates/[id]/questions/reorder/route.ts` (lines 69-77) performs one `UPDATE` per question ID inside a `for` loop:
```ts
for (let i = 0; i < data.questionIds.length; i++) {
  await tx.update(templateQuestions).set({ sortOrder: i })...
}
```
For a template with 20 questions, this is 20 individual sequential UPDATE statements.

Fix approach: Use a single `CASE WHEN` bulk update or `unnest` CTE pattern.

---

## 9. PERFORMANCE — Template duplicate creates one INSERT per section and question

**Severity: MEDIUM**

`src/app/api/templates/[id]/duplicate/route.ts` (lines 97-194) iterates sections and questions with individual `INSERT` statements inside `for...of` loops. For a 30-question template this is 30+ sequential DB round-trips.

Fix approach: Use `tx.insert(templateSections).values([...allSections])` for batch inserts.

---

## 10. PERFORMANCE — Invite loop: sequential DB + SMTP per recipient

**Severity: MEDIUM**

`src/app/api/invites/route.ts` (line 70+) processes each email inside a `for (const email of emails)` loop with sequential `await` on DB lookups, DB inserts, and `sendMail()`. For bulk invites of 10+ users this is a serial chain of network calls.

Fix approach: Parallelize existence checks with `Promise.all`, then batch-insert tokens, then batch-send emails with `Promise.allSettled`.

---

## 11. PERFORMANCE — Search route: no query length validation

**Severity: MEDIUM**

`src/app/api/search/route.ts` accepts an unbounded `query` string that is passed to `websearch_to_tsquery` in three raw SQL calls. A very long string (e.g., 10,000 chars) causes unnecessary PostgreSQL memory allocation.

Fix approach: Add `z.string().min(1).max(200)` validation on the `q` parameter before use.

---

## 12. PERFORMANCE — Duplicate sparkline implementations in dashboard and series card

**Severity: LOW**

Identical `AreaChart` + `LinearGradient` + `useMemo` sparkline patterns exist in:
- `src/components/dashboard/quick-stats.tsx` — `BackgroundSparkline` component
- `src/components/series/series-card.tsx` — `ScoreSparkline` component

Both compute identical chart configs, differing only in height CSS and gradient ID.

Fix approach: Extract to `src/components/ui/sparkline-chart.tsx` accepting `data`, `height`, `gradientId` props.

---

## 13. TYPESCRIPT — `any` type in translation function signatures

**Severity: MEDIUM**

Three files use `(key: any) => string` as the type for the i18n `t` function:
- `src/components/session/summary-screen.tsx` — line 74
- `src/components/session/question-history-dialog.tsx` — lines 51, 151
- `src/components/action-items/action-items-page.tsx` — line 431

This bypasses the typed translation key system. If a key is renamed the compiler won't catch it.

Fix approach: Use `ReturnType<typeof useTranslations<"namespace">>` or typed record types for key maps.

---

## 14. TYPESCRIPT — Unsafe `body as { userId?: string }` in impersonate route

**Severity: MEDIUM**

`src/app/api/admin/impersonate/route.ts` (line 19):
```ts
const { userId } = body as { userId?: string };
```

`body` is typed `unknown` from `request.json()`. This is the only API route that skips Zod parsing for body validation. The manual `typeof userId !== "string"` guard catches it at runtime but is inconsistent.

Fix approach: `z.object({ userId: z.string().uuid() }).safeParse(body)`.

---

## 15. TYPESCRIPT — `result as {...}` assertions mask union inference failures

**Severity: MEDIUM**

Multiple API routes use type assertions when extracting data from `withTenantContext` results because the discriminated union (error | data) isn't automatically narrowed:
- `src/app/api/sessions/[id]/answers/route.ts` line 152
- `src/app/api/sessions/[id]/action-items/route.ts` lines 301, 438
- `src/app/api/sessions/[id]/talking-points/route.ts` lines 248, 376
- `src/app/api/series/[id]/start/route.ts` lines 128, 136

Fix approach: Define a generic `type DBResult<T> = { error: string; status: number } | T` helper and use TypeScript's `"error" in result` narrowing consistently.

---

## 16. REACT — `eslint-disable react-hooks/exhaustive-deps` suppressing real dep warnings

**Severity: MEDIUM**

8 effect/callback hooks suppress exhaustive-deps warnings instead of fixing them:
- `src/components/session/wizard-shell.tsx` — line 443
- `src/components/session/notes-editor.tsx` — lines 164, 177
- `src/components/templates/conditional-logic-form.tsx` — lines 85, 110
- `src/components/templates/answer-config-form.tsx` — line 139

Most cases involve TanStack Query `mutate` functions omitted from deps. Since TanStack returns stable references, adding `mutate` to deps is safe and removes the need to suppress.

---

## 17. REACT — ESLint error: `document.cookie` mutation in `user-menu.tsx`

**Severity: MEDIUM**

`src/components/layout/user-menu.tsx` line 45 triggers an active ESLint **error**:
```
error  Error: This value cannot be modified (react-hooks/immutability)
```
Direct `document.cookie` mutation violates React Compiler rules. Works at runtime today but will break under React Compiler enforcement.

Fix approach: Move cookie-setting to the server in the `/api/user/language` response, or use a `useEffect` boundary.

---

## 18. REACT — `useMemo` dependency instability in `action-items-page.tsx`

**Severity: MEDIUM**

`src/components/action-items/action-items-page.tsx` (lines 100-151): `const items = data?.actionItems ?? []` creates a new array reference on every render. Two `useMemo` hooks depend on `items`, so both recalculate unnecessarily.

Fix approach:
```ts
const items = useMemo(() => data?.actionItems ?? [], [data]);
```

---

## 19. REACT — React Compiler incompatible library: `useForm().watch()` and `useReactTable`

**Severity: LOW**

Multiple components are skipped by the React Compiler due to React Hook Form's `watch()` and TanStack Table's `useReactTable()` returning non-memoizable functions:
- `src/components/people/people-table.tsx` — line 84
- `src/components/series/edit-series-dialog.tsx` — line 107
- `src/components/series/series-form.tsx` — line 102
- `src/components/templates/question-form.tsx` — line 79
- `src/components/templates/template-editor.tsx` — line 268

Fix approach: Replace `watch("field")` with `useWatch({ name: "field" })` from React Hook Form.

---

## 20. DEAD CODE — Unused imports and variables (ESLint confirmed)

**Severity: LOW**

| File | Symbol | Line |
|---|---|---|
| `src/app/(dashboard)/sessions/[id]/summary/page.tsx` | `sql` | 16 |
| `src/app/api/analytics/export/route.ts` | `actionMap` (computed, never read) | 232 |
| `src/app/api/history/route.ts` | `lte`, `sql` | 10 |
| `src/app/api/labels/route.ts` | `request` param | 9 |
| `src/app/api/search/route.ts` | `actionItems`, `sessions`, `talkingPoints`, `sessionAnswers` | 6-11 |
| `src/app/api/sessions/[id]/complete/route.ts` | `sql` | 16 |
| `src/app/api/templates/[id]/route.ts` | `inArray` | 20 |
| `src/components/analytics/team-overview.tsx` | `memberCount` | 24 |
| `src/components/history/history-page.tsx` | `isFiltering` | 123 |
| `src/components/search/command-palette.tsx` | `open`, `setOpen` | 318 |
| `src/components/session/floating-context-widgets.tsx` | `Sparkles` icon | 12 |
| `src/components/session/session-summary-view.tsx` | `completedAt` | 217 |
| `src/components/session/wizard-mobile-carousel.tsx` | `currentStepInfo` | 59 |
| `src/components/templates/template-editor.tsx` | `GripVertical` | 38 |
| `src/lib/ai/context.ts` | `sql` | 1 |
| `src/lib/auth/actions.ts` | `and`, `lt` | 12 |

---

## 21. RELIABILITY — `console.log` in production API route leaks analytics data

**Severity: LOW**

`src/app/api/analytics/team/[id]/route.ts` line 114:
```ts
console.log("[team-analytics] anonymize:", anonymize, "teamAverages:", JSON.stringify(teamAverages), "heatmap count:", heatmapData.length);
```
This debug log runs on every team analytics request and serializes team member names and scores to server logs. It should be removed.

---

## 22. RELIABILITY — `ZodError` detected by name string comparison

**Severity: LOW**

22 catch blocks use `error.name === "ZodError"` instead of `error instanceof ZodError`. This is fragile: if Zod's class name changes, the check silently fails and the error propagates as a 500.

Files: all API routes in `src/app/api/` that contain validation catch blocks.

Fix approach: Import `ZodError` from `zod` and use `instanceof`.

---

## 23. ARCHITECTURE — No `middleware.ts` for route protection

**Severity: HIGH**

There is no `middleware.ts` at the project root. The dashboard layout (`src/app/(dashboard)/layout.tsx`) performs `auth()` and `redirect()` as a fallback defense but unauthenticated requests still reach server render before being redirected. API routes call `auth()` individually which is correct but adds latency on every unauthenticated probe.

Fix approach: Add `middleware.ts` with an Auth.js-compatible `authorized` callback. Use a `matcher` for `/(dashboard)/(.*)` and `/api/(.*)` paths.

---

*Concerns audit: 2026-03-06*
