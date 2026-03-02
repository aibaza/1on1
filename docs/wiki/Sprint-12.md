# Sprint 12 — Session History & Search

**Duration**: 2 weeks
**Dependencies**: Sprint 09
**Parallelizable with**: Sprint 11

## Goals

Implement session history with timeline view per series, read-only session detail for completed sessions, full-text search across notes and talking points, and filtering capabilities.

## Deliverables

1. **Sessions list page** (`/sessions`):
   - All sessions: upcoming (scheduled, in_progress) and past (completed, cancelled, missed)
   - Filters: date range, status, report name
   - Sort: by date (default: upcoming first, then recent past)
2. **Timeline view per series** (`/series/[id]` sessions tab):
   - Chronological list of all sessions in a series
   - Visual indicators: completed (green), cancelled (grey), missed (red), scheduled (blue)
   - Session score shown for completed sessions
3. **Session detail (read-only)** for completed sessions:
   - All answers displayed with their question text
   - Shared notes
   - Action items created in that session
   - Talking points with discussed/undiscussed status
   - Session metadata: date, duration, score
4. **Full-text search**:
   - Search across shared notes, talking points, and answer text
   - Results link to the relevant session
   - Scoped to tenant (RLS enforced)
5. **People profile sessions tab**: show session history for a specific user
6. **API routes**: `GET /api/sessions` (list with filters), `GET /api/sessions/search?q=...`

## Acceptance Criteria

- [ ] Sessions list page shows all sessions across all series
- [ ] Filters work: date range picker, status dropdown, report name search
- [ ] Timeline view in series detail shows chronological session list
- [ ] Session status has correct visual indicators (color-coded)
- [ ] Completed session detail shows all answers, notes, action items, and talking points
- [ ] Completed session detail is read-only (no edit controls)
- [ ] Full-text search returns results matching notes and talking points
- [ ] Search results link to the correct session
- [ ] Search is scoped to the current tenant (no cross-tenant leakage)
- [ ] People profile sessions tab shows history for that specific user
- [ ] Empty states handled for series with no sessions, search with no results
- [ ] Pagination works for sessions list (10 per page default)

## Key Files

```
src/app/(dashboard)/sessions/page.tsx              # Updated with filters
src/app/(dashboard)/sessions/[id]/page.tsx         # Read-only detail for completed
src/app/(dashboard)/series/[id]/page.tsx           # Updated with timeline
src/app/(dashboard)/people/[id]/page.tsx           # Updated with sessions tab
src/app/api/sessions/route.ts                      # List with filters
src/app/api/sessions/search/route.ts               # Full-text search
```
