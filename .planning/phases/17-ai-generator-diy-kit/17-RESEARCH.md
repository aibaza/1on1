# Phase 17: AI Generator & DIY Kit - Research

**Researched:** 2026-03-07
**Domain:** AI chat interface for template generation + 1:1 meeting methodology
**Confidence:** HIGH (core stack), HIGH (existing code patterns), HIGH (methodology)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- "Generate with AI" button in template list header (Wand2 icon), RBAC: admin + manager only, same `canManageTemplates()` guard
- "Edit with AI" button in existing template builder header, opens AI editor pre-loaded with existing template
- Full-page split-screen layout: left panel = live template preview, right panel = AI chat
- New routes: `/templates/ai-editor` (new) and `/templates/[id]/ai-editor` (existing)
- No initial seed form — AI sends the first message and starts the conversation
- AI opens new sessions with: "Tell me about your team and what you want to achieve in your 1:1s"
- Existing template sessions: AI opens with summary of loaded template + "What would you like to improve?"
- When AI modifies template: (1) outputs full replacement template as a JSON block (internal protocol, never displayed), (2) explains changes in plain language in same message
- JSON parsed by app, preview re-renders — user only sees preview update + chat explanation
- AI must generate all question text, help text, and section names in company's content language (same `withLanguageInstruction()` pattern)
- New API route: `src/app/api/templates/ai-chat/route.ts` — accepts chat history + current template + user message, returns AI response + optional new template JSON
- Model: Sonnet (same tier as summary/action suggestions), non-streaming
- DIY kit: 4th tab on `/templates/schema` page ("Prompt Kit" tab)
- DIY kit single copyable block: (1) JSON schema spec (English), (2) methodology principles (content language), (3) weight system explanation (content language), (4) complete worked example template (content language)
- One "Copy" button copies entire block to clipboard
- Narrative intro: "Paste this into Claude, ChatGPT, or any AI assistant to generate a 1on1 template"
- New `spec.promptKit.*` translation keys (EN + RO), same pattern as existing spec namespace
- Save: creates/updates template in DB, stays in editor, no redirect
- Reset: clears both template preview and chat history, requires confirmation prompt
- Back: navigates without saving (standard browser back)

### Claude's Discretion
- Exact Zod schema shape for the AI output (must conform to `TemplateExport` interface)
- Chat message history format and how it's sent to the AI on follow-up turns
- Exact wording of the AI's opening message
- Layout proportions (left/right panel split ratio)
- Loading state design during AI response

### Deferred Ideas (OUT OF SCOPE)
- Streaming token-by-token AI responses
- Conversation persistence across sessions (save and resume chat history)
- Template marketplace / sharing AI-generated templates
- "Suggest improvements" button on the template builder
- Auto-translate AI-generated template to another language (TMTR-01)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AIGEN-01 | Admin or manager can open "Generate with AI" flow, describe team and goals, receive generated template draft | Existing `canManageTemplates()` RBAC, new routes + split-screen UI, AI chat API route pattern |
| AIGEN-02 | Generated template shown in preview (name, section count, question breakdown) for review before saving — can accept, edit, or discard | Template preview panel left side, live re-render on AI response, save/reset flow |
| AIGEN-03 | AI generates all question text, help text, and section names in company's content language | `withLanguageInstruction()` pattern already in service.ts, language from tenant settings |
| AIGEN-04 | AI generation uses JSON schema, core methodology principles, and weight system as context | System prompt design — schema spec + methodology principles + weight docs embedded in system prompt |
| DIY-01 | User can access and copy a "prompt kit" — JSON schema + methodology principles + worked example — formatted for external AI tools | 4th tab on schema page, SchemaActions copy pattern, single copyable block |
| DIY-02 | Prompt kit narrative and examples rendered in company's content language (JSON schema itself stays English) | `getTranslations()` server component, `spec.promptKit.*` translation keys |
</phase_requirements>

---

## Summary

Phase 17 builds an in-app AI template editor and a copyable DIY prompt kit. The AI editor is a full-page split-screen with a chat interface on the right and a live template preview on the left. Each AI turn that produces template changes outputs a JSON block (parsed by the app, never shown to users) alongside a plain-language explanation (shown in the chat). The DIY kit is a 4th tab on the existing schema docs page with a single copyable block.

The codebase already has all the infrastructure needed: `generateText + Output.object` is the established AI SDK call pattern, `withLanguageInstruction()` handles content language, `canManageTemplates()` handles RBAC, and the `TemplateExport` interface / `templateImportSchema` Zod schema define the exact JSON structure the AI must output. The template builder pages show how to structure new full-page routes in the templates section. The schema docs page shows exactly how to add a 4th tab with copy behavior.

The most distinctive technical challenge is designing the AI response shape: each turn that modifies the template must carry both a `templateJson` field (the full replacement `TemplateExport` payload) and a `chatMessage` field (plain-language prose for the chat panel). The app parses `templateJson` and silently updates the preview; it displays only `chatMessage` to the user. This is achieved by wrapping both in a single `Output.object` schema call with two fields. The system prompt is the second key challenge: it must embed the full JSON schema spec, methodology principles, and weight system so the AI acts as a dual expert — template schema enforcer and 1:1 methodology coach.

**Primary recommendation:** Use `generateText` + `Output.object` with a `{ templateJson, chatMessage }` schema for every chat turn. Pass full conversation history as the `messages` array. The AI always returns both fields; `templateJson` may be `null` for turns that don't modify the template.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ai` (Vercel AI SDK) | ^6.0.111 | `generateText` + `Output.object` for structured AI output | Already powering all AI features in this codebase |
| `@ai-sdk/anthropic` | ^3.0.54 | Anthropic model provider (`claude-sonnet-4-6`) | Already wired in `models.ts`; Sonnet is the correct tier |
| `zod` | ^4.3.6 | Schema for AI output validation | Already used for all validation; CJS alias already configured in vitest |
| `@tanstack/react-query` | (existing) | `useMutation` for chat API calls, state management | Established pattern for all API mutations in this codebase |
| `next-intl` | (existing) | `getTranslations()` / `useTranslations()` for DIY kit translations | Established i18n pattern; new `spec.promptKit.*` keys follow same namespace |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | (existing) | `Wand2` icon for "Generate with AI" button, `RotateCcw` for reset | Existing icon library |
| shadcn/ui `Tabs` | (existing) | 4th tab on schema docs page | Already used on schema page for 3-tab layout |
| shadcn/ui `ScrollArea` | (existing) | Scrollable chat history panel | Chat messages overflow container |
| shadcn/ui `Textarea` | (existing) | Chat input field | User message input |
| shadcn/ui `AlertDialog` | (existing) | Reset confirmation dialog | "Start over?" destructive confirmation |
| `navigator.clipboard.writeText` | Browser API | Copy DIY kit block | Already used in `SchemaActions.tsx` — same pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `Output.object` with `{ templateJson, chatMessage }` | Two separate fields in system prompt + manual JSON parse | `Output.object` gives type-safe validated output; manual parse adds error surface |
| Non-streaming (chosen) | `streamText` | Non-streaming avoids partial JSON parse; streaming deferred per decision |
| Full-page split-screen route | Dialog/modal | Full-page gives space for template preview; modal too cramped for dual-panel |

**Installation:** No new packages required. All dependencies already in use.

---

## Architecture Patterns

### New Files Overview
```
src/
├── app/
│   ├── (dashboard)/templates/
│   │   ├── ai-editor/
│   │   │   └── page.tsx                  # New template AI editor
│   │   └── [id]/
│   │       └── ai-editor/
│   │           └── page.tsx              # Existing template AI editor
│   └── api/templates/
│       └── ai-chat/
│           └── route.ts                  # POST: chat turn handler
├── components/templates/
│   └── ai-editor/
│       ├── ai-editor-shell.tsx           # Split-screen layout wrapper
│       ├── template-preview-panel.tsx    # Left: live read-only preview
│       ├── chat-panel.tsx                # Right: chat UI + message list
│       └── chat-input.tsx                # Textarea + send button
├── lib/ai/
│   ├── schemas/
│   │   └── template-chat.ts             # Zod schema for AI chat response
│   └── prompts/
│       └── template-editor.ts           # System prompt builder
└── messages/
    ├── en/spec.json                      # + promptKit.* keys
    └── ro/spec.json                      # + promptKit.* keys
```

### Pattern 1: AI Chat Turn Response Schema

The AI response schema is the key design decision. Every turn returns both a `templateJson` field (nullable, only present when template is modified) and a `chatMessage` field (always present, shown in chat UI).

```typescript
// Source: mirrors existing schemas in src/lib/ai/schemas/
import { z } from "zod";
import { templateImportSchema } from "@/lib/templates/import-schema";

export const templateChatResponseSchema = z.object({
  // Full replacement template when the AI modifies the template, null otherwise.
  // Must conform to TemplateExport structure validated by templateImportSchema.
  templateJson: templateImportSchema.nullable(),
  // Plain-language explanation always shown to the user in the chat panel.
  chatMessage: z.string().min(1),
});

export type TemplateChatResponse = z.infer<typeof templateChatResponseSchema>;
```

**Why reuse `templateImportSchema`:** The import schema already validates the exact `TemplateExport` shape including all field constraints (answer types, scoreWeight range, section/question structure). Reusing it for AI output validation means AI-generated templates pass exactly the same validation as imported ones — they can be saved via the same `POST /api/templates/import` logic.

### Pattern 2: Chat Turn API Route

```typescript
// Source: mirrors POST /api/templates/import pattern
// src/app/api/templates/ai-chat/route.ts

// Request body shape (validated with Zod):
// {
//   messages: Array<{ role: "user" | "assistant"; content: string }>,
//   currentTemplate: TemplateExport | null,  // current template state
//   userMessage: string,                      // latest user message
// }

// Response:
// {
//   chatMessage: string,           // shown in chat panel
//   templateJson: TemplateExport | null,  // null = no template change
// }
```

The route accepts the full message history on each turn (stateless — no server-side session storage). Client holds `messages` state and sends full history on every request.

### Pattern 3: Multi-Turn generateText Call

```typescript
// Source: extends pattern in src/lib/ai/service.ts
import { generateText, Output } from "ai";
import { models } from "./models";
import { withLanguageInstruction } from "./service"; // reuse existing helper
import { templateChatResponseSchema } from "./schemas/template-chat";
import { buildTemplateEditorSystemPrompt } from "./prompts/template-editor";

export async function generateTemplateChatTurn(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  currentTemplate: TemplateExport | null,
  language?: string
): Promise<TemplateChatResponse> {
  const systemPrompt = withLanguageInstruction(
    buildTemplateEditorSystemPrompt(currentTemplate),
    language
  );

  const { output } = await generateText({
    model: models.templateEditor,
    output: Output.object({ schema: templateChatResponseSchema }),
    system: systemPrompt,
    messages,
  });

  if (!output) {
    throw new Error("AI SDK returned null output for template chat turn");
  }

  return output;
}
```

**Key insight:** `messages` includes the full conversation history. The latest user message is appended to the array before calling. The AI sees the conversation context and the current template state (embedded in system prompt or as a user message).

### Pattern 4: System Prompt Architecture

The template editor system prompt has four sections, each serving a distinct purpose:

```typescript
// src/lib/ai/prompts/template-editor.ts
export function buildTemplateEditorSystemPrompt(
  currentTemplate: TemplateExport | null
): string {
  return [
    TEMPLATE_EDITOR_PERSONA,    // Role definition
    SCHEMA_SPEC_SECTION,        // Full JSON schema with constraints
    METHODOLOGY_SECTION,        // 1:1 meeting principles + question guidance
    WEIGHT_SYSTEM_SECTION,      // scoreWeight explanation with examples
    currentTemplate
      ? buildCurrentTemplateSection(currentTemplate)
      : EMPTY_TEMPLATE_SECTION,
    OUTPUT_FORMAT_INSTRUCTIONS, // Dual-field output format
  ].join("\n\n");
}
```

See "Code Examples" section below for the detailed system prompt content.

### Pattern 5: DIY Kit Tab

The 4th tab is a pure server component addition to the existing `schema/page.tsx`. It renders a combined text block (schema + methodology + weights + worked example) and a single copy button — reusing `SchemaActions` pattern.

```typescript
// Added to existing Tabs in src/app/(dashboard)/templates/schema/page.tsx
<TabsContent value="promptKit">
  <Card>
    <CardHeader>
      <CardTitle>{t("promptKit.title")}</CardTitle>
      <p className="text-sm text-muted-foreground">{t("promptKit.intro")}</p>
    </CardHeader>
    <CardContent>
      <div className="mb-4">
        <PromptKitActions
          content={promptKitBlock}
          copyLabel={t("promptKit.copy")}
          copiedLabel={t("promptKit.copied")}
        />
      </div>
      <pre className="rounded-lg bg-muted p-4 overflow-x-auto text-sm font-mono whitespace-pre-wrap">
        <code>{promptKitBlock}</code>
      </pre>
    </CardContent>
  </Card>
</TabsContent>
```

The `promptKitBlock` is assembled server-side from: (1) the static English JSON schema string, (2) translated methodology section, (3) translated weights section, (4) the worked example template JSON.

### Anti-Patterns to Avoid
- **Showing templateJson in the chat UI:** The JSON block is internal protocol — parse it, hide it. Users see only `chatMessage`.
- **Client-side JSON extraction with regex:** Do not parse JSON from a text response. Use `Output.object` schema enforcement.
- **Storing chat history server-side:** Keep the conversation history client-side only (React state). Stateless API route receives full history on every call.
- **Using `prompt` instead of `messages`:** For multi-turn chat, use `messages` array so the AI sees the full conversation context.
- **Redirecting after save:** User should remain in the editor to continue chatting and saving iteratively.
- **Streaming:** Non-streaming is locked in decisions. Avoids partial JSON parse complexity.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Structured AI output validation | Custom JSON.parse + manual schema check | `Output.object({ schema: templateChatResponseSchema })` | AI SDK guarantees schema compliance; already used for all AI features in this codebase |
| Template save logic | New insertion logic | Reuse `POST /api/templates/import` insert pattern (same section/question loop) | Import route already handles the atomic transaction for template + sections + questions |
| Copy-to-clipboard | Custom clipboard code | `navigator.clipboard.writeText()` | Already implemented and working in `SchemaActions.tsx` |
| RBAC check | New permission system | `canManageTemplates(role)` | Already the correct guard for template management |
| Language instruction | New language system | `withLanguageInstruction(prompt, language)` from `service.ts` | Existing function; same pattern as summary/nudges/actions |
| Zod schema for template structure | New schema definition | `templateImportSchema` from `import-schema.ts` | Already validates the complete `TemplateExport` shape |

---

## Common Pitfalls

### Pitfall 1: Partial JSON from AI Response
**What goes wrong:** With `streamText` or manual text extraction, you get partial JSON mid-stream, causing parse failures.
**Why it happens:** Token generation doesn't pause at JSON boundaries.
**How to avoid:** Use `generateText` (non-streaming) + `Output.object`. The decision to use non-streaming is correct.
**Warning signs:** If tempted to use regex to extract JSON from a text response, stop — use `Output.object` instead.

### Pitfall 2: Chat History Growing Unbounded
**What goes wrong:** Token count escalates after many turns (system prompt + schema spec + full history).
**Why it happens:** System prompt for template editor is much larger than existing AI prompts (schema spec alone is ~3KB).
**How to avoid:** Consider a rolling window for chat history (keep last N turns, drop oldest). The system prompt + schema spec is fixed cost; a 10-turn conversation with a full schema spec stays well within Claude Sonnet's 200K token context. Monitor token usage in development. As a practical ceiling: truncate chat history to the last 20 messages before sending.
**Warning signs:** Slow responses, unusually high token counts in logs.

### Pitfall 3: AI Generating UUIDs or Tenant-Specific Fields
**What goes wrong:** AI includes `id`, `tenantId`, or other internal fields in `templateJson`.
**Why it happens:** If the system prompt shows example templates with UUIDs, the AI mimics them.
**How to avoid:** The `templateImportSchema` does NOT include `id`/`tenantId` fields — they're stripped from the `TemplateExport` interface. Ensure system prompt examples also omit these fields. The Zod schema will reject them since they're not in the schema (use `.strict()` or let Zod strip unknowns with `.strip()`).
**Warning signs:** TypeScript errors when passing AI output to the import logic.

### Pitfall 4: System Prompt Language Conflict
**What goes wrong:** The JSON schema spec (always English) conflicts with the `withLanguageInstruction` directive (output in Romanian).
**Why it happens:** `withLanguageInstruction` appends "Respond entirely in [language]", which would cause the AI to translate field names like `questionText` into Romanian.
**How to avoid:** The `withLanguageInstruction` applies to content (question text, help text, section names, chat message) NOT to JSON field names. The system prompt must explicitly clarify: "JSON field names and schema structure remain in English; question text, help text, section names, and chatMessage are written in [language]." This nuance is critical and must be explicit in the system prompt.
**Warning signs:** Field names like `questionText` appearing as `textulIntrebarii` in output.

### Pitfall 5: Missing Confirmation on Reset
**What goes wrong:** User accidentally clears template + full chat history.
**Why it happens:** Reset is a destructive action that cannot be undone.
**How to avoid:** Use shadcn/ui `AlertDialog` for confirmation ("Start over? This will clear the template and conversation."). The confirmation wording is already defined in the decisions.
**Warning signs:** No confirmation dialog before clearing state.

### Pitfall 6: Save Without Template State
**What goes wrong:** User clicks "Save" but no template has been generated yet (null state).
**Why it happens:** Chat has started but AI hasn't produced a template JSON yet.
**How to avoid:** Disable the Save button when `currentTemplate === null`. Show a placeholder in the preview panel: "Your template will appear here as you chat."
**Warning signs:** 400 error from save API because `templateJson` is null/empty.

### Pitfall 7: "Edit with AI" Loading Stale Template
**What goes wrong:** AI editor loads a stale version of the template from server props while the user has unsaved changes in the manual builder.
**Why it happens:** Both routes exist simultaneously; user might navigate between them.
**How to avoid:** Server page for `[id]/ai-editor` fetches the current template from DB at request time (same pattern as `[id]/page.tsx`). This is correct — the AI editor is a new page load, not a client-side state transfer.
**Warning signs:** "Edit with AI" showing outdated question list.

---

## Code Examples

### AI System Prompt (Expert-Level Template Editor)

The system prompt is the most important artifact of this phase. It must encode dual expertise: JSON schema enforcer + 1:1 methodology coach.

```typescript
// src/lib/ai/prompts/template-editor.ts

export const TEMPLATE_EDITOR_PERSONA = `You are a 1:1 meeting template designer with dual expertise:
1. Template schema expert — you output valid JSON conforming to the 1on1 template schema
2. Meeting methodology coach — you guide managers toward templates that create psychological safety, surface real blockers, and build accountability

You are proactive: volunteer observations, flag weak questions, suggest coverage gaps. You don't wait to be asked.`;

export const SCHEMA_SPEC_SECTION = `## Template JSON Schema

Every template modification MUST output a templateJson field conforming to this schema:

\`\`\`json
{
  "schemaVersion": 1,
  "language": "<content_language_code>",
  "name": "<template name>",
  "description": "<optional description or null>",
  "sections": [
    {
      "name": "<section name>",
      "description": "<optional or null>",
      "sortOrder": 0,
      "questions": [
        {
          "questionText": "<question text>",
          "helpText": "<explanation of what a good answer looks like, or null>",
          "answerType": "text|rating_1_5|rating_1_10|yes_no|multiple_choice|mood|scale_custom",
          "answerConfig": {},
          "isRequired": true,
          "sortOrder": 0,
          "scoreWeight": 1,
          "conditionalOnQuestionSortOrder": null,
          "conditionalOperator": null,
          "conditionalValue": null
        }
      ]
    }
  ]
}
\`\`\`

Constraints:
- schemaVersion is always 1
- sections array must have at least 1 item
- sortOrder values are 0-based integers; increment sequentially within each sections/questions array
- scoreWeight: number from 0 to 10, default 1; 0 = unscored question
- answerType must be exactly one of the 7 enum values above
- answerConfig: leave as {} unless using scale_custom (which requires { min, max, minLabel, maxLabel })
- No UUID fields; no tenantId, templateId, sectionId, questionId
- All question text, help text, and section names in the company's content language`;

export const METHODOLOGY_SECTION = `## 1:1 Meeting Design Principles

### Optimal Template Structure
- 3-5 sections, 8-12 questions total — enough for depth, short enough to complete in 30 minutes
- Sections should map to distinct conversation modes: wellbeing, work, blockers, growth, feedback
- Always end with a forward-looking section (priorities, commitments, next steps)
- Never pack all questions into one section

### Question Design Rules
1. **Specificity over vagueness**: "What's the one thing blocking your progress this week?" beats "How are things going?"
2. **Open-ended for quality signal**: use \`text\` answer type for questions where nuance matters
3. **Quantified for tracking**: use \`rating_1_5\` or \`rating_1_10\` for wellbeing, satisfaction, workload — things you want to track over time
4. **Anchor rating scales**: helpText on rating questions MUST define what 1 means and what 5 (or 10) means
5. **Retrospective + prospective balance**: include both backward-looking ("what went well") and forward-looking ("what are your priorities")
6. **One idea per question**: never combine two questions into one

### Psychological Safety Design
- Start with wellbeing/personal check-in before work topics — creates safety before vulnerability is needed
- Include "Is there anything I can do differently as your manager?" — signals the manager is also accountable
- Avoid questions that feel evaluative in early sections; build to more direct feedback questions progressively
- Manager coaching question: "What would you like more of / less of from me?" — surfaces relationship issues early

### Question Coverage Checklist
A well-balanced template covers:
- [ ] Wellbeing pulse (how are you doing, work-life balance)
- [ ] Work status (what's in progress, what's going well)
- [ ] Blockers (what's in the way, what needs clearing)
- [ ] Career growth (skills, aspirations, development)
- [ ] Manager effectiveness (how can I support you better)
- [ ] Forward commitment (priorities for next period)

### Cadence Guidance
- Weekly 1:1 (30 min): 8-10 questions, lighter on career/growth (save for monthly)
- Biweekly (45-60 min): 10-14 questions, include career + retrospective
- Monthly (60+ min): fuller template, deeper career conversation, retrospective section

### Common Template Anti-Patterns to Flag
- More than 15 questions → too long, offer to trim
- All rating questions, no open text → lacks qualitative insight
- No blockers section → misses the most actionable conversation
- No forward-looking question → no accountability mechanism
- Rating scales without helpText anchors → inconsistent data, not useful for analytics`;

export const WEIGHT_SYSTEM_SECTION = `## Score Weight System

scoreWeight (0–10) controls how much each question contributes to session analytics.
- Default: 1 (equal contribution)
- 0: question is unscored (appears in session, does not affect analytics) — use for open text, icebreakers
- 2–3: higher-importance questions — blockers, overall satisfaction, key outcome ratings
- Use weight 0 for all text/mood questions unless you explicitly want them scored

Example weighting strategy:
- "Overall wellbeing (1-10)": scoreWeight 2 (high signal)
- "What's blocking you?": scoreWeight 0 (text answer, not scoreable)
- "Workload level (1-5)": scoreWeight 1 (standard)
- "Clarity on priorities (1-5)": scoreWeight 2 (key outcome metric)`;

export const OUTPUT_FORMAT_INSTRUCTIONS = `## Output Format

Every response MUST be a JSON object with exactly two fields:

\`\`\`json
{
  "templateJson": null,
  "chatMessage": "Your response to the user goes here."
}
\`\`\`

- Set templateJson to null when you are NOT modifying the template (e.g., asking a question, explaining something)
- Set templateJson to the FULL replacement template object when you ARE modifying the template
- chatMessage is ALWAYS present — this is the only text the user sees; templateJson is NEVER shown to them
- In chatMessage, explain what you changed and why; be specific about design choices
- IMPORTANT: JSON field names (templateJson, chatMessage, schemaVersion, questionText, etc.) are ALWAYS in English, even when the content language is not English`;
```

### Worked Example Template (DIY Kit)

The worked example in the DIY kit must be a real, high-quality template demonstrating best practices. This is the reference artifact that makes the DIY kit genuinely useful.

```json
{
  "schemaVersion": 1,
  "language": "en",
  "name": "Weekly Check-in",
  "description": "A balanced weekly 1:1 template covering wellbeing, work status, blockers, and forward commitments. Designed for a 30-minute meeting.",
  "sections": [
    {
      "name": "Wellbeing",
      "description": "Start with the person, not the work.",
      "sortOrder": 0,
      "questions": [
        {
          "questionText": "How are you doing this week, overall?",
          "helpText": "1 = really struggling, 5 = thriving. Rate holistically — work and outside work.",
          "answerType": "rating_1_5",
          "answerConfig": {},
          "isRequired": true,
          "sortOrder": 0,
          "scoreWeight": 2,
          "conditionalOnQuestionSortOrder": null,
          "conditionalOperator": null,
          "conditionalValue": null
        },
        {
          "questionText": "Is there anything outside work impacting your focus this week?",
          "helpText": "Optional — share only what you're comfortable with. This helps me understand how to support you.",
          "answerType": "text",
          "answerConfig": {},
          "isRequired": false,
          "sortOrder": 1,
          "scoreWeight": 0,
          "conditionalOnQuestionSortOrder": null,
          "conditionalOperator": null,
          "conditionalValue": null
        }
      ]
    },
    {
      "name": "Work Status",
      "description": "What's in progress and what's going well.",
      "sortOrder": 1,
      "questions": [
        {
          "questionText": "What's one thing you made progress on since last time?",
          "helpText": "Even a small win counts. Recognizing progress matters.",
          "answerType": "text",
          "answerConfig": {},
          "isRequired": true,
          "sortOrder": 2,
          "scoreWeight": 0,
          "conditionalOnQuestionSortOrder": null,
          "conditionalOperator": null,
          "conditionalValue": null
        },
        {
          "questionText": "How clear are you on your priorities for this week?",
          "helpText": "1 = no clarity, 5 = crystal clear. If low, we'll align now.",
          "answerType": "rating_1_5",
          "answerConfig": {},
          "isRequired": true,
          "sortOrder": 3,
          "scoreWeight": 2,
          "conditionalOnQuestionSortOrder": null,
          "conditionalOperator": null,
          "conditionalValue": null
        }
      ]
    },
    {
      "name": "Blockers",
      "description": "Surface what's getting in the way.",
      "sortOrder": 2,
      "questions": [
        {
          "questionText": "What's the one thing blocking your progress this week?",
          "helpText": "Could be a dependency, unclear requirement, technical issue, or team dynamic. Be specific.",
          "answerType": "text",
          "answerConfig": {},
          "isRequired": false,
          "sortOrder": 4,
          "scoreWeight": 0,
          "conditionalOnQuestionSortOrder": null,
          "conditionalOperator": null,
          "conditionalValue": null
        },
        {
          "questionText": "How much is your workload weighing on you right now?",
          "helpText": "1 = unsustainable, 5 = perfectly manageable. Consistently low scores signal a capacity problem.",
          "answerType": "rating_1_5",
          "answerConfig": {},
          "isRequired": true,
          "sortOrder": 5,
          "scoreWeight": 1,
          "conditionalOnQuestionSortOrder": null,
          "conditionalOperator": null,
          "conditionalValue": null
        }
      ]
    },
    {
      "name": "Manager Effectiveness",
      "description": "How can I support you better?",
      "sortOrder": 3,
      "questions": [
        {
          "questionText": "Is there anything I could do differently to better support you?",
          "helpText": "Honest feedback here makes me a better manager. No wrong answer.",
          "answerType": "text",
          "answerConfig": {},
          "isRequired": false,
          "sortOrder": 6,
          "scoreWeight": 0,
          "conditionalOnQuestionSortOrder": null,
          "conditionalOperator": null,
          "conditionalValue": null
        }
      ]
    },
    {
      "name": "Next Steps",
      "description": "Close with clarity and commitment.",
      "sortOrder": 4,
      "questions": [
        {
          "questionText": "What are your top 1–2 priorities before our next 1:1?",
          "helpText": "Be specific. These become our accountability check next time.",
          "answerType": "text",
          "answerConfig": {},
          "isRequired": true,
          "sortOrder": 7,
          "scoreWeight": 0,
          "conditionalOnQuestionSortOrder": null,
          "conditionalOperator": null,
          "conditionalValue": null
        }
      ]
    }
  ]
}
```

This example demonstrates:
- 5 sections, 8 questions (correct density for 30-minute weekly)
- Wellbeing first (psychological safety principle)
- Mix of rating (scoreable) and text (qualitative) questions
- scoreWeight 2 on high-signal questions, 0 on text questions
- helpText anchors all rating scales with clear 1/5 definitions
- Manager effectiveness section (self-accountability)
- Forward-looking closing section

---

## 1:1 Meeting Methodology: Expert Reference

This section is the research basis for the AI system prompt. The planner and executor should understand these principles to evaluate whether the system prompt is genuinely expert-level.

### Why Structured 1:1s Matter
Research across organizations shows: weekly 1:1s correlate with ~20% lower employee anxiety and ~12% higher self-reported performance. Teams with frequent, meaningful 1:1s see ~21% higher productivity. The structure prevents the most common failure mode: 1:1s becoming status updates instead of human conversations.

### The Five Conversation Modes
Every strong 1:1 template covers these five modes, either within sections or across a few sections:

1. **Wellbeing pulse** — starts psychologically safe, signals the manager sees the person first
2. **Work status / wins** — recognition and priority alignment
3. **Blockers** — the most actionable category; surface early, clear fast
4. **Manager feedback / relationship** — bidirectional; manager must also be accountable
5. **Forward commitment** — closes with clarity; becomes the accountability anchor next session

### Question Design: What Makes a Question Good
- **Specific over vague**: "What's blocking your progress this week?" vs "How are things going?"
- **One concept per question**: never compound questions (don't ask "How is work AND your team dynamic?")
- **Anchored scales**: rating questions must define what 1 and 5 (or 10) mean in helpText
- **Retrospective AND prospective**: balance what happened with what's planned
- **Progressive disclosure**: wellbeing first → work → blockers → growth → feedback; don't open with hard questions
- **Optional for sensitive topics**: mark as `isRequired: false` for personal/external impact questions

### Cadence-to-Template Mapping
| Cadence | Duration | Ideal Question Count | Key Sections |
|---------|----------|---------------------|--------------|
| Weekly | 25-30 min | 8-10 | Wellbeing, Blockers, Next Steps |
| Biweekly | 45-60 min | 10-14 | All five modes + retrospective |
| Monthly | 60+ min | 12-16 | All five + career growth + retrospective |

### Proactive AI Coaching Triggers
The AI should volunteer these observations without being asked:
- Section has >6 questions → "This section may be too long for your cadence — want me to trim it?"
- All questions are rating type → "You have no open text questions — you'll miss qualitative signal"
- No blockers section → "I notice there's no blockers section — this is often the highest-value conversation in a 1:1"
- No forward-looking question → "The template doesn't close with a commitment or priorities question — want me to add one?"
- scoreWeight is the same for all questions → "All questions have equal weight — consider raising weight on your most critical metrics"

### Psychological Safety Design Principles
(Source: Amy Edmondson's research, adapted for 1:1 template design)
- **Manager models vulnerability first**: include "What could I do differently as your manager?" — signals manager is also learning
- **Sequence matters**: low-stakes questions first, higher-vulnerability questions later in the template
- **Optional on personal topics**: never require answers about life outside work
- **Non-evaluative language**: avoid "rate your performance" — use "how clear are you on your priorities" instead

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `generateObject` (Vercel AI SDK v3) | `generateText` + `Output.object` (AI SDK v4+) | AI SDK v4.0 | `generateText` now supports structured output + message arrays in unified API |
| Manual JSON.parse from text response | `Output.object` with Zod schema | AI SDK v3.3+ | Schema-enforced output, no parse errors |
| Single-shot prompt | `messages` array for multi-turn | Established | Full conversation context preserved across turns |

**Note on AI SDK version:** This codebase uses `ai@^6.0.111`. The `generateText` + `Output.object` + `messages` pattern is confirmed working in v6. The existing service.ts already uses `Output.object` with a single `prompt` field — multi-turn just switches to `messages` array instead.

---

## Open Questions

1. **Token budget management for long chat sessions**
   - What we know: System prompt for template editor is larger than existing prompts (~3-4KB for schema + methodology). Claude Sonnet 200K context is ample.
   - What's unclear: At what conversation length should history be truncated?
   - Recommendation: Implement a rolling window of 20 messages (10 turns). Truncate oldest messages first. Add a comment explaining the reasoning.

2. **How to embed current template in context**
   - What we know: Current template needs to be visible to AI on every turn (otherwise AI can't maintain state for incremental edits).
   - What's unclear: Whether to put `currentTemplate` in the system prompt (rebuilt each turn) or as the first user message.
   - Recommendation: Include current template state in the system prompt via `buildCurrentTemplateSection(currentTemplate)` — not as a message, so it doesn't bloat the messages array. Rebuild system prompt on each call.

3. **Opening message for "Edit with AI" — how much context about the existing template**
   - What we know: Decision says "AI opens with a brief summary of the loaded template and asks 'What would you like to improve?'"
   - What's unclear: Whether this first assistant message should be generated by AI or hardcoded as a template.
   - Recommendation: Generate it via a brief AI call using the existing template as context, so the summary is accurate. Cache it as the first `assistant` message in the React state.

---

## Validation Architecture

`workflow.nyquist_validation` key is absent from `.planning/config.json`, so validation is enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (configured in `vitest.config.ts`) |
| Config file | `vitest.config.ts` — existing, no changes needed |
| Quick run command | `npx vitest run src/lib/ai/schemas/ src/lib/templates/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AIGEN-01 | `canManageTemplates()` returns true for admin/manager, false for member | unit | `npx vitest run src/lib/auth/__tests__/rbac.test.ts` | ✅ Exists |
| AIGEN-02 | `templateChatResponseSchema` validates AI response shape (templateJson nullable, chatMessage required) | unit | `npx vitest run src/lib/ai/schemas/__tests__/template-chat.test.ts` | ❌ Wave 0 |
| AIGEN-03 | `withLanguageInstruction` appends correct directive for non-English language | unit | `npx vitest run src/lib/ai/__tests__/service.test.ts` | ❌ Wave 0 |
| AIGEN-04 | `buildTemplateEditorSystemPrompt(null)` includes schema spec, methodology, and weight sections | unit | `npx vitest run src/lib/ai/prompts/__tests__/template-editor.test.ts` | ❌ Wave 0 |
| AIGEN-04 | `buildTemplateEditorSystemPrompt(template)` embeds current template JSON | unit | `npx vitest run src/lib/ai/prompts/__tests__/template-editor.test.ts` | ❌ Wave 0 |
| DIY-01 | `templateChatResponseSchema` rejects invalid answerType in templateJson | unit | `npx vitest run src/lib/ai/schemas/__tests__/template-chat.test.ts` | ❌ Wave 0 |
| DIY-01 | `templateImportSchema` accepts the worked example template (validates schema correctness) | unit | `npx vitest run src/lib/templates/__tests__/import-schema.test.ts` | ✅ Exists (extend) |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/ai/ src/lib/templates/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/ai/schemas/__tests__/template-chat.test.ts` — covers AIGEN-02, DIY-01
- [ ] `src/lib/ai/prompts/__tests__/template-editor.test.ts` — covers AIGEN-04
- [ ] `src/lib/ai/__tests__/service.test.ts` — covers AIGEN-03 (`withLanguageInstruction` function is not currently tested in isolation)

*(The existing `import-schema.test.ts` should be extended to validate the worked example template JSON — add one test case for the full DIY kit example)*

---

## Sources

### Primary (HIGH confidence)
- Codebase: `src/lib/ai/service.ts` — exact `generateText + Output.object` call pattern, `withLanguageInstruction` implementation
- Codebase: `src/lib/ai/models.ts` — model naming convention, how to add `templateEditor` entry
- Codebase: `src/lib/templates/export-schema.ts` — `TemplateExport` interface (AI output must conform)
- Codebase: `src/lib/templates/import-schema.ts` — `templateImportSchema` (reusable for AI output validation)
- Codebase: `src/app/(dashboard)/templates/schema/page.tsx` — 3-tab layout to extend with 4th tab
- Codebase: `src/app/(dashboard)/templates/schema/schema-actions.tsx` — copy-to-clipboard pattern for DIY kit
- Codebase: `messages/en/spec.json` — existing spec namespace keys to extend with `promptKit.*`
- [Vercel AI SDK `generateText` reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text) — `messages` array format, `Output.object` return values

### Secondary (MEDIUM confidence)
- [Sprad: 250+ 1:1 meeting questions](https://sprad.io/blog/250-one-on-one-meeting-questions-for-managers-by-goal-role-and-scenario) — question examples by category
- [Lighthouse: Meeting cadence](https://getlighthouse.com/blog/meeting-cadence/) — cadence-to-template structure mapping
- [Spinach: One-on-one meeting guide](https://www.spinach.ai/one-on-one-meeting-guide) — conversation flow structure
- [Anthropic structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) — confirmed Claude Sonnet structured output support

### Tertiary (LOW confidence — informational only)
- [Psych safety in 1:1s](https://psychsafety.com/psychological-safety-77-1-1-meetings/) — manager vulnerability principle
- [MeetingNotes: 1:1 cadence](https://meetingnotes.com/blog/one-on-one-meeting-cadence) — weekly/biweekly/monthly recommendations

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use; no new dependencies
- Architecture patterns: HIGH — directly extends existing AI service + template infrastructure; patterns are codebase-native
- AI output schema design: HIGH — `Output.object` with `{ templateJson, chatMessage }` is the correct approach given existing patterns
- System prompt content: HIGH — 1:1 methodology principles are well-researched and cross-verified across multiple sources
- Pitfalls: HIGH — all identified from direct codebase analysis and known AI SDK constraints
- DIY kit implementation: HIGH — direct extension of existing schema page and `SchemaActions` pattern

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (30-day window; AI SDK and methodology research are stable)
