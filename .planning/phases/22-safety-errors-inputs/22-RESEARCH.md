# Phase 22: Safety, Errors & Inputs — Research

**Researched:** 2026-03-15
**Domain:** Next.js App Router error pages, shadcn Danger Zone UI pattern, shadcn DatePicker (Calendar + Popover)
**Confidence:** HIGH

---

## Summary

Phase 22 has three tightly scoped requirements:

1. **SAFE-01** — Move "Delete Team" into a visually distinct Danger Zone section at the bottom of `team-detail-client.tsx`. The current implementation puts the delete button inline with "Add Members" in the actions row. The mutation and API route are already wired and working; only the UI placement changes.

2. **ERR-01** — Add a contextual `not-found.tsx` file inside the `(dashboard)/sessions/[id]/summary/` route segment. The parent page already calls `notFound()` correctly; there is simply no `not-found.tsx` to catch it, so Next.js falls back to its bare default. A single new file, co-located with the page, is sufficient.

3. **INP-01** — Replace native `<input type="date">` elements on the History page and Audit Log page with a shadcn `DatePicker` composed of `Calendar` + `Popover`. No `calendar.tsx` component exists yet; it must be added. The `react-day-picker` (v9) package and `date-fns` must be installed. `popover.tsx` is already present.

**Primary recommendation:** All three requirements are independent UI-level changes with no API or schema work. Execute as three focused tasks (one per requirement), each touching a small number of files.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SAFE-01 | "Delete Team" button in a visually distinct Danger Zone section, outlined red, separated from non-destructive actions | Existing mutation in `team-detail-client.tsx` is complete. Change is purely layout/styling: move button to a new bottom section, replace `variant="destructive"` with `variant="outline"` + red border/text classes, add section header and visual separator. |
| ERR-01 | Navigating to a non-existent session URL shows a contextual 404 page with "Back to Sessions" link | `not-found.tsx` co-located at `src/app/(dashboard)/sessions/[id]/summary/not-found.tsx`. No layout changes needed; the page already calls `notFound()`. |
| INP-01 | Date filter inputs on History and Audit Log pages use shadcn DatePicker — no native `<input type="date">` remains | Requires adding `calendar.tsx`, installing `react-day-picker` v9 + `date-fns`, and building a shared `DatePicker` wrapper component. Two consumer files: `history-page.tsx` and `audit-log-client.tsx`. |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-day-picker` | ^9.x | Calendar grid underlying shadcn Calendar | shadcn's official dependency for Calendar component |
| `date-fns` | ^4.x | Date formatting in DatePicker trigger button | Used by shadcn DatePicker code examples |
| `radix-ui` (Popover) | already installed | Popover wrapper for DatePicker | Already in project; `popover.tsx` component already exists |
| Next.js `not-found()` + `not-found.tsx` | Next.js 16 (in use) | App Router 404 handling | Official Next.js pattern — file co-location, no library needed |

**Note on react-day-picker version:** shadcn's Calendar component targets v9. The project currently does NOT have `react-day-picker` installed. Installing v9 is the correct target.

**Note on date-fns version:** date-fns v4 is the current release. The `format` function API is identical to v3; no migration concern.

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | already installed | `CalendarIcon` for DatePicker trigger | Import `Calendar` as `CalendarIcon` from lucide-react |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn Calendar + Popover | Native `<input type="date">` | Native inputs look inconsistent across OS/browser; don't match shadcn design system |
| shadcn Calendar + Popover | Third-party date picker (flatpickr, react-datepicker) | Extra dependency; shadcn is the project's established UI system |

**Installation:**
```bash
bun add react-day-picker date-fns
bunx shadcn@latest add calendar
```

> The `shadcn add calendar` command writes `src/components/ui/calendar.tsx` and adds `react-day-picker` to package.json. Running it after `bun add react-day-picker date-fns` is safe — the command idempotently sets up the component file.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/(dashboard)/
│   └── sessions/[id]/summary/
│       ├── page.tsx               # already calls notFound() — no change needed
│       └── not-found.tsx          # NEW — ERR-01
├── components/
│   ├── ui/
│   │   ├── calendar.tsx           # NEW — INP-01 dependency
│   │   └── date-picker.tsx        # NEW — shared DatePicker wrapper
│   ├── history/
│   │   └── history-page.tsx       # MODIFIED — replace date inputs
│   └── teams/
│       └── (dashboard)/teams/[id]/
│           └── team-detail-client.tsx  # MODIFIED — Danger Zone
└── app/(dashboard)/settings/audit-log/
    └── audit-log-client.tsx       # MODIFIED — replace date inputs
```

### Pattern 1: Next.js App Router `not-found.tsx`

**What:** A `not-found.tsx` file co-located in a route segment renders when `notFound()` is called from the nearest parent page. It is a Server Component by default.

**When to use:** Any `[id]` route segment where the server page calls `notFound()`.

**How it works:** When `notFound()` is thrown in `page.tsx`, Next.js searches up the file tree for the nearest `not-found.tsx`. If none exists, it falls back to the root default (bare Next.js 404). Placing `not-found.tsx` in `sessions/[id]/summary/` intercepts it at that level.

**Example:**
```tsx
// src/app/(dashboard)/sessions/[id]/summary/not-found.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SessionNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <h1 className="text-2xl font-semibold">Session not found</h1>
      <p className="text-muted-foreground">This session does not exist or you do not have access.</p>
      <Button asChild variant="outline">
        <Link href="/history">Back to Sessions</Link>
      </Button>
    </div>
  );
}
```

**i18n note:** The `not-found.tsx` is a Server Component. Use `getTranslations` from `next-intl/server` if translation keys are needed, consistent with the project's pattern in `history/page.tsx`.

### Pattern 2: Danger Zone Section

**What:** A visually separated section at the bottom of a settings/detail page housing destructive actions.

**When to use:** Any page with an irreversible delete action, where the delete button should not be adjacent to non-destructive actions.

**Visual spec (from SAFE-01 success criteria):**
- Visually separated from non-destructive actions (use `<Separator />` or `border-t` + `mt-8 pt-8`)
- Section heading: e.g. "Danger Zone" in small muted text or red
- Button: `variant="outline"` with red border and red text (NOT `variant="destructive"` — the spec says "outlined red")
- Confirmation: replace `window.confirm()` with `AlertDialog` from `@/components/ui/alert-dialog` (already in the codebase)

**Current state:** The delete button sits inline with the "Add Members" button in the actions row (line 333–358 of `team-detail-client.tsx`). The mutation (`deleteTeamMutation`) is wired and tested; only the placement and visual treatment change.

**Button styling for outlined red:**
```tsx
<Button
  variant="outline"
  size="sm"
  className="border-destructive text-destructive hover:bg-destructive/10"
  onClick={() => setDeleteDialogOpen(true)}
>
  <Trash2 className="mr-2 h-4 w-4" />
  {t("deleteTeam")}
</Button>
```

**AlertDialog replacement for `window.confirm`:**
The `AlertDialog` component is already present at `src/components/ui/alert-dialog.tsx`. Add an `open` state, replace the `onClick` confirm pattern with the AlertDialog trigger.

### Pattern 3: shadcn DatePicker (Calendar + Popover composition)

**What:** A button trigger that opens a Popover containing a Calendar component. The selected date is formatted with `date-fns` and displayed in the trigger button.

**When to use:** Any date filter input that currently uses native `<input type="date">`.

**State contract:** The consumers (`history-page.tsx` and `audit-log-client.tsx`) currently store dates as `string` in `YYYY-MM-DD` format (for URL params and API query strings). The DatePicker must convert `Date | undefined` ↔ `string | ""` at the boundary.

**Wrapper component pattern:**
```tsx
// src/components/ui/date-picker.tsx
"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerProps {
  value: string;           // YYYY-MM-DD string or ""
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function DatePicker({ value, onChange, placeholder = "Pick a date", className }: DatePickerProps) {
  const date = value ? parseISO(value) : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("justify-start text-left font-normal", !date && "text-muted-foreground", className)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : "")}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
```

**Consumer change pattern (history-page.tsx):**
```tsx
// Before:
<Input
  type="date"
  className="w-full sm:w-[160px]"
  value={fromDate}
  onChange={(e) => applyFilters(statusFilter, e.target.value, toDate, seriesFilter)}
/>

// After:
<DatePicker
  value={fromDate}
  onChange={(val) => applyFilters(statusFilter, val, toDate, seriesFilter)}
  placeholder={t("from")}
  className="w-full sm:w-[160px]"
/>
```

### Anti-Patterns to Avoid
- **Using `window.confirm()` for delete confirmation:** Already present in `team-detail-client.tsx`; replace with `AlertDialog`. `confirm()` is not accessible, cannot be styled, and blocks the main thread.
- **Placing `not-found.tsx` at root `app/` level only:** Root level only catches the case when no segment-level not-found exists. Co-location at the segment level provides a contextual page.
- **Using `Date` objects as state in consumers:** History and audit log pass date strings to the API. Keep string ↔ Date conversion inside the DatePicker component.
- **Importing `format` from `date-fns/format` directly:** Use `import { format } from "date-fns"` — the barrel export is fine and already tree-shaken in Next.js 16 build.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Calendar grid | Custom month/day grid | `react-day-picker` via shadcn `calendar.tsx` | Keyboard nav, ARIA, locale, range support all built in |
| Delete confirmation modal | Custom `<dialog>` or state-managed overlay | `AlertDialog` from `@/components/ui/alert-dialog` | Already in the project; fully accessible via Radix |
| 404 page routing | Manual redirect or error boundary | Next.js `not-found.tsx` convention | Framework handles the plumbing; just export a React component |

---

## Common Pitfalls

### Pitfall 1: `not-found.tsx` Does Not Inherit Dashboard Layout

**What goes wrong:** The `not-found.tsx` file in a route segment inside `(dashboard)/` DOES inherit the route group's `layout.tsx` automatically, including the top nav and sidebar. This is correct behavior. No extra layout wrapping is needed inside the file.

**Why it happens:** Developers sometimes think `not-found.tsx` needs to be wrapped in a full-page layout. Next.js handles this.

**How to avoid:** Export a simple content component from `not-found.tsx` — no `<html>`, `<body>`, or duplicate layout wrappers.

### Pitfall 2: `not-found.tsx` at Wrong Scope

**What goes wrong:** Placing `not-found.tsx` in `(dashboard)/sessions/[id]/` rather than in `(dashboard)/sessions/[id]/summary/` means the session series detail page (`/sessions/[id]`) also shows this not-found page, which has a different context.

**How to avoid:** Place the file at `sessions/[id]/summary/not-found.tsx` — exactly where `notFound()` is thrown in `summary/page.tsx`.

**Warning signs:** `/sessions/[id]` also calls `notFound()`. Since both are `notFound()` callers at different depths, the file at the tightest scope wins for the summary page. The parent `[id]/page.tsx` will fall back to the next `not-found.tsx` up the tree (if one exists, otherwise default).

### Pitfall 3: Date String Format Mismatch

**What goes wrong:** `date-fns` `format(date, "PPP")` gives a human-readable string (e.g. "March 15th, 2026") for display, while the API expects `YYYY-MM-DD`. Using the wrong format function for the onChange output breaks API filters.

**How to avoid:** Use `format(d, "yyyy-MM-dd")` in `onSelect` for the string output to the consumer; use `format(date, "PPP")` only for display in the trigger button.

### Pitfall 4: `react-day-picker` v8 vs v9 API

**What goes wrong:** shadcn's current Calendar targets v9, which has breaking changes from v8 (removed `ClassNames` type, changed `modifiersClassNames`, changed prop names). Installing v8 instead of v9 will produce TypeScript errors in `calendar.tsx`.

**How to avoid:** `bun add react-day-picker` installs the latest (v9.x). Do not pin to v8.

### Pitfall 5: Danger Zone Button Variant

**What goes wrong:** The success criteria explicitly says "outlined red — visually separated from non-destructive actions", not solid red. Using `variant="destructive"` (which renders a filled red button) does not match the spec.

**How to avoid:** Use `variant="outline"` with Tailwind classes `border-destructive text-destructive hover:bg-destructive/10`. The `destructive` CSS variable is already defined in the project's design system.

---

## Code Examples

Verified patterns from official sources and project codebase:

### not-found.tsx with next-intl (Server Component pattern)
```tsx
// Source: project pattern from src/app/(dashboard)/history/page.tsx
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function SessionNotFound() {
  const t = await getTranslations("sessions");
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <h1 className="text-2xl font-semibold">{t("notFound.title")}</h1>
      <p className="text-muted-foreground">{t("notFound.description")}</p>
      <Button asChild variant="outline">
        <Link href="/history">{t("notFound.backToSessions")}</Link>
      </Button>
    </div>
  );
}
```

### AlertDialog for Delete Confirmation (replacing window.confirm)
```tsx
// Source: src/components/ui/alert-dialog.tsx (already in project)
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

// In JSX:
<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
  <AlertDialogTrigger asChild>
    <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10">
      <Trash2 className="mr-2 h-4 w-4" />
      {t("deleteTeam")}
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
      <AlertDialogDescription>{t("deleteConfirm")}</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
      <AlertDialogAction variant="destructive" onClick={() => deleteTeamMutation.mutate()}>
        {deleteTeamMutation.isPending ? t("deleting") : t("deleteTeam")}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Danger Zone Section Layout
```tsx
{/* ── Danger Zone ── */}
{isAdmin && (
  <div className="mt-8 pt-8 border-t border-destructive/20 space-y-3">
    <div>
      <h3 className="text-sm font-medium text-destructive">{t("dangerZone")}</h3>
      <p className="text-xs text-muted-foreground mt-0.5">{t("dangerZoneDesc")}</p>
    </div>
    {/* AlertDialog delete button goes here */}
  </div>
)}
```

### calendar.tsx (shadcn new-york style, react-day-picker v9)
```tsx
// Source: shadcn/ui official — installed via `bunx shadcn@latest add calendar`
"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        // ... shadcn-provided class names
        ...classNames,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
```

> **Use `bunx shadcn@latest add calendar` to generate the full `calendar.tsx`** rather than hand-rolling it. The shadcn CLI generates the complete, up-to-date class names for the current react-day-picker v9 API.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `window.confirm()` for delete | `AlertDialog` (Radix) | Standard since React 18 era | Accessible, styleable, non-blocking |
| Native `<input type="date">` | shadcn DatePicker | shadcn Calendar v9 upgrade (2025) | Consistent design system, locale-aware |
| Root-level `not-found.tsx` only | Segment-level co-location | Next.js App Router | Contextual messages per route |
| `react-day-picker` v8 | v9 (breaking change) | react-day-picker 9.0.0 (2024) | Props renamed, ClassNames changed |

**Deprecated/outdated:**
- `window.confirm()`: Synchronous, non-styleable, unsupported in some environments. The project already has `AlertDialog` — use it.
- `<input type="date">`: Rendering is OS/browser-dependent. The shadcn design system should own all interactive controls.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.ts` |
| Quick run command | `bun run test` |
| Full suite command | `bun run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SAFE-01 | Delete Team button is in Danger Zone section, uses AlertDialog | unit (component) | `bun run test src/components -- --grep "danger zone"` | ❌ Wave 0 |
| ERR-01 | notFound.tsx renders with "Back to Sessions" link | manual-only (Next.js file-system routing; not unit-testable without full app render) | — | — |
| INP-01 | DatePicker renders a button trigger, opens Calendar on click, onChange emits YYYY-MM-DD string | unit (component) | `bun run test src/components -- --grep "DatePicker"` | ❌ Wave 0 |

**ERR-01 justification for manual-only:** The `not-found.tsx` mechanism is tested by navigating to a non-existent URL. This is an integration concern; unit testing the component props is possible but the routing logic cannot be verified in Vitest. Playwright E2E (Phase 28 suite) is the appropriate validator if automation is desired — document as a future addition to the E2E suite.

### Sampling Rate
- **Per task commit:** `bun run test`
- **Per wave merge:** `bun run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/ui/__tests__/date-picker.test.tsx` — covers INP-01 DatePicker string conversion
- [ ] `src/components/teams/__tests__/team-detail-danger-zone.test.tsx` — covers SAFE-01 AlertDialog presence

*(ERR-01 has no Wave 0 gap — it is manual-only)*

---

## Open Questions

1. **Translation keys for Danger Zone and not-found page**
   - What we know: `teams.json` has `deleteTeam` and `deleteConfirm` keys; `sessions.json` exists but its content was not fully inspected
   - What's unclear: Whether `dangerZone`, `dangerZoneDesc`, `deleteConfirmTitle`, and `sessions.notFound.*` keys exist already
   - Recommendation: Add missing keys during implementation in both `en/` and `ro/` message files. Follow the existing `teams.deleteConfirm` pattern.

2. **`shadcn add calendar` vs. hand-written `calendar.tsx`**
   - What we know: `bunx shadcn@latest add calendar` writes the component; the project uses `bunx shadcn@latest add` for other components (based on `components.json` presence)
   - What's unclear: Whether the current `shadcn` package version in the project supports `calendar` without network issues in the CI environment
   - Recommendation: Run `bunx shadcn@latest add calendar` in Wave 0. If it fails, write `calendar.tsx` manually from the react-day-picker v9 API — it is a short file.

3. **`not-found.tsx` scope: `sessions/[id]/summary/` vs `sessions/[id]/`**
   - What we know: Both `sessions/[id]/page.tsx` (series detail) and `sessions/[id]/summary/page.tsx` call `notFound()`
   - What's unclear: Whether the series detail page also needs a custom not-found (out of phase scope)
   - Recommendation: ERR-01 scopes to the session summary URL. Place `not-found.tsx` at `sessions/[id]/summary/` only. The series detail will fall back to the Next.js default for now — that is acceptable and out of scope.

---

## Sources

### Primary (HIGH confidence)
- Next.js 16 App Router docs (file-based `not-found.tsx`) — Next.js official conventions confirmed in project codebase (all pages call `notFound()` correctly)
- Project codebase (`team-detail-client.tsx`, `audit-log-client.tsx`, `history-page.tsx`) — direct inspection, HIGH confidence

### Secondary (MEDIUM confidence)
- [shadcn/ui Date Picker docs](https://ui.shadcn.com/docs/components/date-picker) — composition pattern confirmed, exact Calendar version from changelog
- [shadcn/ui Calendar changelog (June 2025)](https://ui.shadcn.com/docs/changelog/2025-06-calendar) — react-day-picker v9 confirmed as current target
- [react-day-picker v9 release](https://github.com/gpbl/react-day-picker/discussions/2280) — v8→v9 breaking changes confirmed

### Tertiary (LOW confidence)
- react-day-picker exact version (`^9.x`) inferred from search; not pinned from direct package.json inspection

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — popover.tsx exists, AlertDialog exists, no date picker exists; react-day-picker v9 confirmed by multiple sources
- Architecture: HIGH — based on direct codebase inspection of all affected files
- Pitfalls: HIGH — v8/v9 confirmed by GitHub issues; button variant spec confirmed from success criteria

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable domain; react-day-picker v9 is stable)
