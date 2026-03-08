# Phase 20: Mobile Responsiveness - Research

**Researched:** 2026-03-08
**Domain:** Responsive UI — Tailwind CSS 4 breakpoints, shadcn/ui DropdownMenu overflow pattern, WCAG 2.5.5 touch targets, TanStack Table column visibility
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MOB-01 | Template list action bar fits within mobile viewport — overflow menu (`...`) collapses secondary actions below 768px | DropdownMenu pattern; `flex-wrap` toolbar with `md:hidden`/`hidden md:flex` guards |
| MOB-02 | Template detail action bar fits within mobile viewport — overflow menu for secondary actions | Same DropdownMenu pattern; template-editor.tsx header bar has 5–6 buttons that overflow |
| MOB-03 | AI nudge dismiss button meets 44×44px minimum touch target (WCAG 2.5.5) | Button `size="icon"` is 36×36px (`size-9`); needs `size-11` (44px) or explicit `min-w-[44px] min-h-[44px]` class |
| MOB-04 | People list is readable on mobile — card layout or priority columns visible (Name, Role) | TanStack Table column visibility API; hide secondary columns below 768px via `hidden md:table-cell` on `<TableHead>`/`<TableCell>` |
| MOB-05 | Audit log table is readable on mobile — card-based row layout or priority columns | Same column-hiding approach; audit log has 5 columns — hide Actor email, Target on mobile |
</phase_requirements>

---

## Summary

Phase 20 fixes five mobile breakage points discovered in the March 2026 UX audit. The problems split into three categories: (1) action toolbars with too many buttons for narrow screens (MOB-01, MOB-02), (2) a dismiss button that is too small to tap reliably (MOB-03), and (3) data tables that are illegible on mobile because they display all columns at equal width (MOB-04, MOB-05).

The entire stack is Tailwind CSS 4 + shadcn/ui + Next.js App Router. No new dependencies are required. The project already ships `DropdownMenu` from Radix UI (shadcn wrapper) and the TanStack Table instance in `PeopleTable` already has the column model loaded — column visibility is a zero-dependency toggle. The nudge dismiss button fix is a one-liner class change.

The standard Tailwind `md:` breakpoint (≥768px) is the correct split point because the requirements spec "below 768px" as the collapse threshold.

**Primary recommendation:** Use `DropdownMenu` (`MoreHorizontal` trigger) for overflow menus, Tailwind `hidden md:table-cell` / `md:hidden` for table columns, and explicit `min-w-[44px] min-h-[44px]` (or `size-11`) for the nudge dismiss button.

---

## Standard Stack

### Core (all already installed — zero new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS | 4.x | Responsive breakpoint classes (`sm:`, `md:`) | Already used project-wide |
| shadcn/ui DropdownMenu | (radix-ui) | Overflow `...` menu trigger + item list | Already in `src/components/ui/dropdown-menu.tsx` |
| TanStack Table | 8.x | Column visibility API for responsive tables | Already powering `PeopleTable` |
| Lucide React | current | `MoreHorizontal` icon for overflow trigger | Already installed |

### Tailwind Breakpoints (Tailwind 4 defaults — verified unchanged)

| Prefix | Min Width | Usage in This Phase |
|--------|-----------|---------------------|
| `sm:` | 640px | Not used here (too narrow for practical table use) |
| `md:` | 768px | Primary mobile/desktop split per requirements |
| `lg:` | 1024px | Already used in template list grid (`lg:grid-cols-3`) |

**No new packages needed.** `bun install` not required.

---

## Architecture Patterns

### Recommended Project Structure

No new directories. Changes are confined to existing files:

```
src/
├── components/
│   ├── templates/
│   │   ├── template-list.tsx          # MOB-01: action bar overflow
│   │   └── template-editor.tsx        # MOB-02: action bar overflow
│   ├── dashboard/
│   │   ├── nudge-card.tsx             # MOB-03: dismiss button touch target
│   │   └── nudge-list.tsx             # MOB-03: same dismiss button pattern
│   └── people/
│       └── people-table-columns.tsx   # MOB-04: column cell hiding classes
└── app/(dashboard)/settings/audit-log/
    └── audit-log-client.tsx           # MOB-05: column hiding
```

### Pattern 1: Overflow Menu (MOB-01, MOB-02)

**What:** Replace a flat `flex gap-2` button row with a primary action + a `DropdownMenu` containing secondary actions. Show the full row on desktop (`md:flex hidden`), show only primary + `...` trigger on mobile (`flex md:hidden`).

**When to use:** 3+ peer-level action buttons in a horizontal toolbar that will overflow at `<768px`.

**Example (template-list.tsx action bar):**
```tsx
// Source: shadcn/ui DropdownMenu already in src/components/ui/dropdown-menu.tsx
// Mobile: primary button + overflow trigger
<div className="flex items-center gap-2 md:hidden">
  <Button onClick={() => setCreateOpen(true)} size="sm">
    <Plus className="mr-2 h-4 w-4" />
    {t("createTemplate")}
  </Button>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="icon-sm">
        <MoreHorizontal className="h-4 w-4" />
        <span className="sr-only">More actions</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem asChild>
        <Link href="/templates/schema">
          <BookOpen className="mr-2 h-4 w-4" />
          {t("export.schemaLink")}
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/templates/ai-editor">
          <Wand2 className="mr-2 h-4 w-4" />
          {t("aiEditor.entryPoints.generateWithAI")}
        </Link>
      </DropdownMenuItem>
      {/* ImportDialog trigger goes here as DropdownMenuItem */}
    </DropdownMenuContent>
  </DropdownMenu>
</div>

// Desktop: original full row (unchanged)
<div className="hidden md:flex items-center gap-2">
  {/* existing buttons unchanged */}
</div>
```

**For template-editor.tsx (MOB-02):** The header bar has 5–6 buttons (Edit with AI, Export, Publish/Unpublish, Set Default, Duplicate, Archive). On mobile: keep "Save" as primary (it must always be reachable), collapse all others into `DropdownMenu`. "Archive" (destructive) should remain an `AlertDialog` — trigger it by keeping the AlertDialogTrigger inside the DropdownMenuItem, or by opening it via state (`useState<boolean>`).

**Destructive action in dropdown:** Use controlled state pattern:
```tsx
const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

// In DropdownMenuItem:
<DropdownMenuItem
  className="text-destructive focus:text-destructive"
  onSelect={() => setArchiveDialogOpen(true)}
>
  <Archive className="mr-2 h-4 w-4" /> {t("editor.archive")}
</DropdownMenuItem>

// AlertDialog controlled externally:
<AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
  {/* ... */}
</AlertDialog>
```

This is necessary because `AlertDialogTrigger` inside `DropdownMenuItem` has a known Radix focus trap conflict — the dropdown closes before the dialog can open when using the nested trigger pattern directly.

### Pattern 2: Table Column Hiding (MOB-04, MOB-05)

**What:** Add `className="hidden md:table-cell"` to both `<TableHead>` and every corresponding `<TableCell>` for secondary columns. Priority columns (Name, Role for people; Timestamp, Action for audit) have no hiding class.

**When to use:** TanStack Table with static column definitions. The project uses `createColumns()` factory in `people-table-columns.tsx`.

**People table columns priority:**

| Column | Mobile visible | Desktop visible |
|--------|---------------|-----------------|
| Name | Yes | Yes |
| Role | Yes | Yes |
| Email | No (`hidden md:table-cell`) | Yes |
| Teams | No | Yes |
| Manager | No | Yes |
| Status | No | Yes |
| Actions (menu) | Yes | Yes |

**Audit log columns priority:**

| Column | Mobile visible | Desktop visible |
|--------|---------------|-----------------|
| Expand chevron | Yes | Yes |
| Timestamp | Yes | Yes |
| Actor | Yes (name only; hide email sub-line via `hidden md:flex`) | Yes |
| Action | Yes | Yes |
| Target | No (`hidden md:table-cell`) | Yes |

**Implementation note for people-table-columns.tsx:** The `<TableHead>` is rendered by the parent `PeopleTable` via `flexRender`. The hiding class must be on the column's `header` render return AND the `cell` render return. For TanStack Table, the idiomatic approach is to add `meta: { className: "hidden md:table-cell" }` to the column definition and read it in the table render loop:

```tsx
// In createColumns():
{
  accessorKey: "email",
  meta: { className: "hidden md:table-cell" },
  header: ...,
  cell: ...,
}

// In PeopleTable render:
<TableHead
  key={header.id}
  className={header.column.columnDef.meta?.className}
>
```

Alternatively (simpler, no meta type augmentation needed): add `className` directly in the cell/header render functions as a wrapper `<div className="hidden md:block">` — but this looks wrong in table context. The `meta` approach is cleaner for table columns.

### Pattern 3: WCAG 2.5.5 Touch Target (MOB-03)

**What:** WCAG 2.5.5 requires interactive targets to be at least 44×44 CSS pixels. The current nudge dismiss button is `size-7` (28px) in `nudge-card.tsx` and `size-5` (20px) in `nudge-list.tsx`. Both are below the 44px minimum.

**Correct fix:** Change to `size="icon"` (36px per button.tsx) plus explicit minimum dimension classes, OR use a custom className override. The cleanest solution that does not break visual design is `className="size-11 shrink-0"` directly overriding the CVA size — `size-11` = 44px in Tailwind.

**nudge-card.tsx dismiss button — current:**
```tsx
<Button
  variant="ghost"
  size="icon"
  className="size-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
  ...
>
```

**nudge-card.tsx dismiss button — fixed:**
```tsx
<Button
  variant="ghost"
  size="icon"
  className="size-11 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity md:size-7"
  ...
>
```

The `md:size-7` restores the compact appearance on desktop where precision pointing is possible. On mobile the full 44px is available.

**nudge-list.tsx dismiss button — fixed same pattern:** `size-5` → `size-11 md:size-5`.

**Note:** The opacity-0/group-hover pattern also hides the button on mobile (no hover state). The dismiss must be visible without hover on touch devices:
```tsx
className="size-11 shrink-0 opacity-0 group-hover:opacity-100 md:opacity-0 transition-opacity"
```
This makes it always visible on mobile (`opacity-0` only applies at `md:` and up).

### Anti-Patterns to Avoid

- **Hiding entire table on mobile and showing cards:** Adds significant complexity with duplicate markup. Column-hiding is simpler and sufficient for the current data density.
- **Using CSS `overflow-x: auto` on tables:** Allows horizontal scrolling but does not make content readable — rejected by the requirement spec ("readable on mobile").
- **DropdownMenu inside AlertDialogTrigger (nested):** Known Radix focus-trap conflict. Use controlled state on the AlertDialog instead.
- **`visibility: hidden` instead of `display: none` for column hiding:** Does not reclaim layout space. Use `hidden md:table-cell` (display-based).
- **`min-w-[44px]` without `min-h-[44px]`:** Touch target must be 44×44, not just wide. Use `size-11` (sets both dimensions) or add both min classes.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Overflow menu | Custom dropdown/popover component | shadcn `DropdownMenu` already installed | Handles keyboard nav, focus trap, portal, a11y |
| Touch target enforcement | JS-based size detection | Tailwind `size-11` class | Pure CSS, zero JS overhead |
| Responsive column hiding | JS window width listener | Tailwind `hidden md:table-cell` | CSS-only, no re-render on resize, SSR-safe |
| Table column configuration | New table component | TanStack Table `meta.className` pattern | Hooks into existing column definition factory |

---

## Common Pitfalls

### Pitfall 1: ImportDialog is a stateful component, not a simple button
**What goes wrong:** `ImportDialog` in `template-list.tsx` manages its own open state internally and renders its own trigger button. If you try to put it in a `DropdownMenuItem`, the trigger button inside it conflicts with the DropdownMenuItem click handler.
**Why it happens:** `ImportDialog` wraps a `<Button>` trigger that opens a `<Dialog>`. DropdownMenuItem also listens for clicks.
**How to avoid:** Lift the open state out of `ImportDialog`, add an `open`/`onOpenChange` prop, and render the trigger inside the DropdownMenuItem separately. Alternatively, keep `ImportDialog` as-is in the desktop layout and build a separate state-controlled version for mobile.
**Warning signs:** Dialog flashes open and immediately closes; open state never persists.

### Pitfall 2: Tailwind 4 `hidden` class behavior in table context
**What goes wrong:** `hidden` on a `<TableCell>` does not collapse the table column space — it sets `display: none` on the `<td>` but the `<th>` still occupies width (or vice-versa).
**Why it happens:** Both `<th>` and `<td>` must be hidden simultaneously. If you hide only cells but not headers, the header row has ghost columns.
**How to avoid:** Apply `hidden md:table-cell` to both the `<TableHead>` and all its `<TableCell>` counterparts for that column. The `meta.className` pattern applied in the render loop handles this consistently.

### Pitfall 3: `group-hover` opacity pattern is invisible on touch
**What goes wrong:** The dismiss `X` button on nudges is set to `opacity-0 group-hover:opacity-100`. On touch devices there is no hover state, so the button never becomes visible — users cannot dismiss nudges on mobile.
**Why it happens:** CSS `:hover` does not fire on touch-only devices (it fires after tap on some devices but not reliably).
**How to avoid:** Apply `opacity-100` by default and only hide on md+: `opacity-100 md:opacity-0 md:group-hover:opacity-100`.

### Pitfall 4: AlertDialog nested in DropdownMenu
**What goes wrong:** Clicking "Archive" in the overflow menu closes the dropdown and the AlertDialog never opens, or the focus trap prevents AlertDialog from mounting.
**Why it happens:** Radix DropdownMenu captures focus on close, conflicting with AlertDialog trying to take focus simultaneously.
**How to avoid:** Use `useState<boolean>` to control `AlertDialog` open state. The DropdownMenuItem `onSelect` sets the state to `true`; the AlertDialog `onOpenChange` resets it. This is the official Radix UI recommendation for this scenario.

### Pitfall 5: `DropdownMenuContent align="end"` clips at screen edge
**What goes wrong:** On mobile, `align="end"` positions the menu aligned to the right of the trigger — on narrow screens this may clip outside the viewport right edge.
**Why it happens:** Radix UI computes position relative to viewport; on very narrow screens the menu may be wider than available space.
**How to avoid:** Radix automatically applies collision detection and flips — no fix needed unless custom `sideOffset` is used incorrectly. Verify in browser dev tools at 375px width.

---

## Code Examples

### DropdownMenu import pattern (already available)
```tsx
// Source: src/components/ui/dropdown-menu.tsx (already installed)
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
```

### TanStack Table meta type augmentation (for people-table-columns.tsx)
```tsx
// Extend ColumnMeta to accept className — add to people-table-columns.tsx or a types file
declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    className?: string;
  }
}
```

### Table render loop reading meta (people-table.tsx)
```tsx
// In PeopleTable render, apply meta.className to both TableHead and TableCell:
<TableHead
  key={header.id}
  className={header.column.columnDef.meta?.className}
>
  {/* ... */}
</TableHead>

// In body:
<TableCell
  key={cell.id}
  className={cell.column.columnDef.meta?.className}
>
  {/* ... */}
</TableCell>
```

### WCAG touch target — nudge-card.tsx
```tsx
// Before:
className="size-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"

// After (44px on mobile, compact on desktop, always visible on mobile):
className="size-11 shrink-0 opacity-100 md:size-7 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `overflow-x: auto` scroll tables on mobile | Column hiding via `hidden md:table-cell` | ~2022 (Tailwind v3+) | No horizontal scroll; clean single-column experience |
| Custom dropdown/popover for overflow menus | Radix UI DropdownMenu (shadcn) | Already in project | Zero custom logic needed |
| `window.innerWidth` JS check for responsive behavior | Pure CSS Tailwind breakpoints | Always preferred | SSR-safe, no hydration mismatch, no re-render |

**Not applicable here:**
- Container queries (`@container`) — not needed; viewport breakpoints are sufficient for these use cases.
- `ResizeObserver` — not needed; CSS handles responsiveness.

---

## Open Questions

1. **ImportDialog refactor scope**
   - What we know: `ImportDialog` currently owns its own open state and trigger button
   - What's unclear: Whether the planner should refactor it to accept `open`/`onOpenChange` props (bigger change) or use a simpler workaround (separate mobile trigger state in the parent)
   - Recommendation: Add controlled props to ImportDialog — it's a 5-line change and makes the component more reusable. Keep the existing trigger as the default so desktop is unaffected.

2. **Audit log actor email — hide or truncate?**
   - What we know: On mobile, the actor cell shows name + email in a flex-col
   - What's unclear: Whether to hide the email sub-line on mobile (`hidden md:flex` on the email `<span>`) vs. hide the whole Actor column (which would remove names too — worse)
   - Recommendation: Keep the Actor column visible, hide only the email sub-line via `<span className="hidden md:block text-xs text-muted-foreground">` inside the cell.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (node environment by default; `happy-dom` environment for component tests) |
| Config file | `vitest.config.ts` |
| Quick run command | `bun run test` |
| Full suite command | `bun run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MOB-01 | Template list action bar renders overflow menu below 768px | Visual/manual | N/A — requires browser resize | N/A |
| MOB-02 | Template detail action bar collapses on mobile | Visual/manual | N/A — requires browser resize | N/A |
| MOB-03 | Nudge dismiss button has `size-11` class (44px min) | Unit | `bun run test src/components/dashboard/__tests__/nudge-card-touch-target.test.tsx` | ❌ Wave 0 |
| MOB-04 | People table columns have `hidden md:table-cell` meta on secondary columns | Unit | `bun run test src/components/people/__tests__/people-table-columns-mobile.test.tsx` | ❌ Wave 0 |
| MOB-05 | Audit log target column has `hidden md:table-cell` class | Unit | `bun run test src/app/(dashboard)/settings/audit-log/__tests__/audit-log-columns-mobile.test.tsx` | ❌ Wave 0 |

**Note on MOB-01 and MOB-02:** Responsive show/hide behavior (`hidden md:flex`) is a CSS concern — it cannot be tested in Vitest's JSDOM/happy-dom environment without a real browser. These are manually verified via browser DevTools device emulation at 375px and 768px. The unit tests for MOB-03, MOB-04, MOB-05 assert that the correct classes are present in the rendered output, which is sufficient for a regression safety net.

### Sampling Rate
- **Per task commit:** `bun run test`
- **Per wave merge:** `bun run test && bun run typecheck`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/dashboard/__tests__/nudge-card-touch-target.test.tsx` — covers MOB-03 (asserts `size-11` class on dismiss button)
- [ ] `src/components/people/__tests__/people-table-columns-mobile.test.tsx` — covers MOB-04 (asserts `meta.className` includes `hidden` for secondary columns)
- [ ] `src/app/(dashboard)/settings/audit-log/__tests__/audit-log-columns-mobile.test.tsx` — covers MOB-05 (asserts Target column has hide class)
- [ ] `@testing-library/react` — required for component render tests (`bun add -D @testing-library/react @testing-library/jest-dom`); already installed from Phase 19

**From Phase 19:** `@testing-library/react` was installed in Phase 19 Wave 0. Confirm it is available before Wave 0 of this phase.

---

## Sources

### Primary (HIGH confidence)
- Codebase inspection — `src/components/templates/template-list.tsx`, `template-editor.tsx`, `nudge-card.tsx`, `nudge-list.tsx`, `people-table.tsx`, `people-table-columns.tsx`, `audit-log-client.tsx`, `src/components/ui/button.tsx`, `src/components/ui/dropdown-menu.tsx`
- Tailwind CSS 4 defaults — breakpoint `md` = 768px, `size-11` = 44px, `hidden` = `display: none`
- WCAG 2.5.5 — "Target Size (Enhanced)" requires 44×44 CSS pixels minimum

### Secondary (MEDIUM confidence)
- Radix UI DropdownMenu + AlertDialog conflict — official Radix docs recommend controlled state pattern for dialogs triggered from within menus; consistent with project pattern in `user-actions-menu.tsx` (which already uses this approach)
- TanStack Table `meta` pattern — documented in TanStack Table v8 "Column Definitions" guide; `meta` is a typed escape hatch for arbitrary column metadata

### Tertiary (LOW confidence)
- None — all findings are grounded in direct codebase inspection or well-established CSS/a11y standards

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies; everything is already in the project
- Architecture: HIGH — patterns derived directly from reading the actual source files that need to change
- Pitfalls: HIGH — ImportDialog state issue and AlertDialog/DropdownMenu conflict identified from direct code inspection; opacity/hover mobile issue is well-known CSS behavior

**Research date:** 2026-03-08
**Valid until:** 2026-06-08 (stable — Tailwind 4, shadcn, TanStack Table all stable APIs)
