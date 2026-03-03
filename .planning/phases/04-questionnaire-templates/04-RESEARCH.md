# Phase 4: Questionnaire Templates - Research

**Researched:** 2026-03-03
**Domain:** Template CRUD, question type system, versioning, drag-and-drop reordering, conditional logic
**Confidence:** HIGH

## Summary

Phase 4 builds the questionnaire template builder -- the foundational data structure that drives the entire 1:1 session experience. The DB schema already exists (tables `questionnaire_template` and `template_question` with all enums, RLS policies, relations, and seed data), so this phase is primarily about building the UI and API layer on top of the existing schema, with one schema migration needed (adding `is_archived` to the template table for TMPL-08).

The core technical challenges are: (1) a form builder UI with 6 answer types each requiring different configuration, (2) drag-and-drop reordering compatible with React 19, (3) a versioning strategy that preserves historical data integrity, and (4) conditional logic configuration with 6 operators. All patterns follow the established codebase conventions: API routes with Zod validation, withTenantContext for all DB access, Server Components for reads, Client Components with TanStack Query for interactivity.

**Primary recommendation:** Use `@dnd-kit/core` + `@dnd-kit/sortable` (v6.3.1/v10.0.0) for drag-and-drop -- battle-tested, React 19 compatible via peer deps, and the most widely documented approach. Build the template editor as a single Client Component page (`/templates/[id]` and `/templates/new`) with inline question editing, following the UX wireframes in `docs/ux-flows.md`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TMPL-01 | Admin or manager can create questionnaire templates with a name and description | Existing schema supports name/description. Need API route POST /api/templates + create form. Follow team API pattern. |
| TMPL-02 | Templates support 6 question types: free text, rating 1-5, rating 1-10, yes/no, multiple choice, mood (5-point emoji) | All 6 types defined in `answerTypeEnum`. `answer_config` JSONB stores per-type config. Zod discriminated union validates each type. |
| TMPL-03 | Each question can be configured as required/optional with help text | `is_required` and `help_text` columns exist on `template_question`. Standard form fields. |
| TMPL-04 | Questions can be tagged with categories (wellbeing, engagement, performance, career, etc.) | `questionCategoryEnum` has 9 values. Category select dropdown on question form. |
| TMPL-05 | Templates are versioned -- edits create new versions; past sessions retain original answers | `version` column on template, `is_archived` on questions. Strategy: increment version, archive old questions, insert new ones. Never delete. |
| TMPL-06 | Admin can mark one template as the organization default | `is_default` boolean on template. API ensures only one default per tenant (unset others in same transaction). |
| TMPL-07 | User can duplicate an existing template | API endpoint that deep-copies template + questions with new IDs. Straightforward DB operation. |
| TMPL-08 | User can archive a template (hide from active use, preserve history) | REQUIRES SCHEMA MIGRATION: add `is_archived` column to `questionnaire_template` table. Currently missing. |
| TMPL-09 | User can reorder questions within a template via drag-and-drop | `sort_order` column exists. Use @dnd-kit/core + @dnd-kit/sortable for DnD. API PATCH to update sort orders. |
| TMPL-10 | User can configure conditional logic -- show/hide questions based on previous answers (operators: eq, neq, lt, gt, lte, gte) | `conditional_on_question_id`, `conditional_operator`, `conditional_value` columns exist. UI needs conditional config panel per question. |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| Next.js | 16.1.6 | App Router, API routes, Server Components | Installed |
| React | 19.2.3 | UI framework | Installed |
| Drizzle ORM | 0.38.4 | Type-safe DB queries | Installed |
| Zod | 4.3.6 | Validation schemas | Installed |
| React Hook Form | 7.71.2 | Form state management | Installed |
| @hookform/resolvers | 5.2.2 | Zod resolver for RHF | Installed |
| TanStack Query | 5.90.21 | Server state, mutations | Installed |
| TanStack Table | 8.21.3 | Data table (template list) | Installed |
| shadcn/ui | latest | UI components (dialog, form, select, etc.) | Installed |
| Lucide React | 0.576.0 | Icons | Installed |

### New Dependencies Required
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/core | ^6.3.1 | Drag-and-drop primitives | React 19 compatible (peer: >=16.8.0), 12KB gzipped, most documented DnD toolkit |
| @dnd-kit/sortable | ^10.0.0 | Sortable list preset | Built on @dnd-kit/core, provides useSortable hook and SortableContext |
| @dnd-kit/utilities | ^3.2.2 | CSS transform utilities | Required by sortable for CSS transforms |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit/core + sortable | @dnd-kit/react (v0.3.2) | Newer API, supports React 18/19 explicitly, but still pre-1.0. Less documentation, fewer community examples. Safer to use battle-tested v6/v10. |
| @dnd-kit/core + sortable | @hello-pangea/dnd | BLOCKED: peer dep requires React ^18.0.0, does not support React 19.2.3. |
| @dnd-kit/core + sortable | react-dnd | Older, heavier, HTML5 backend limitations. @dnd-kit is the modern replacement. |

**Installation:**
```bash
bun add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### shadcn/ui Components Needed (may need to add)
Components already available: button, card, checkbox, command, dialog, dropdown-menu, form, input, label, popover, radio-group, select, separator, sheet, skeleton, sonner, table, tabs, textarea, tooltip.

Components that may need adding:
- `switch` -- for required/optional toggle
- `accordion` -- for expandable question cards (optional, cards work too)
- `alert-dialog` -- for destructive confirmations (archive, delete question)
- `scroll-area` -- for long question lists

## Architecture Patterns

### Recommended File Structure
```
src/
  app/
    (dashboard)/
      templates/
        page.tsx                    # Template list (Server Component)
        new/
          page.tsx                  # Create template (thin wrapper)
        [id]/
          page.tsx                  # Edit template (Server Component loads data)
          template-editor.tsx       # Client Component: full editor
    api/
      templates/
        route.ts                   # GET list, POST create
        [id]/
          route.ts                 # GET single, PATCH update, DELETE (archive)
          duplicate/
            route.ts               # POST duplicate
          default/
            route.ts               # PUT set-as-default
          publish/
            route.ts               # PUT publish/unpublish
          questions/
            route.ts               # POST add question
            reorder/
              route.ts             # PATCH reorder questions
            [questionId]/
              route.ts             # PATCH update, DELETE (archive) question
  components/
    templates/
      template-list.tsx            # Client: template card grid with filters
      template-editor.tsx          # Client: main editor with question list
      question-card.tsx            # Client: single question display/edit
      question-form.tsx            # Client: question config form (dialog or inline)
      answer-type-picker.tsx       # Client: select answer type with previews
      answer-config-form.tsx       # Client: per-type config (labels, options, etc.)
      conditional-logic-form.tsx   # Client: configure show/hide conditions
      template-preview.tsx         # Client: preview how template looks in wizard
  lib/
    validations/
      template.ts                  # Zod schemas for template + question CRUD
```

### Pattern 1: Template List Page (Server Component + Client Grid)
**What:** Server Component fetches templates, passes to Client Component for filtering/actions
**When to use:** Template list page at `/templates`
**Example:**
```typescript
// src/app/(dashboard)/templates/page.tsx
// Follows exact pattern from teams/page.tsx
export default async function TemplatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const data = await withTenantContext(
    session.user.tenantId,
    session.user.id,
    async (tx) => {
      return await tx
        .select({
          id: questionnaireTemplates.id,
          name: questionnaireTemplates.name,
          description: questionnaireTemplates.description,
          category: questionnaireTemplates.category,
          isDefault: questionnaireTemplates.isDefault,
          isPublished: questionnaireTemplates.isPublished,
          version: questionnaireTemplates.version,
          isArchived: questionnaireTemplates.isArchived, // after migration
          createdAt: questionnaireTemplates.createdAt,
          questionCount: sql<number>`cast(count(${templateQuestions.id}) as int)`,
        })
        .from(questionnaireTemplates)
        .leftJoin(templateQuestions, and(
          eq(templateQuestions.templateId, questionnaireTemplates.id),
          eq(templateQuestions.isArchived, false)
        ))
        .groupBy(questionnaireTemplates.id)
        .orderBy(questionnaireTemplates.name);
    }
  );

  return <TemplateList templates={data} userRole={session.user.role} />;
}
```

### Pattern 2: Template Editor (Full Client Component)
**What:** Client Component that loads template data and manages question CRUD, reordering, and conditional logic
**When to use:** `/templates/new` and `/templates/[id]`
**Example:**
```typescript
// Key state shape for template editor
interface TemplateEditorState {
  template: {
    name: string;
    description: string;
    category: TemplateCategoryType;
  };
  questions: QuestionWithConfig[];
  isDirty: boolean;
}

// Use React Hook Form for template metadata
// Use local state + TanStack Query mutations for questions
// DnD-kit sortable for question reordering
```

### Pattern 3: API Route with Zod Validation
**What:** Follow the exact pattern from teams/route.ts
**When to use:** All template and question API routes
**Example:**
```typescript
// POST /api/templates
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (!canManageTemplates(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const data = createTemplateSchema.parse(body);

  const result = await withTenantContext(
    session.user.tenantId,
    session.user.id,
    async (tx) => {
      const [template] = await tx.insert(questionnaireTemplates).values({
        tenantId: session.user.tenantId,
        name: data.name,
        description: data.description,
        category: data.category,
        createdBy: session.user.id,
      }).returning();

      await logAuditEvent(tx, { /* ... */ });
      return template;
    }
  );

  return NextResponse.json(result, { status: 201 });
}
```

### Pattern 4: Versioning on Save
**What:** When editing a published template, increment version, archive old questions, insert new
**When to use:** PATCH /api/templates/[id] when template has been used in sessions
**Example:**
```typescript
// Versioning strategy:
// 1. Check if template has been used in any session
// 2. If yes: increment version, mark changed questions as is_archived=true, insert new versions
// 3. If no: update in place (no versioning needed for unused templates)
// 4. Never delete template_question rows -- only archive them
```

### Pattern 5: DnD Sortable Reordering
**What:** @dnd-kit sortable for question list reordering
**When to use:** Question list in template editor
**Example:**
```typescript
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

function SortableQuestion({ question }: { question: Question }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: question.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style}>
      <div {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4 cursor-grab" />
      </div>
      {/* Question content */}
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Deleting questions on edit:** NEVER delete template_question rows. Archive them (is_archived=true). Sessions reference question IDs -- deleting breaks historical data.
- **Multiple default templates:** The is_default=true flag must be unique per tenant. Always unset other defaults in the same transaction.
- **Client-side template versioning:** Version management MUST happen server-side in the API. Client just sends the edit; server decides whether to version.
- **Bypassing tenant context:** Every DB operation goes through withTenantContext. No exceptions.
- **Optimistic question reordering without server confirmation:** Reorder should optimistically update the UI but always confirm with server. If server fails, revert.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop | Custom mouse event handlers | @dnd-kit/core + sortable | Keyboard accessibility, screen reader support, touch devices, animation, all handled |
| Form validation | Manual validation logic | Zod schemas + React Hook Form | Shared client/server validation, type inference, error messages |
| Sortable persistence | Custom sort algorithm | Database sort_order column + batch update | Simple integer column, update all sort_orders in one API call |
| Unique default constraint | Application-level checks | Single transaction: unset all + set one | Race condition-safe, atomic |

**Key insight:** The schema already handles the hard data modeling problems (answer_config JSONB, conditional logic columns, versioning column). The phase is about building a good UI on top of it.

## Common Pitfalls

### Pitfall 1: Forgetting to Handle is_archived in Queries
**What goes wrong:** Fetching all questions without filtering `is_archived=false` shows deleted/old-version questions in the editor
**Why it happens:** The questions table accumulates archived questions over time from versioning
**How to avoid:** ALWAYS filter `where is_archived = false` when loading questions for editing. Only omit the filter when loading historical session data.
**Warning signs:** Question count increases after editing; old questions reappear

### Pitfall 2: Race Condition on Default Template
**What goes wrong:** Two admins set different templates as default simultaneously, ending up with two defaults
**Why it happens:** Read-then-write pattern without proper locking
**How to avoid:** In a single transaction: `UPDATE SET is_default=false WHERE tenant_id=? AND is_default=true`, then `UPDATE SET is_default=true WHERE id=?`
**Warning signs:** Multiple templates showing "Default" badge

### Pitfall 3: DnD Sort Order Gaps
**What goes wrong:** After many reorders, sort_order values become non-contiguous (1, 5, 23, 100) causing unexpected insertion behavior
**Why it happens:** Only updating the dragged item's sort_order instead of normalizing all
**How to avoid:** On reorder, send the full ordered array of question IDs. Server assigns contiguous sort_order values (1, 2, 3, ...).
**Warning signs:** New questions inserted at unexpected positions

### Pitfall 4: Conditional Logic Circular References
**What goes wrong:** Question A depends on Question B which depends on Question A
**Why it happens:** No validation preventing circular dependencies
**How to avoid:** Validate on the server that `conditional_on_question_id` points to a question with a lower `sort_order` (conditions can only reference earlier questions). Prevents cycles by construction.
**Warning signs:** Infinite loops in the session wizard, questions that never show

### Pitfall 5: Multiple Choice Requires Minimum Options
**What goes wrong:** A multiple_choice question saved with 0 or 1 options
**Why it happens:** Validation gap in the answer_config schema
**How to avoid:** Zod schema for multiple_choice answer_config requires `options: z.array(z.string()).min(2)`
**Warning signs:** Broken rendering in the session wizard for multiple_choice questions

### Pitfall 6: Template Duplication Doesn't Deep Copy Correctly
**What goes wrong:** Duplicated template shares question IDs with the original; editing one affects the other
**Why it happens:** Shallow copy instead of generating new UUIDs for all questions
**How to avoid:** Duplication must: (1) create new template with new UUID, (2) copy all non-archived questions with new UUIDs and the new template_id, (3) remap conditional_on_question_id references to the new question UUIDs
**Warning signs:** Editing duplicated template modifies original

## Code Examples

### Zod Validation Schemas
```typescript
// src/lib/validations/template.ts
import { z } from "zod";

// Template categories (mirrors DB enum)
const templateCategories = ["check_in", "career", "performance", "onboarding", "custom"] as const;
const questionCategories = ["check_in", "wellbeing", "engagement", "performance", "career", "feedback", "recognition", "goals", "custom"] as const;
const answerTypes = ["text", "rating_1_5", "rating_1_10", "yes_no", "multiple_choice", "mood"] as const;
const conditionalOperators = ["eq", "neq", "lt", "gt", "lte", "gte"] as const;

// Answer config schemas per type
const textConfigSchema = z.object({}).strict();

const rating15ConfigSchema = z.object({
  labels: z.record(z.string()).optional(), // { "1": "Very Poor", "5": "Excellent" }
}).strict();

const rating110ConfigSchema = z.object({
  labels: z.record(z.string()).optional(),
}).strict();

const yesNoConfigSchema = z.object({}).strict();

const multipleChoiceConfigSchema = z.object({
  options: z.array(z.string().min(1)).min(2, "At least 2 options required").max(20),
  allow_multiple: z.boolean().optional().default(false),
}).strict();

const moodConfigSchema = z.object({
  scale: z.array(z.string()).length(5).optional(), // defaults to standard emoji set
}).strict();

// Discriminated answer config
const answerConfigSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), config: textConfigSchema }),
  z.object({ type: z.literal("rating_1_5"), config: rating15ConfigSchema }),
  z.object({ type: z.literal("rating_1_10"), config: rating110ConfigSchema }),
  z.object({ type: z.literal("yes_no"), config: yesNoConfigSchema }),
  z.object({ type: z.literal("multiple_choice"), config: multipleChoiceConfigSchema }),
  z.object({ type: z.literal("mood"), config: moodConfigSchema }),
]);

// Create template
export const createTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required").max(255),
  description: z.string().max(2000).optional(),
  category: z.enum(templateCategories),
});

// Update template metadata
export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  category: z.enum(templateCategories).optional(),
});

// Create/update question
export const questionSchema = z.object({
  questionText: z.string().min(1, "Question text is required").max(1000),
  helpText: z.string().max(500).nullable().optional(),
  category: z.enum(questionCategories),
  answerType: z.enum(answerTypes),
  answerConfig: z.record(z.unknown()).default({}), // validated per-type in API
  isRequired: z.boolean().default(false),
  sortOrder: z.number().int().min(0),
  conditionalOnQuestionId: z.string().uuid().nullable().optional(),
  conditionalOperator: z.enum(conditionalOperators).nullable().optional(),
  conditionalValue: z.string().max(255).nullable().optional(),
});

// Reorder questions (array of question IDs in desired order)
export const reorderQuestionsSchema = z.object({
  questionIds: z.array(z.string().uuid()).min(1),
});

// Batch save: template metadata + all questions in one call
export const saveTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).nullable().optional(),
  category: z.enum(templateCategories),
  questions: z.array(questionSchema).min(1, "Template must have at least 1 question"),
});
```

### RBAC Helper
```typescript
// Add to src/lib/auth/rbac.ts
export function canManageTemplates(role: string): boolean {
  return role === "admin" || role === "manager";
}
```

### DnD Sortable List Pattern
```typescript
// Minimal sortable question list with @dnd-kit
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

function QuestionList({ questions, onReorder }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = questions.findIndex(q => q.id === active.id);
      const newIndex = questions.findIndex(q => q.id === over.id);
      const newOrder = arrayMove(questions, oldIndex, newIndex);
      onReorder(newOrder);
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
      <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
        {questions.map(q => <SortableQuestionCard key={q.id} question={q} />)}
      </SortableContext>
    </DndContext>
  );
}
```

### Versioning Logic
```typescript
// Server-side versioning in PATCH /api/templates/[id]
async function updateTemplateWithVersioning(tx, templateId, tenantId, updates) {
  // Check if this template has been used in any session
  const [usage] = await tx
    .select({ count: sql<number>`count(*)` })
    .from(sessions)
    .where(eq(sessions.templateId, templateId));

  const hasBeenUsed = usage.count > 0;

  if (hasBeenUsed && updates.questions) {
    // Increment version
    await tx.update(questionnaireTemplates)
      .set({ version: sql`version + 1`, updatedAt: new Date() })
      .where(eq(questionnaireTemplates.id, templateId));

    // Archive all current questions
    await tx.update(templateQuestions)
      .set({ isArchived: true })
      .where(and(
        eq(templateQuestions.templateId, templateId),
        eq(templateQuestions.isArchived, false),
      ));

    // Insert new versions of questions
    for (const q of updates.questions) {
      await tx.insert(templateQuestions).values({
        templateId,
        questionText: q.questionText,
        helpText: q.helpText,
        category: q.category,
        answerType: q.answerType,
        answerConfig: q.answerConfig,
        isRequired: q.isRequired,
        sortOrder: q.sortOrder,
        conditionalOnQuestionId: q.conditionalOnQuestionId,
        conditionalOperator: q.conditionalOperator,
        conditionalValue: q.conditionalValue,
      });
    }
  } else {
    // No sessions use this template -- update in place
    // ... standard update logic
  }
}
```

### Conditional Logic Validation
```typescript
// Validate conditional logic references
function validateConditionalLogic(questions: QuestionInput[]): string | null {
  for (const q of questions) {
    if (q.conditionalOnQuestionId) {
      const target = questions.find(t => t.id === q.conditionalOnQuestionId);
      if (!target) return `Question references non-existent condition target`;

      const targetIndex = questions.indexOf(target);
      const currentIndex = questions.indexOf(q);
      if (targetIndex >= currentIndex) {
        return `Conditional logic can only reference earlier questions`;
      }

      // Validate operator makes sense for the target answer type
      if (target.answerType === 'text' && ['lt', 'gt', 'lte', 'gte'].includes(q.conditionalOperator!)) {
        return `Cannot use numeric operators on text questions`;
      }

      if (!q.conditionalOperator || !q.conditionalValue) {
        return `Conditional logic requires both operator and value`;
      }
    }
  }
  return null; // valid
}
```

## Schema Migration Required

### Add is_archived to questionnaire_template

The current `questionnaire_template` table is MISSING an `is_archived` column, which is required for TMPL-08 (archive template). The `template_question` table already has this column.

**Migration needed:**
```sql
ALTER TABLE questionnaire_template ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false;
```

**Drizzle schema change:**
```typescript
// Add to questionnaireTemplates in src/lib/db/schema/templates.ts
isArchived: boolean("is_archived").notNull().default(false),
```

This must be done as the first task in this phase, then run `drizzle-kit generate` and apply the migration.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | @dnd-kit/core + sortable | 2023+ (rbd deprecated) | Must use @dnd-kit; rbd forks don't support React 19 |
| @dnd-kit/react v0.x | @dnd-kit/core v6 + sortable v10 | Both active | New API is pre-1.0; use stable v6/v10 for production |
| Zod v3 | Zod v4 | 2025 | Project uses Zod 4.3.6; API is similar but some changes to discriminatedUnion and z.infer |

**Deprecated/outdated:**
- `react-beautiful-dnd`: Deprecated by Atlassian in 2023. Fork `@hello-pangea/dnd` does NOT support React 19.
- `react-sortable-hoc`: Deprecated. Use @dnd-kit instead.
- `@dnd-kit/react` v0.x: Not deprecated but pre-1.0. Use stable packages instead.

## Existing Infrastructure Summary

### What Already Exists (DO NOT rebuild)
- DB schema: `questionnaire_template` and `template_question` tables with all columns
- DB enums: `templateCategoryEnum`, `questionCategoryEnum`, `answerTypeEnum`, `conditionalOperatorEnum`
- DB relations: defined in templates.ts with relations()
- RLS policies: tenant isolation on both tables (template allows tenant_id IS NULL for system templates, question checks via subquery JOIN)
- Seed data: 3 templates (Weekly Check-in, Career Development, Simple Check-in) with 10 questions across 2 tenants
- Meeting series seed data: already references templates via `defaultTemplateId`

### What Needs to Be Built
- Schema migration: add `is_archived` to `questionnaire_template`
- Validation schemas: `src/lib/validations/template.ts`
- RBAC helper: `canManageTemplates()` in `src/lib/auth/rbac.ts`
- API routes: `/api/templates/` with full CRUD + reorder + duplicate + default + publish
- UI pages: `/templates` list, `/templates/new`, `/templates/[id]` editor
- UI components: template-list, template-editor, question-card, question-form, answer-type-picker, answer-config-form, conditional-logic-form
- Sidebar update: add "Templates" nav item
- Seed data update: expand with conditional logic examples

## Open Questions

1. **Batch save vs incremental save for questions**
   - What we know: The UX shows a Save Draft / Publish flow suggesting batch save
   - What's unclear: Should individual question adds/edits be saved immediately (auto-save) or only on explicit Save?
   - Recommendation: Use batch save pattern -- send entire template + questions array on Save. Simpler API, avoids partial states. The template editor holds local state until the user clicks Save.

2. **Template preview in wizard format**
   - What we know: docs/questionnaires.md mentions "Template preview mode" showing template as it would appear in session wizard
   - What's unclear: Phase 5 builds the session wizard. Should Phase 4 build a preview that matches a wizard that doesn't exist yet?
   - Recommendation: Build a simple question-by-question preview (read-only rendering of each question type) in Phase 4. The full wizard-style preview can be enhanced in Phase 5 when the wizard is built.

3. **System templates (tenant_id = NULL)**
   - What we know: The schema supports system templates, and docs describe them as read-only, clonable
   - What's unclear: MISC-06 (system template library) is deferred to v2. Should Phase 4 handle system template display at all?
   - Recommendation: Skip system templates in Phase 4. The RLS policy already allows viewing them. Future phase can add a "System Templates" section to the list. Focus on tenant templates only.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/lib/db/schema/templates.ts` -- complete schema with all columns
- Existing codebase: `src/lib/db/schema/enums.ts` -- all enum definitions
- Existing codebase: `src/lib/db/migrations/0001_rls_policies.sql` -- RLS policies for templates
- Existing codebase: `src/lib/db/seed.ts` -- template seed data with questions
- Existing codebase: `src/app/api/teams/route.ts` -- API route pattern to follow
- Existing codebase: `src/lib/validations/team.ts` -- Zod validation pattern to follow
- `docs/data-model.md` -- table definitions for questionnaire_template and template_question
- `docs/questionnaires.md` -- answer types, configs, scoring logic, template system
- `docs/ux-flows.md` -- template builder wireframes and UX guidelines
- `docs/architecture.md` -- planned project structure with templates/ routes and components
- npm registry: @dnd-kit/core v6.3.1 peer deps: react >=16.8.0 (React 19 compatible)
- npm registry: @dnd-kit/sortable v10.0.0 peer deps: react >=16.8.0 (React 19 compatible)

### Secondary (MEDIUM confidence)
- npm registry: @hello-pangea/dnd peer deps: react ^18.0.0 (NOT React 19 compatible)
- npm registry: @dnd-kit/react v0.3.2 peer deps: react ^18.0.0 || ^19.0.0 (compatible but pre-1.0)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all dependencies verified via npm registry, existing codebase patterns well-established
- Architecture: HIGH - follows exact patterns already in codebase (teams, users APIs), docs provide detailed wireframes
- Pitfalls: HIGH - schema analysis revealed the is_archived gap, conditional logic edge cases are well-understood
- DnD library choice: HIGH - peer deps verified, React 19 compatibility confirmed via npm info

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable domain, unlikely to change)
