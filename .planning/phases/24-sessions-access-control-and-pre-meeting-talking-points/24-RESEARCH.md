# Phase 24: Sessions Access Control and Pre-Meeting Talking Points - Research

**Researched:** 2026-03-19
**Domain:** Role-based list filtering, pre-meeting agenda UI (sheet), API status gate relaxation
**Confidence:** HIGH

## Summary

This phase has two distinct features sharing the sessions page: (1) role-based access control filtering on the series list, and (2) a pre-meeting talking points sheet accessible from the series card. Both features leverage existing infrastructure heavily -- `getSeriesCardData()` already has `role`/`userId`/`managerId` filter options, and `TalkingPointList` is fully built with optimistic mutations.

The main work for access control is: passing auth context into `getSeriesCardData`, adding manager name grouping for admin view, splitting the manager view into "My Team" vs "My 1:1s" sections, and applying the same filtering to the client-side `/api/series` refetch. For talking points, the work is: relaxing the POST status check from `in_progress`-only to also allow `scheduled`, building a sheet wrapper that fetches talking points by category for a scheduled session, and adding an Agenda button to the series card.

**Primary recommendation:** Implement in 3 plans -- (1) API changes: series filtering + talking points status relaxation, (2) sessions page grouping/sectioning UI, (3) pre-meeting sheet component + Agenda button on card.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Admin view:** All series grouped by manager name as section headers; admin's own group first with "(You)" label; remaining alphabetical
- **Manager view:** Two sections -- "My Team" (series where user is manager) and "My 1:1s" (series where user is report); manager name in "My 1:1s" cards shown top-right in muted text
- **Member view:** Flat list, series where user is report only
- **Agenda button:** Shown on series card when a scheduled (not-yet-started) session exists; opens sheet/drawer
- **Sheet header:** "PersonName . Session N . date" format
- **Categories:** Same as wizard context panel -- grouped by template section name
- **API change:** POST `/api/sessions/[id]/talking-points` must allow `status === "scheduled"` in addition to `"in_progress"`
- **Auth:** Both manager and report can add/edit/delete talking points (already handled by `isSeriesParticipant`)

### Claude's Discretion
- Sheet/drawer width and animation style
- Talking points count badge on Agenda button (show count if points exist)
- Empty state messaging inside the sheet
- Whether to show the "discussed" toggle in pre-meeting mode (keep or hide with readOnly for scheduled status)

### Deferred Ideas (OUT OF SCOPE)
- None
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn/ui Sheet | latest | Pre-meeting talking points drawer | Already in `src/components/ui/sheet.tsx`, Radix-based |
| TanStack Query | existing | Client-side series refetch + talking point mutations | Already used in `series-list.tsx` and `talking-point-list.tsx` |
| next-intl | existing | i18n for section headers, empty states, button labels | Already used throughout |
| Drizzle ORM | existing | Query filtering by role, manager name fetch | Already used in `series.ts` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | existing | Icons for Agenda button (e.g., `MessageSquare`, `ListTodo`) | Agenda button icon |

### Alternatives Considered
None -- all required libraries are already in the project.

## Architecture Patterns

### Recommended Changes

```
src/
  app/(dashboard)/sessions/page.tsx       # Pass role + userId to getSeriesCardData
  app/api/series/route.ts                 # Add role-based filtering to GET
  app/api/sessions/[id]/talking-points/   # Relax status check
  components/series/series-list.tsx        # Role-aware grouping (admin/manager/member)
  components/series/series-card.tsx        # Add Agenda button
  components/series/agenda-sheet.tsx       # NEW: Pre-meeting sheet wrapper
  lib/queries/series.ts                   # Return manager info; add scheduled session data
```

### Pattern 1: Role-Based List Filtering (Server-Side)

**What:** The sessions page Server Component passes `{ role, userId }` to `getSeriesCardData()`, which already has filter branches for member/manager/admin.

**When to use:** Initial page load (SSR).

**Current state of `getSeriesCardData`:**
- `role === "member"` + `userId` filters by `reportId`
- `role === "manager"` + `userId` filters by `managerId`
- admin sees all (no additional filter)

**Gap for manager view:** Currently filters by EITHER managerId OR reportId. Manager needs BOTH: series where they are manager AND series where they are report. This requires two queries or a single query with `OR(managerId = userId, reportId = userId)` followed by client-side separation.

**Gap for admin view:** Need manager name alongside each series for grouping. Currently `getSeriesCardData` only joins `users` for the report. Need to also fetch manager user info.

### Pattern 2: Manager Name Resolution

**What:** For admin grouping and manager view "My 1:1s" section, the manager's name must be available on each series card.

**How:** Two approaches:
1. **Extend `getSeriesCardData` return type** to include `manager: { id, firstName, lastName }` -- batch-fetch unique manager IDs similar to how `reportMap` works already.
2. **Separate query for manager names** -- simpler but less efficient.

**Recommendation:** Approach 1 -- extend `SeriesCardData` interface to include manager info. This is clean because the query already batch-fetches report users via `reportMap`; adding `managerMap` follows the same pattern.

### Pattern 3: Client-Side Grouping

**What:** `SeriesList` receives flat array + user role + user ID, then groups into sections.

**Admin grouping logic:**
```typescript
// Group by managerId, then sort: own group first, rest alphabetical by manager name
const groups = groupBy(series, s => s.managerId);
const sortedGroups = [...groups.entries()].sort(([aId, aItems], [bId, bItems]) => {
  if (aId === currentUserId) return -1;
  if (bId === currentUserId) return 1;
  const aName = aItems[0].manager.lastName;
  const bName = bItems[0].manager.lastName;
  return aName.localeCompare(bName);
});
```

**Manager grouping logic:**
```typescript
const myTeam = series.filter(s => s.managerId === currentUserId);
const myOneOnOnes = series.filter(s => s.managerId !== currentUserId);
// myOneOnOnes shows manager name in top-right of card
```

### Pattern 4: Pre-Meeting Sheet

**What:** Sheet component wrapping `TalkingPointList` instances per category, fetched by session ID.

**Data requirements:**
- Session ID (from `latestSession` on the series card when status is "scheduled")
- Session number and scheduledAt (for header display)
- Template sections/categories (to group talking points) -- fetched via session's templateId

**Recommended approach:**
- Agenda button click opens `<Sheet>` with state managed in `SeriesCard` or a new wrapper
- Sheet fetches talking points via existing GET `/api/sessions/[id]/talking-points`
- Sheet also needs template sections to show category headers -- fetch via a small API call or include in the initial series data
- Reuse `TalkingPointList` component per category section

### Anti-Patterns to Avoid
- **Fetching all series then filtering on client for access control:** The server query MUST filter -- do not send unauthorized data to the client and rely on UI hiding.
- **Duplicating TalkingPointList logic:** The existing component handles create/toggle/delete with optimistic updates. Wrap it, do not rebuild it.
- **Hard-coding category names:** Categories come from template sections. The pre-meeting sheet must fetch them dynamically.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sheet/drawer UI | Custom slide-in panel | shadcn/ui `Sheet` component | Already built, accessible, animated, dark mode compatible |
| Talking points CRUD | New mutation hooks | Existing `TalkingPointList` component | Has optimistic updates, error handling, i18n |
| Role-based query filtering | Manual SQL conditions | Existing `getSeriesCardData` options parameter | Already has role/userId/managerId branches |

## Common Pitfalls

### Pitfall 1: Manager View Missing "My 1:1s"
**What goes wrong:** Using `role === "manager"` filter in `getSeriesCardData` only returns series where user is manager, missing series where user is the report.
**Why it happens:** Current manager filter uses `eq(meetingSeries.managerId, userId)`.
**How to avoid:** For manager view, either remove the role filter and filter client-side, or use SQL `OR(managerId = userId, reportId = userId)`. Then split into two sections on the client.
**Warning signs:** Manager users see no "My 1:1s" section.

### Pitfall 2: API Series Route Not Filtered
**What goes wrong:** The `/api/series` GET route (used for TanStack Query refetch) returns all series regardless of role. After SSR shows filtered data, a client-side refetch overwrites with unfiltered data.
**Why it happens:** The API route currently has no role-based filtering -- it returns all tenant series.
**How to avoid:** Apply the same role-based filtering in the API route that `getSeriesCardData` uses. Pass the session user's role and ID.
**Warning signs:** Page initially shows correct filtered view, then "flashes" to show all series.

### Pitfall 3: Talking Points POST Returns 409 for Scheduled Sessions
**What goes wrong:** Pre-meeting talking points fail to save because POST checks `status !== "in_progress"`.
**Why it happens:** The status check on line 177 of the route explicitly rejects non-in-progress sessions.
**How to avoid:** Change the check to: `if (sessionRows[0].status !== "in_progress" && sessionRows[0].status !== "scheduled")`.
**Warning signs:** 409 "Session is not in progress" error when adding talking points from the pre-meeting sheet.

### Pitfall 4: Missing Template Sections for Category Grouping
**What goes wrong:** Pre-meeting sheet shows talking points in a flat list without category grouping.
**Why it happens:** The sheet only has `sessionId` but doesn't know the template's sections (categories).
**How to avoid:** Either: (a) include template section names in the session/series card data, or (b) make a separate API call to fetch template sections by session's templateId. Option (a) is more efficient if section names are small.
**Warning signs:** Talking points appear ungrouped or under a single "General" heading.

### Pitfall 5: SeriesCardData Missing scheduledAt for Sheet Header
**What goes wrong:** The sheet header needs the session date but `latestSession` in `SeriesCardData` only has `id`, `status`, `sessionNumber`, `sessionScore`.
**Why it happens:** `getSeriesCardData` doesn't select `scheduledAt` from the latest session query.
**How to avoid:** Add `scheduledAt` to the latest session select and include it in the return type.
**Warning signs:** Sheet header shows no date or shows "undefined".

## Code Examples

### Extending getSeriesCardData for Manager Info

```typescript
// In series.ts - add manager info resolution (same pattern as reportMap)
const managerIds = [...new Set(seriesList.map((s) => s.managerId))];
const managerUsers = await tx
  .select({
    id: users.id,
    firstName: users.firstName,
    lastName: users.lastName,
  })
  .from(users)
  .where(sql`${users.id} IN ${managerIds}`);
const managerMap = new Map(managerUsers.map((u) => [u.id, u]));

// In return: add manager field
return {
  ...existingFields,
  manager: {
    id: s.managerId,
    firstName: managerMap.get(s.managerId)?.firstName ?? "",
    lastName: managerMap.get(s.managerId)?.lastName ?? "",
  },
};
```

### Manager View OR Query

```typescript
// Replace the simple managerId filter for manager role
if (options?.role === "manager" && options?.userId) {
  conditions.push(
    sql`(${meetingSeries.managerId} = ${options.userId} OR ${meetingSeries.reportId} = ${options.userId})`
  );
}
```

### Relaxing Status Check in Talking Points POST

```typescript
// In route.ts POST handler, line ~177
if (sessionRows[0].status !== "in_progress" && sessionRows[0].status !== "scheduled") {
  return { error: "SESSION_NOT_ACTIVE" as const };
}
```

### Sheet Component Structure

```typescript
// agenda-sheet.tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TalkingPointList, type TalkingPoint } from "@/components/session/talking-point-list";

interface AgendaSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  personName: string;
  sessionNumber: number;
  sessionDate: string;
  categories: { name: string }[];
  talkingPointsByCategory: Record<string, TalkingPoint[]>;
  readOnly?: boolean;
}
```

### Agenda Button on Series Card

```typescript
// In series-card.tsx, conditionally render when latestSession.status === "scheduled"
{series.latestSession?.status === "scheduled" && (
  <Button
    variant="ghost"
    size="icon"
    className="relative z-10"
    onClick={(e) => {
      e.preventDefault();
      setAgendaOpen(true);
    }}
  >
    <ListTodo className="h-4 w-4" />
    {talkingPointCount > 0 && (
      <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 text-[10px]">
        {talkingPointCount}
      </Badge>
    )}
  </Button>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No access control on sessions page | Role-filtered queries | This phase | Members no longer see other people's series |
| Talking points only during wizard | Pre-meeting agenda preparation | This phase | Enables meeting preparation before session starts |

## Open Questions

1. **Template sections for pre-meeting sheet category headers**
   - What we know: Talking points use template section `name` as the `category` field. The pre-meeting sheet needs to show these as group headers.
   - What's unclear: Whether to fetch template sections via the session's `templateId` (extra API call) or include section names in the series card data.
   - Recommendation: Fetch template sections inside the sheet component when it opens (lazy load). The template data is small and only needed when the sheet is open. Alternatively, the GET talking-points endpoint could return grouped data with category labels.

2. **Count badge on Agenda button**
   - What we know: The user left this to Claude's discretion.
   - What's unclear: Whether to pre-fetch talking point count for each series card (extra DB query on page load) or only show the badge after the sheet has been opened once.
   - Recommendation: Include a `talkingPointCount` in the series card data via a COUNT subquery. It is a single integer per series and avoids a separate fetch. Only count points for the scheduled session.

3. **Discussed toggle in pre-meeting mode**
   - What we know: User left this to Claude's discretion. Discussing before the meeting is "unlikely but harmless."
   - Recommendation: Pass `readOnly={false}` for the discussed toggle in pre-meeting mode. Users may want to mark items as "already discussed informally." The toggle is lightweight and consistent with the wizard behavior.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.ts` |
| Quick run command | `bun run test` |
| Full suite command | `bun run test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AC-01 | Member sees only own series | unit | `bun run test -- src/lib/queries/series.test.ts -t "member filter"` | No -- Wave 0 |
| AC-02 | Manager sees own team + My 1:1s | unit | `bun run test -- src/lib/queries/series.test.ts -t "manager filter"` | No -- Wave 0 |
| AC-03 | Admin sees all grouped by manager | unit | `bun run test -- src/lib/queries/series.test.ts -t "admin grouping"` | No -- Wave 0 |
| AC-04 | API /api/series respects role filter | unit | `bun run test -- src/app/api/series/route.test.ts` | No -- Wave 0 |
| TP-01 | POST talking points allows scheduled status | unit | `bun run test -- src/app/api/sessions/talking-points.test.ts -t "scheduled"` | No -- Wave 0 |
| TP-02 | Agenda sheet renders with categories | unit | `bun run test -- src/components/series/agenda-sheet.test.tsx` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `bun run test`
- **Per wave merge:** `bun run test && bun run typecheck`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Query/API tests for role-based filtering
- [ ] Talking points route test for scheduled status acceptance
- [ ] Component test for agenda sheet (happy-dom environment)

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `src/lib/queries/series.ts` -- existing filter options and query structure
- Codebase inspection: `src/app/api/sessions/[id]/talking-points/route.ts` -- current status check on line 177
- Codebase inspection: `src/components/session/talking-point-list.tsx` -- reusable component API
- Codebase inspection: `src/components/ui/sheet.tsx` -- available Sheet component
- Codebase inspection: `src/lib/auth/rbac.ts` -- isSeriesParticipant, isAdmin, canManageSeries helpers
- Codebase inspection: `src/app/api/series/route.ts` -- current unfiltered GET handler

### Secondary (MEDIUM confidence)
- None needed -- all findings from direct codebase inspection

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in use, no new dependencies
- Architecture: HIGH - patterns directly extend existing code, gaps clearly identified
- Pitfalls: HIGH - each pitfall identified from reading the actual current code

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable -- internal feature, no external dependency changes)
