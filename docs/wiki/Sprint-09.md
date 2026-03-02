# Sprint 09 — Session Wizard — Context & Notes

**Duration**: 2 weeks
**Dependencies**: Sprint 08

## Goals

Complete the session wizard with the context panel (past sessions, action items, score trends), shared and private notes, talking points, and the post-session summary view.

## Deliverables

1. **Context panel** (right sidebar during wizard):
   - Past 3 sessions: score, mood, notes excerpt (collapsible cards)
   - Open action items from past sessions with overdue indicators
   - Score trend sparkline (last 6 sessions)
2. **Shared notes**:
   - Rich text editor visible on every wizard step
   - Both manager and report can edit
   - Auto-save with debounce
3. **Private notes**:
   - Separate text area with visual indicator (different background color)
   - Toggle between shared and private modes
   - Encrypted at rest (AES-256-GCM via tenant key)
   - Only visible to the author
4. **Talking points**:
   - Pre-session: both parties can add talking points
   - During session: check off as discussed
   - Display carried-over points from previous sessions
   - Add new talking points during session
5. **Post-session summary** (`/sessions/[id]/summary`):
   - All answers grouped by category
   - Shared notes
   - Action items (new + open from past)
   - Talking points (discussed + undiscussed)
   - Duration, session score
   - [Complete] and [Send Summary Email] buttons
6. **API routes**: `POST/GET /api/sessions/[id]/notes`, `POST/GET/PUT /api/sessions/[id]/talking-points`, `GET /api/sessions/[id]/context`

## Acceptance Criteria

- [ ] Context panel displays past 3 sessions with score, mood, and notes excerpt
- [ ] Context panel shows open action items with overdue warning (red) for past-due items
- [ ] Score trend sparkline renders correctly for last 6 sessions
- [ ] Context panel collapses on screens < 1200px
- [ ] Shared notes editor works — both manager and report see the same content
- [ ] Shared notes auto-save on edit
- [ ] Private notes toggle switches to a visually distinct mode (different background)
- [ ] Private notes are encrypted before storage (AES-256-GCM)
- [ ] Private notes are only visible to the author (other party sees nothing)
- [ ] Talking points can be added pre-session and during session
- [ ] Talking points can be checked off during session, recording discussed_at
- [ ] Carried-over talking points show origin indicator
- [ ] Summary page displays all session data correctly
- [ ] Summary page [Complete] button transitions session to completed
- [ ] Summary page accessible as read-only for completed sessions

## Key Files

```
src/app/(dashboard)/sessions/[id]/summary/page.tsx
src/app/api/sessions/[id]/notes/route.ts
src/app/api/sessions/[id]/talking-points/route.ts
src/app/api/sessions/[id]/context/route.ts
src/components/session/context-panel.tsx
src/components/session/notes-editor.tsx
src/components/session/session-summary.tsx
src/lib/utils/encryption.ts                      # AES-256-GCM encrypt/decrypt
```
