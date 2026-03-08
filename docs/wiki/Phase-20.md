# Phase 20: Mobile Responsiveness

**Status**: Complete
**Milestone**: v1.3 UI/UX Improvements
**Depends on**: Phase 19
**Completed**: 2026-03-08

## Goal

Fix action bars, touch targets, and table layouts so the app is fully usable on mobile (≥360px viewport).

## Success Criteria

1. MOB-01: Template list action bar fits on mobile; overflow DropdownMenu below 768px
2. MOB-02: Template detail (editor) action bar fits on mobile; overflow DropdownMenu below 768px
3. MOB-03: AI nudge dismiss button meets 44×44px WCAG 2.5.5 minimum touch target
4. MOB-04: People list is readable on mobile — secondary columns hidden below `md`
5. MOB-05: Audit log table is readable on mobile — Target column and actor email hidden below `md`

## What Was Built

- **Template list mobile overflow menu** (`src/components/templates/template-list.tsx`): `DropdownMenu` with `MoreHorizontal` trigger replaces button row on mobile. Import dialog updated with optional controlled `open`/`onOpenChange` props to support trigger-less opening from dropdown.
- **Template editor mobile overflow menu** (`src/components/templates/template-editor.tsx`): desktop shows full button row (`hidden md:flex`); mobile shows `DropdownMenu` (`flex md:hidden`). Archive uses controlled `AlertDialog` to avoid Radix focus-trap conflict when nested inside `DropdownMenu`.
- **Nudge dismiss touch target** (`src/components/dashboard/nudge-card.tsx`): button raised to `min-h-[44px] min-w-[44px]`.
- **People table responsive columns** (`src/components/people/people-table-columns.tsx`): added `meta: { className: "hidden md:table-cell" }` to email, teams, manager, and status columns.
- **Audit log responsive columns** (`src/components/audit/audit-log-columns.tsx`): Target column and actor email hidden below `md`.

## Key Decisions

- `AlertDialogTrigger` is NOT nested inside `DropdownMenuItem` — Radix Portals conflict causes focus-trap issues. Instead, archive confirmation uses a controlled `AlertDialog` opened via state from the dropdown item's `onClick`.
- Import dialog gets optional controlled props to remain backward-compatible with existing trigger usage.
- TanStack Table `meta.className` pattern for responsive columns (consistent with existing `DataTable` implementation).

## Key Files

- `src/components/templates/template-list.tsx`
- `src/components/templates/template-editor.tsx`
- `src/components/templates/import-dialog.tsx`
- `src/components/dashboard/nudge-card.tsx`
- `src/components/people/people-table-columns.tsx`
