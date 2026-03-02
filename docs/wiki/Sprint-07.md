# Sprint 07 — Meeting Series & Scheduling

**Duration**: 2 weeks
**Dependencies**: Sprint 05, Sprint 06

## Goals

Implement meeting series management: create 1:1 relationships between managers and reports, configure cadence and templates, auto-generate next session dates, and manage series lifecycle.

## Deliverables

1. **Series list page**: all 1:1 relationships showing manager, report, cadence, next session, status
2. **Create series form**:
   - Manager selector (search users with manager role)
   - Report selector (search users)
   - Cadence: weekly, biweekly, monthly, custom (N days)
   - Duration in minutes (default 30)
   - Preferred day and time
   - Default template selector (from published templates)
   - First session date picker
3. **Series detail page**: series info, session history list, edit settings
4. **Series lifecycle**: active → paused → archived transitions
5. **Auto-scheduling**: compute `next_session_at` based on cadence after session completion
6. **First session creation**: creating a series automatically creates the first SESSION record with status "scheduled"
7. **API routes**: `GET/POST /api/series`, `GET/PUT /api/series/[id]`, `PUT /api/series/[id]/pause`, `PUT /api/series/[id]/archive`
8. **Quick action from people page**: "Start 1:1 Series" button on user profile

## Acceptance Criteria

- [ ] Manager/admin can create a new 1:1 series between any manager and report
- [ ] Series creation validates that the pair doesn't already have an active series (unique constraint)
- [ ] Cadence options work: weekly, biweekly, monthly, custom (validates custom days > 0)
- [ ] Default template can be selected from published templates
- [ ] Creating a series auto-creates the first session as "scheduled"
- [ ] `next_session_at` is computed correctly based on cadence and preferred day/time
- [ ] Series can be paused (no new sessions auto-created) and resumed
- [ ] Series can be archived (hidden from active lists, history preserved)
- [ ] Series list shows all active series with relevant info
- [ ] Series detail page shows full session history
- [ ] "Start 1:1 Series" button works from people profile page
- [ ] After a session completes, the next session is auto-created based on cadence

## Key Files

```
src/app/(dashboard)/series/page.tsx          # Series list
src/app/(dashboard)/series/[id]/page.tsx     # Series detail + history
src/app/api/series/route.ts
src/app/api/series/[id]/route.ts
src/app/api/series/[id]/pause/route.ts
src/app/api/series/[id]/archive/route.ts
src/lib/validations/series.ts
src/lib/utils/scheduling.ts                  # Cadence computation
```
