# Phase 29: Template Versioning & Answer Remapping - Research

**Researched:** 2026-03-19
**Domain:** Template version snapshots, JSONB storage, diff computation, UI history tab
**Confidence:** HIGH

## Summary

This phase adds formal template versioning via a dedicated `template_version` table with JSONB snapshots, triggered on publish. The existing codebase already has sophisticated template editing with version-increment-on-change logic (PATCH route archives old questions and creates new ones when `isUsedInSessions && contentChanged`). The new system layers on top: each publish captures a complete snapshot, enabling version history browsing, diff viewing, and restore.

The key architectural insight is that **no answer remapping is needed** -- the user decided answers always point to their original `question_id`, and old questions stay with `isArchived=true`. The version snapshot serves as a historical record and enables showing "what the template looked like" at any point. This dramatically simplifies implementation: no FK rewriting, no migration logic.

**Primary recommendation:** Add a `template_version` table with JSONB snapshot, hook into the existing publish endpoint (PUT `/api/templates/[id]/publish`), build a History tab in the template editor, and implement restore as "load old snapshot as unpublished draft."

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Snapshot created **on publish only** -- draft edits don't create versions
- New `template_version` table (not JSONB column) -- dedicated, queryable, indexable
- Existing `aiVersionHistory` JSONB column stays for AI chat context only, not formal versioning
- Snapshot contains **full template + questions + sections** -- complete self-contained record
- Version numbers auto-increment (v1, v2, v3...) with timestamp -- no user-provided labels
- Each version row stores: version_number, template_id, snapshot JSONB, created_at, created_by
- **No remapping** -- answers always point to the original question_id they were answered for
- Old questions stay in DB with `isArchived=true` -- never deleted
- Version snapshot records what the template looked like at publish time
- Analytics track by question_id -- if a question is archived and a new one created, they're separate trend lines
- When viewing session history, show the **original question text** as it was when answered (from version snapshot)
- Scheduled/draft sessions **auto-upgrade** to latest published version -- no answers to preserve yet
- History tab accessible via a **"History" tab** in the template editor
- Each version entry shows: version number, date, author name, question count
- Clicking a version shows **read-only template preview** with a toggle to **change list summary** (diff)
- Change list format: bulleted list of additions, removals, modifications (not inline highlights or side-by-side)
- "Restore this version" button visible on each version preview
- Restoring creates a **new version from old** -- append-only history
- Restored content loads as **unpublished draft** -- user must review and explicitly publish
- **Confirmation dialog** before restore with impact summary
- Permissions: same as template edit -- `canManageTemplates()` check

### Claude's Discretion
- Version snapshot JSONB schema structure (sections, questions, answer configs)
- Change list diff computation algorithm
- History tab empty state when template has only one version
- Exact confirmation dialog wording
- Mobile responsiveness of history tab and version preview

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Drizzle ORM | 0.38.4 | Schema definition + queries for template_version table | Project ORM |
| drizzle-kit | 0.30.4 | Migration generation for new table | Project migration tool |
| Zod | 4.3.6 | Validation schemas for snapshot and restore payloads | Project validation |
| Next.js | 16.1.6 | API routes for version CRUD | Project framework |
| TanStack Query | (installed) | Client-side data fetching for version history | Project state layer |
| shadcn/ui | (installed) | UI components for History tab | Project UI library |

### Supporting (no new dependencies needed)
| Library | Already In | Purpose | When to Use |
|---------|------------|---------|-------------|
| lucide-react | yes | Icons for history, restore, diff | History tab UI |
| next-intl | yes | i18n for history tab labels | All user-facing strings |
| sonner | yes | Toast notifications on restore | Success/error feedback |

**No new packages required.** This phase uses only existing dependencies.

## Architecture Patterns

### New Table: `template_version`

```sql
CREATE TABLE template_version (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES questionnaire_template(id),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES "user"(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(template_id, version_number)
);

-- RLS policy (follows existing pattern)
ALTER TABLE template_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_version FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON template_version
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Index for version history listing
CREATE INDEX template_version_template_idx ON template_version(template_id, version_number DESC);
```

### Drizzle Schema Definition

```typescript
// src/lib/db/schema/template-versions.ts
export const templateVersions = pgTable(
  "template_version",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => questionnaireTemplates.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    versionNumber: integer("version_number").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("template_version_template_version_idx").on(
      table.templateId,
      table.versionNumber
    ),
    index("template_version_template_idx").on(
      table.templateId,
    ),
  ]
);
```

### Snapshot JSONB Schema

The snapshot must be self-contained -- no FK lookups needed to reconstruct what the template looked like.

```typescript
// Recommended JSONB structure for the snapshot field
interface TemplateVersionSnapshot {
  name: string;
  description: string | null;
  sections: Array<{
    id: string;            // Original section UUID at time of snapshot
    name: string;
    description: string | null;
    sortOrder: number;
    questions: Array<{
      id: string;          // Original question UUID at time of snapshot
      questionText: string;
      helpText: string | null;
      answerType: string;
      answerConfig: Record<string, unknown>;
      isRequired: boolean;
      sortOrder: number;
      scoreWeight: string;
      conditionalOnQuestionId: string | null;
      conditionalOperator: string | null;
      conditionalValue: string | null;
    }>;
  }>;
  labelIds: string[];      // Label UUIDs at time of snapshot
}
```

### Pattern 1: Snapshot Creation on Publish

**What:** When publish endpoint is called and template is transitioning to published, capture the current state.
**When to use:** Inside the existing `PUT /api/templates/[id]/publish` handler, AFTER setting `isPublished: true`.

```typescript
// Inside publish route, after setting isPublished = true
if (newPublishedState) {
  // Fetch current template state for snapshot
  const sections = await tx.select()...;
  const questions = await tx.select()...;
  const labels = await tx.select()...;

  // Get next version number
  const [maxVersion] = await tx
    .select({ max: sql<number>`coalesce(max(version_number), 0)` })
    .from(templateVersions)
    .where(eq(templateVersions.templateId, id));

  const nextVersion = maxVersion.max + 1;

  // Insert version snapshot
  await tx.insert(templateVersions).values({
    templateId: id,
    tenantId: session.user.tenantId,
    versionNumber: nextVersion,
    snapshot: buildSnapshot(template, sections, questions, labels),
    createdBy: session.user.id,
  });

  // Also update the template.version field to stay in sync
  await tx.update(questionnaireTemplates)
    .set({ version: nextVersion })
    .where(eq(questionnaireTemplates.id, id));
}
```

### Pattern 2: Diff Computation

**What:** Compute a human-readable change list between two version snapshots.
**When to use:** Client-side when user clicks a version to view changes from previous version.

```typescript
// src/lib/templates/version-diff.ts
interface VersionChange {
  type: "added" | "removed" | "modified";
  entity: "section" | "question";
  description: string;
}

function computeVersionDiff(
  oldSnapshot: TemplateVersionSnapshot,
  newSnapshot: TemplateVersionSnapshot
): VersionChange[] {
  const changes: VersionChange[] = [];

  // Compare sections by ID
  const oldSectionIds = new Set(oldSnapshot.sections.map(s => s.id));
  const newSectionIds = new Set(newSnapshot.sections.map(s => s.id));

  // Added sections
  for (const s of newSnapshot.sections) {
    if (!oldSectionIds.has(s.id)) {
      changes.push({ type: "added", entity: "section", description: `Section "${s.name}"` });
    }
  }
  // Removed sections
  for (const s of oldSnapshot.sections) {
    if (!newSectionIds.has(s.id)) {
      changes.push({ type: "removed", entity: "section", description: `Section "${s.name}"` });
    }
  }

  // Compare questions similarly (by ID within sections)
  // ... (same pattern for questions: added, removed, modified text/type/config)

  return changes;
}
```

**Key design decision:** Diff runs client-side. Two JSONB snapshots are small (< 50KB each). No server-side diff storage needed.

### Pattern 3: Restore as Draft

**What:** Load a version snapshot's content into the template as unpublished draft.
**When to use:** POST `/api/templates/[id]/versions/[versionNumber]/restore`

```typescript
// Restore flow:
// 1. Fetch the version snapshot
// 2. Archive all current non-archived sections/questions (same pattern as PATCH route)
// 3. Insert new sections/questions from snapshot data
// 4. Set template.isPublished = false (unpublished draft)
// 5. Do NOT create a new version entry (that happens on next publish)
// 6. Audit log the restore action
```

### Pattern 4: Session History Question Text Resolution

**What:** When displaying a completed session's answers, resolve question text from the version snapshot that was active when the session was conducted.
**When to use:** Session summary/history pages.

**Approach:** The session already has `templateId` and the answer has `questionId`. The question row (even if archived) still has its `questionText`. So the simplest approach: just JOIN to `template_question` directly -- archived questions are NOT deleted, they remain in the DB. The version snapshot is a backup/browsing mechanism, not the primary source for answer display.

**IMPORTANT:** The existing answer display already works because `session_answer.question_id` FK points to a question that still exists (just with `isArchived=true`). No change needed to session summary pages for basic display.

### Recommended File Structure

```
src/lib/db/schema/template-versions.ts    # New schema file
src/lib/db/schema/index.ts                # Add export
src/lib/templates/version-diff.ts         # Diff computation utility
src/lib/validations/template-version.ts   # Zod schemas for version API
src/app/api/templates/[id]/versions/
  route.ts                                # GET list, POST (manual snapshot if needed)
src/app/api/templates/[id]/versions/[versionNumber]/
  route.ts                                # GET single version
src/app/api/templates/[id]/versions/[versionNumber]/restore/
  route.ts                                # POST restore
src/components/templates/version-history-tab.tsx  # History tab component
src/components/templates/version-preview.tsx      # Read-only version preview
src/components/templates/version-diff-list.tsx    # Change list display
```

### Anti-Patterns to Avoid

- **Storing diffs instead of full snapshots:** Full snapshots are easier to restore and render. Storage cost is minimal (< 50KB per version JSONB). Diffs would require reconstruction and add complexity.
- **Using the PATCH route for restore:** The restore should be a dedicated endpoint. The PATCH route has complex upsert logic for interactive editing; restore is a bulk replacement from snapshot data.
- **Creating version on every save:** Versions only on publish. Draft saves are frequent and low-signal. Publishing is the meaningful checkpoint.
- **Modifying answer FKs:** The user explicitly decided NO remapping. Answers always point to their original question_id. Don't add migration/remap logic.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSONB deep equality check | Custom recursive comparator | Comparing by question/section UUIDs | UUID identity is sufficient for detecting adds/removes; text comparison for modifications |
| Date formatting in version list | Custom date formatter | `formatDistanceToNow` or `format` from date-fns (already in project via UI components) | Consistent date display |
| Confirmation dialog | Custom modal | `AlertDialog` from shadcn/ui | Already used throughout template editor for archive/delete |
| Read-only question display | New component | Existing `QuestionCard` with `isReadOnly={true}` | Already supports read-only mode |

## Common Pitfalls

### Pitfall 1: Version Number Race Condition
**What goes wrong:** Two concurrent publishes could get the same `max(version_number) + 1`.
**Why it happens:** Without a lock, the SELECT and INSERT aren't atomic.
**How to avoid:** The `UNIQUE(template_id, version_number)` constraint catches this. Use `withTenantContext` transaction (already serializable within a transaction). Additionally, use `SELECT ... FOR UPDATE` on the template row before computing next version number.
**Warning signs:** Unique constraint violation errors on publish.

### Pitfall 2: Snapshot Size Growth
**What goes wrong:** Templates with many questions produce large JSONB blobs, and hundreds of versions could accumulate.
**Why it happens:** Full snapshots are stored per version.
**How to avoid:** This is unlikely to be a real problem. A template with 50 questions and 10 sections produces ~10-20KB of JSONB. Even 100 versions = 2MB per template, which is negligible. No pagination needed for the initial implementation; the History tab can list all versions (unlikely to exceed 20-30 in practice).
**Warning signs:** Monitor if any template exceeds 50 versions.

### Pitfall 3: Restore Losing Conditional Logic References
**What goes wrong:** Restoring a snapshot with `conditionalOnQuestionId` references -- these pointed to old question UUIDs that are now archived.
**Why it happens:** When restoring, new question rows get new UUIDs. The conditional references in the snapshot point to old UUIDs.
**How to avoid:** During restore, build a mapping from old question UUIDs (in snapshot) to new question UUIDs (freshly inserted). Rewrite `conditionalOnQuestionId` references using this mapping. This is the same pattern used in the template duplicate endpoint.
**Warning signs:** Questions with broken conditional logic after restore.

### Pitfall 4: Template Version vs questionnaireTemplates.version Drift
**What goes wrong:** The `questionnaireTemplates.version` integer (incremented on content-changing saves) diverges from `template_version.version_number` (incremented on publish only).
**Why it happens:** The PATCH route increments `questionnaireTemplates.version` on every content-changing save, but `template_version` only records on publish.
**How to avoid:** Two options: (a) Treat them as separate concepts -- `questionnaireTemplates.version` is "draft version" and `template_version.version_number` is "published version". (b) **Recommended:** After this phase, only increment `questionnaireTemplates.version` on publish, and keep it in sync with `template_version.version_number`. The PATCH route should stop incrementing version on saves.
**Warning signs:** UI showing "v5" but version history only has v1, v2.

### Pitfall 5: Scheduled Sessions Auto-Upgrade
**What goes wrong:** Scheduled sessions should auto-upgrade to the latest published template version, but the upgrade logic isn't implemented.
**Why it happens:** The decision says "scheduled/draft sessions auto-upgrade to latest published version" but there's no mechanism for this currently.
**How to avoid:** On publish, update all sessions with `status='scheduled'` and `templateId=<this template>` to point to the current template (which already happens implicitly since `session.templateId` points to the template, not a version). The key insight: scheduled sessions don't have answers yet, so they'll naturally use the latest active questions when the wizard loads (it fetches non-archived questions).
**Warning signs:** None -- this actually works already due to the existing architecture where the wizard loads active questions at render time.

## Code Examples

### Snapshot Builder Function

```typescript
// src/lib/templates/snapshot.ts
import type { TransactionClient } from "@/lib/db/tenant-context";

export interface TemplateVersionSnapshot {
  name: string;
  description: string | null;
  sections: Array<{
    id: string;
    name: string;
    description: string | null;
    sortOrder: number;
    questions: Array<{
      id: string;
      questionText: string;
      helpText: string | null;
      answerType: string;
      answerConfig: Record<string, unknown>;
      isRequired: boolean;
      sortOrder: number;
      scoreWeight: string;
      conditionalOnQuestionId: string | null;
      conditionalOperator: string | null;
      conditionalValue: string | null;
    }>;
  }>;
  labelIds: string[];
}

export async function buildTemplateSnapshot(
  tx: TransactionClient,
  templateId: string,
  templateName: string,
  templateDescription: string | null,
): Promise<TemplateVersionSnapshot> {
  // Fetch non-archived sections and questions (same pattern as GET /api/templates/[id])
  const sections = await tx.select().from(templateSections)
    .where(and(
      eq(templateSections.templateId, templateId),
      eq(templateSections.isArchived, false)
    ))
    .orderBy(asc(templateSections.sortOrder));

  const questions = await tx.select().from(templateQuestions)
    .where(and(
      eq(templateQuestions.templateId, templateId),
      eq(templateQuestions.isArchived, false)
    ))
    .orderBy(asc(templateQuestions.sortOrder));

  const labels = await tx.select({ labelId: templateLabelAssignments.labelId })
    .from(templateLabelAssignments)
    .where(eq(templateLabelAssignments.templateId, templateId));

  // Group questions by section
  const questionsBySection = new Map<string, typeof questions>();
  for (const q of questions) {
    if (!questionsBySection.has(q.sectionId)) {
      questionsBySection.set(q.sectionId, []);
    }
    questionsBySection.get(q.sectionId)!.push(q);
  }

  return {
    name: templateName,
    description: templateDescription,
    sections: sections.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      sortOrder: s.sortOrder,
      questions: (questionsBySection.get(s.id) ?? []).map(q => ({
        id: q.id,
        questionText: q.questionText,
        helpText: q.helpText,
        answerType: q.answerType,
        answerConfig: q.answerConfig as Record<string, unknown>,
        isRequired: q.isRequired,
        sortOrder: q.sortOrder,
        scoreWeight: q.scoreWeight,
        conditionalOnQuestionId: q.conditionalOnQuestionId,
        conditionalOperator: q.conditionalOperator,
        conditionalValue: q.conditionalValue,
      })),
    })),
    labelIds: labels.map(l => l.labelId),
  };
}
```

### Version History API Route

```typescript
// GET /api/templates/[id]/versions
// Returns: { versions: Array<{ versionNumber, createdAt, createdBy: { name }, questionCount }> }
export async function GET(request: Request, { params }: RouteContext) {
  // Auth + RBAC (canManageTemplates)
  // withTenantContext query:
  const versions = await tx.select({
    versionNumber: templateVersions.versionNumber,
    snapshot: templateVersions.snapshot,
    createdAt: templateVersions.createdAt,
    createdByName: users.name,
  })
  .from(templateVersions)
  .innerJoin(users, eq(templateVersions.createdBy, users.id))
  .where(eq(templateVersions.templateId, id))
  .orderBy(desc(templateVersions.versionNumber));

  // Map: extract question count from snapshot without sending full snapshot
  return versions.map(v => ({
    versionNumber: v.versionNumber,
    createdAt: v.createdAt,
    createdByName: v.createdByName,
    questionCount: (v.snapshot as TemplateVersionSnapshot)
      .sections.reduce((sum, s) => sum + s.questions.length, 0),
  }));
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `aiVersionHistory` JSONB column | Dedicated `template_version` table | This phase | Queryable, indexable, proper relational model |
| Version increment on every save | Version increment on publish only | This phase | Meaningful version numbers aligned with published states |
| No history UI | History tab in template editor | This phase | Users can browse and restore previous versions |

**Note:** The existing `questionnaireTemplates.version` integer and PATCH route version increment logic should be reviewed. After this phase, consider having the PATCH route NOT increment version (it's a draft save), and only increment on publish (when the version snapshot is created).

## Open Questions

1. **Version number alignment**
   - What we know: `questionnaireTemplates.version` currently increments on content-changing saves. `template_version.version_number` will increment on publish.
   - What's unclear: Should they be the same number? Should `questionnaireTemplates.version` be deprecated in favor of `template_version`?
   - Recommendation: Keep `questionnaireTemplates.version` as the "published version" counter. Update it ONLY on publish (inside the publish endpoint). Stop incrementing it in the PATCH route. This keeps them in sync.

2. **First version bootstrap**
   - What we know: Existing templates have `version: N` but no `template_version` rows.
   - What's unclear: Should we backfill version 1 for existing templates?
   - Recommendation: No backfill. The History tab shows "No version history yet" for existing templates. The first publish after this phase creates version 1 (or version N+1 to match the existing counter). Simpler to just start fresh.

3. **History tab integration point**
   - What we know: Template editor is a single `TemplateEditor` component. The CONTEXT says add a "History tab" alongside Questions, Settings, etc.
   - What's unclear: The current editor doesn't have a tab layout -- it's a single scrollable page with sections.
   - Recommendation: Add a simple toggle/tab bar at the top of the editor (or a button in the header) that switches between "Editor" view and "History" view. Use a simple state toggle, not a router-based tab system. This keeps the component structure clean.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.ts` |
| Quick run command | `bun run test` |
| Full suite command | `bun run test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VER-01 | Snapshot created on publish | unit | `bunx vitest run src/lib/templates/snapshot.test.ts -t "build snapshot"` | No -- Wave 0 |
| VER-02 | Version number auto-increments | unit | `bunx vitest run src/app/api/templates/[id]/publish/route.test.ts -t "version increment"` | No -- Wave 0 |
| VER-03 | Version history API returns list | unit | `bunx vitest run src/app/api/templates/[id]/versions/route.test.ts` | No -- Wave 0 |
| VER-04 | Diff computation correctness | unit | `bunx vitest run src/lib/templates/version-diff.test.ts` | No -- Wave 0 |
| VER-05 | Restore creates unpublished draft | unit | `bunx vitest run src/app/api/templates/[id]/versions/[versionNumber]/restore/route.test.ts` | No -- Wave 0 |
| VER-06 | Restore remaps conditional question refs | unit | Same as VER-05 | No -- Wave 0 |
| VER-07 | History tab renders version list | unit (happy-dom) | `bunx vitest run src/components/templates/version-history-tab.test.tsx` | No -- Wave 0 |
| VER-08 | Restore confirmation dialog | unit (happy-dom) | `bunx vitest run src/components/templates/version-history-tab.test.tsx -t "confirm"` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `bun run test`
- **Per wave merge:** `bun run test && bun run typecheck && bun run lint`
- **Phase gate:** Full suite green + build passes

### Wave 0 Gaps
- [ ] `src/lib/templates/snapshot.test.ts` -- covers VER-01
- [ ] `src/lib/templates/version-diff.test.ts` -- covers VER-04
- [ ] `src/app/api/templates/[id]/versions/route.test.ts` -- covers VER-03
- [ ] `src/app/api/templates/[id]/versions/[versionNumber]/restore/route.test.ts` -- covers VER-05, VER-06

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/lib/db/schema/templates.ts` -- current template schema with version field, aiVersionHistory JSONB
- Codebase analysis: `src/app/api/templates/[id]/route.ts` -- PATCH handler with existing version increment and archive-on-change logic
- Codebase analysis: `src/app/api/templates/[id]/publish/route.ts` -- publish toggle endpoint where snapshot hook belongs
- Codebase analysis: `src/app/api/templates/[id]/ai-history/route.ts` -- existing JSONB snapshot storage pattern
- Codebase analysis: `src/lib/db/schema/answers.ts` -- session_answer FK to template_question (no remapping needed)
- Codebase analysis: `src/components/templates/template-editor.tsx` -- current editor structure, no tabs currently

### Secondary (MEDIUM confidence)
- Drizzle ORM JSONB patterns -- based on existing codebase usage of `jsonb()` columns with `.$type<>()`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all patterns exist in codebase
- Architecture: HIGH -- clear table design, straightforward JSONB storage, existing patterns to follow
- Pitfalls: HIGH -- identified from reading the actual PATCH and publish route logic
- Diff computation: MEDIUM -- simple approach recommended (UUID-based comparison), but edge cases in modified question detection may need iteration

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable domain, no external dependencies)
