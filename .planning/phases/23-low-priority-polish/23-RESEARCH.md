# Phase 23: Low-Priority Polish - Research

**Researched:** 2026-03-20
**Domain:** UI polish — copy, styling, conditional rendering, i18n
**Confidence:** HIGH

## Summary

Phase 23 consists of 8 independent visual and copy fixes. All target files have been inspected and the changes are well-scoped. Each item is a 1-5 line edit in existing files — no new components, no new API routes, no schema changes.

The key risk is POL-03 (forgot-password centering) which may already be resolved: the shared `(auth)/layout.tsx` applies `flex min-h-screen items-center justify-center` to all auth children. Both login, register, and forgot-password pages render a bare `<Card>` inside this layout. The planner should verify this visually before writing implementation tasks. POL-01 is also nearly a no-op — EN already says "Acme Inc" and RO says "Acme SRL" — the change is to standardize to "Acme Corp" / "Acme SRL" per CONTEXT.md.

**Primary recommendation:** Bundle all 8 items into a single plan with one task per item. No dependencies between items — they can be committed together.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- POL-01: Company name placeholder -> "Acme Corp" (EN), keep "Acme SRL" (RO)
- POL-02: Map known acronyms (AI) to correct casing in formatActionLabel fallback
- POL-03: Forgot-password card vertically centered to match login/register
- POL-04: Hide "Active" badge when all visible users are active; show only for non-default states
- POL-05: COMPLETED divider text -> `text-[13px]` (from `text-[10px]`)
- POL-06: Team cards get visible border in dark mode (`dark:border-border` or similar)
- POL-07: "Start first session" link on series cards with no sessions — manager-only
- POL-08: History search placeholder -> "Search..." (EN) / "Cauta..." (RO) — all screen sizes

### Claude's Discretion
- Team card border opacity/color choice for dark mode
- Whether Active badge logic checks visible page or full dataset

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| POL-01 | Registration company name placeholder shows company name | i18n key `auth.register.companyPlaceholder` in `messages/en/auth.json:28` and `messages/ro/auth.json:28` — change EN from "Acme Inc" to "Acme Corp", RO already "Acme SRL" |
| POL-02 | Audit log action names use correct acronym casing | `formatActionLabel()` in `audit-log-client.tsx:71-76` — fallback splits on `_` and title-cases each word; add acronym map |
| POL-03 | Forgot-password card vertically centered | Shared `(auth)/layout.tsx` already centers all children — verify visually; may already be resolved |
| POL-04 | People list hides Active badge when all active | Status cell in `people-table-columns.tsx:211-218` — add `hasOnlyActiveUsers` prop or inline check |
| POL-05 | Action items COMPLETED divider uses 13px font | Two locations in `action-items-page.tsx:361` and `:460` — change `text-[10px]` to `text-[13px]` |
| POL-06 | Team cards have visible border in dark mode | `team-card.tsx:35` Card className — add `dark:border-border` |
| POL-07 | Session cards show "Start first session" link | `series-card.tsx:477-487` no-summary block — add conditional link when `latestSession` is null and user is manager |
| POL-08 | Mobile history search placeholder fits without truncation | `messages/en/history.json:5` and `messages/ro/history.json:5` — shorten to "Search..." / "Cauta..." |
| POL-09 | (Maps to one of the 8 success criteria above — ROADMAP lists 9 IDs for 8 criteria) | Covered by POL-01 through POL-08 |
</phase_requirements>

## Standard Stack

No new libraries needed. All changes use existing project dependencies:

| Library | Purpose | Already Installed |
|---------|---------|-------------------|
| next-intl | Translation key updates | Yes |
| Tailwind CSS 4 | Class-level styling fixes | Yes |
| shadcn/ui Card, Badge, Separator | Component-level tweaks | Yes |

## Architecture Patterns

### File Locations (all changes)

```
messages/en/auth.json              # POL-01: companyPlaceholder
messages/ro/auth.json              # POL-01: companyPlaceholder (verify)
messages/en/history.json           # POL-08: searchPlaceholder
messages/ro/history.json           # POL-08: searchPlaceholder
src/app/(dashboard)/settings/audit-log/audit-log-client.tsx  # POL-02
src/app/(auth)/forgot-password/page.tsx                       # POL-03 (may be no-op)
src/components/people/people-table-columns.tsx                # POL-04
src/components/action-items/action-items-page.tsx             # POL-05
src/components/people/team-card.tsx                           # POL-06
src/components/series/series-card.tsx                         # POL-07
```

### Pattern: Conditional Badge Rendering (POL-04)

The `createColumns` function receives `allUsers` but not a `hasOnlyActiveUsers` flag. Two approaches:

**Option A (recommended): Check at column definition time.**
The `createColumns` function already receives the full user list via its options. Compute `allActive` inside `createColumns`:
```typescript
const allActive = allUsers.every(u => /* need status */);
```
Problem: `allUsers` only has `{ id, firstName, lastName }` — no `status` field.

**Option B (recommended): Accept a new option.**
Add `hasMixedStatuses: boolean` to `CreateColumnsOptions`. The parent component (`people-table.tsx` or similar) computes this from the full dataset and passes it in. The status cell conditionally renders based on this flag.

**Option C: Check per-row inline.**
Each row checks `status === 'active'` and skips rendering. But this doesn't achieve "hide badge only when ALL are active" — it would hide the badge for every active user individually, which is the desired behavior per CONTEXT.md ("Badge only appears for non-default states"). This is actually the simplest: just don't render the badge when `status === 'active'`.

**Recommendation: Option C.** The requirement says "badge only appears for non-default states" — meaning active users never show a badge, period. Only pending/deactivated users get a badge. This is the simplest change: wrap the Badge in `{status !== 'active' && ...}`.

### Pattern: Acronym-Aware Title Case (POL-02)

Current fallback in `formatActionLabel`:
```typescript
action.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
```

Fix — add an acronym map before the `.map()`:
```typescript
const ACRONYMS = new Set(["ai", "rls", "api"]);
action.split("_").map((w) => ACRONYMS.has(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
```

### Pattern: Manager-Only Empty State Link (POL-07)

In `series-card.tsx`, the no-summary placeholder (lines 477-487) is shown when `series.latestSummary` is falsy. The "Start first session" link should appear when:
1. No `latestSession` exists (null)
2. Current user is the manager (`isManager` is already computed at line 265)

```typescript
{!series.latestSummary && (
  <>
    <p className="text-xs text-muted-foreground/40 ...">
      {t("series.summaryPlaceholder")}
    </p>
    {isManager && !series.latestSession && (
      <button onClick={/* startSession.mutate() */} className="text-xs text-primary ...">
        {t("series.startFirst")} →
      </button>
    )}
  </>
)}
```

The link should trigger `startSession.mutate()` (already defined in the component) rather than navigating to a URL, since starting a session is a POST operation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Vertical centering | Custom CSS | Shared `(auth)/layout.tsx` already handles this | Layout already applies `items-center justify-center` |
| Acronym detection | Regex-based NLP | Simple `Set` lookup | Only a handful of known acronyms in action names |

## Common Pitfalls

### Pitfall 1: Forgetting Both Translation Files
**What goes wrong:** Changing EN but forgetting RO, or vice versa.
**How to avoid:** Every i18n change must touch both `messages/en/` and `messages/ro/` files.

### Pitfall 2: POL-03 May Already Work
**What goes wrong:** Writing centering code for a page that's already centered via the shared layout.
**How to avoid:** Visually verify first. The `(auth)/layout.tsx` applies `flex min-h-screen items-center justify-center` to ALL auth children. If forgot-password is already centered, this is a no-op — just verify and document.

### Pitfall 3: POL-04 Breaking Column Layout
**What goes wrong:** Hiding the badge changes the column width, shifting the table layout.
**How to avoid:** The status column uses `hidden md:table-cell` — it's only visible on desktop. An empty cell is fine. The column header still shows; only the cell content changes conditionally.

### Pitfall 4: POL-07 Click Handler Propagation
**What goes wrong:** The series card has a full-card Link overlay (`<Link href={...} className="absolute inset-0 z-0" />`). Any clickable element inside needs `relative z-10 pointer-events-auto` and must call `e.preventDefault(); e.stopPropagation()`.
**How to avoid:** Follow the existing pattern for the Start/Resume button (line 512-537) which already handles this correctly with `relative z-10 pointer-events-auto`.

### Pitfall 5: POL-05 Has Two Locations
**What goes wrong:** Fixing the divider in "My Items" section but missing the identical divider in "My Reports" section.
**How to avoid:** The `text-[10px]` appears at two locations in `action-items-page.tsx`: line 361 (my items completed) and line 460 (report group completed). Both must be updated.

## Code Examples

### POL-01: Translation Update
```json
// messages/en/auth.json — change line 28
"companyPlaceholder": "Acme Corp"

// messages/ro/auth.json — verify line 28 (already "Acme SRL", may keep or update)
"companyPlaceholder": "Acme SRL"
```

### POL-02: Acronym Map
```typescript
// audit-log-client.tsx, inside formatActionLabel
const ACRONYMS: ReadonlySet<string> = new Set(["ai", "rls", "api"]);

function formatActionLabel(action: string): string {
  return (
    ACTION_LABEL_MAP.get(action) ??
    action
      .split("_")
      .map((w) => ACRONYMS.has(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}
```

### POL-04: Conditional Badge
```typescript
// people-table-columns.tsx, status cell (line 211-218)
cell: ({ row }) => {
  const status = row.original.status;
  if (status === "active") return null;
  return (
    <Badge variant="outline" className={getStatusColor(status)}>
      {t(`table.${status}`)}
    </Badge>
  );
},
```

### POL-05: Divider Font Size
```typescript
// action-items-page.tsx lines 361 and 460
// Change: text-[10px] -> text-[13px]
<span className="flex items-center gap-1 text-[13px] font-medium uppercase tracking-wider text-muted-foreground/60 ...">
```

### POL-06: Dark Mode Border
```typescript
// team-card.tsx line 35
<Card className="transition-all duration-200 hover:bg-accent/50 hover:shadow-md cursor-pointer h-full dark:border-border">
```

### POL-08: Search Placeholder
```json
// messages/en/history.json
"searchPlaceholder": "Search..."

// messages/ro/history.json
"searchPlaceholder": "Cauta..."
```

## State of the Art

No technology changes relevant — all fixes use established Tailwind/next-intl patterns already in the codebase.

## Open Questions

1. **POL-03: Is forgot-password already centered?**
   - What we know: The shared `(auth)/layout.tsx` applies vertical centering to all children. Login, register, and forgot-password all render a bare `<Card>` inside this layout.
   - What's unclear: Whether there's a visual difference not captured in the code (e.g., viewport height issue, success state layout).
   - Recommendation: Verify visually during execution. If already centered, document as verified/no-op.

2. **POL-09: Missing requirement ID**
   - What we know: ROADMAP lists POL-01 through POL-09 (9 IDs) but only 8 success criteria exist.
   - What's unclear: Whether POL-09 maps to one of the 8 or is an artifact.
   - Recommendation: Treat as covered — all 8 success criteria are mapped to implementations.

## Sources

### Primary (HIGH confidence)
- Direct code inspection of all 10 target files (auth pages, people-table-columns, action-items-page, team-card, series-card, audit-log-client, translation files)
- `(auth)/layout.tsx` — verified centering classes
- `23-CONTEXT.md` — user decisions locked

### Secondary (MEDIUM confidence)
- ROADMAP.md success criteria — requirement-to-code mapping

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries, all existing patterns
- Architecture: HIGH - all files inspected, changes are 1-5 lines each
- Pitfalls: HIGH - click propagation, dual-location fixes identified from code

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (stable — UI polish, no library version sensitivity)
