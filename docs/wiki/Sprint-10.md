# Sprint 10 — Action Items

**Duration**: 2 weeks
**Dependencies**: Sprint 09

## Goals

Implement the full action item system: inline creation during sessions, status tracking workflow, assignment, due dates, dedicated list view across all series, and carry-over flagging in the context panel.

## Deliverables

1. **Inline action item creation** during session wizard:
   - [+ Action Item] button opens quick form without leaving wizard
   - Fields: title, description (optional), assignee (manager or report), due date (optional)
   - Created item appears immediately in context panel
2. **Action item status workflow**: open → in_progress → completed / cancelled
   - Status change buttons on each action item
   - `completed_at` recorded on completion
3. **Action item list page** (`/action-items` or section in dashboard):
   - All open action items across all series
   - Filter by: assignee, status, due date, series
   - Sort by: due date, created date, status
   - Overdue highlighting
4. **Action items in context panel**: open items from current and past sessions, overdue indicators
5. **Carry-over flagging**: unfinished items from past sessions flagged with origin session indicator in current session's context
6. **API routes**: `POST /api/sessions/[id]/action-items`, `GET /api/action-items` (list), `PUT /api/action-items/[id]` (update status)
7. **Zod schemas**: action item creation, status update

## Acceptance Criteria

- [ ] Manager can create action items inline during a session
- [ ] Action item form validates: title required, assignee required
- [ ] Newly created action items appear in the context panel immediately
- [ ] Action items can transition: open → in_progress → completed / cancelled
- [ ] Completing an action item records completed_at timestamp
- [ ] Action item list page shows all items across all series with filters
- [ ] Overdue items highlighted (items past due_date that aren't completed/cancelled)
- [ ] Filter by assignee, status, and date range works
- [ ] Context panel shows open items from current and past sessions
- [ ] Carried-over items show "from Session #N" indicator
- [ ] Both manager and report can view action items from their shared sessions
- [ ] Action items respect tenant isolation (cannot see other tenants' items)

## Key Files

```
src/app/(dashboard)/sessions/[id]/page.tsx       # Updated wizard with action items
src/app/api/sessions/[id]/action-items/route.ts  # Create action items
src/app/api/action-items/route.ts                # List action items
src/app/api/action-items/[id]/route.ts           # Update status
src/components/session/action-item-form.tsx       # Inline creation form
src/components/session/context-panel.tsx          # Updated with action items
src/lib/validations/action-item.ts
```
