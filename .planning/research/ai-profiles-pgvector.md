# AI Personal Profiles with pgvector Embeddings

**Domain:** AI-augmented employee profiling via vector embeddings in a 1:1 meeting platform
**Researched:** 2026-03-21
**Overall Confidence:** MEDIUM-HIGH

---

## Executive Summary

Building persistent AI personal profiles from accumulated 1:1 session data is architecturally feasible with pgvector on Neon PostgreSQL, using OpenAI's `text-embedding-3-small` model via the Vercel AI SDK. The recommended approach is an **append-only chunk embedding strategy** -- embed meaningful text chunks (AI summaries, category-level rollups, notable answers) after each session, then retrieve relevant chunks via similarity search when constructing prompts. This avoids the lossy "single evolving vector" anti-pattern and provides temporal awareness, context-rich retrieval, and natural profile evolution.

The core insight: **a "profile" is not a single embedding -- it is a collection of dated embeddings that can be queried contextually.** When the AI needs to understand "How has this person's engagement changed over time?", it retrieves the most relevant chunks via cosine similarity, not a pre-computed aggregate. This is fundamentally a RAG (Retrieval-Augmented Generation) pattern applied to longitudinal employee data.

At the project's scale (hundreds of users, thousands of sessions), pgvector on Neon handles this trivially. Storage costs are negligible (< 100 MB for 10K chunks), embedding generation costs are under $1/month, and query latency is sub-10ms with HNSW indexes. The main engineering cost is building the embedding pipeline and integrating retrieval into the existing AI context system.

---

## 1. pgvector on Neon PostgreSQL

### Current State (HIGH confidence)

| Aspect | Detail |
|--------|--------|
| **Extension** | pgvector (enable via `CREATE EXTENSION vector`) |
| **Neon version** | pgvector 0.7.x+ (check Neon extensions page for latest) |
| **Max dimensions (vector)** | 2,000 |
| **Max dimensions (halfvec)** | 4,000 |
| **Index types** | HNSW (recommended), IVFFlat |
| **Distance functions** | L2, cosine, inner product, L1, Hamming, Jaccard |

### HNSW vs IVFFlat

**Use HNSW.** It has better speed-recall tradeoff, can be created on empty tables (no training step), and the build time penalty is irrelevant at our scale (< 100K vectors). IVFFlat only wins on very large datasets where build time matters.

### Neon-Specific Considerations

- **maintenance_work_mem**: Default varies by compute size. For index builds, Neon recommends not exceeding 50-60% of available RAM. At our scale, defaults are fine.
- **Index after data load**: Build HNSW indexes after inserting initial data, not before. Not a concern for incremental inserts.
- **Serverless cold starts**: Neon's serverless compute can have cold starts. pgvector queries on warm connections are 5-20ms for our scale. Cold start adds ~500ms-1s (Neon's connection latency, not pgvector-specific).
- **No special configuration needed**: pgvector works out of the box on Neon. No custom extensions to request or compile.

### Sources
- [Neon pgvector docs](https://neon.com/docs/extensions/pgvector)
- [Neon vector search optimization](https://neon.com/docs/ai/ai-vector-search-optimization)
- [Neon halfvec blog](https://neon.com/blog/dont-use-vector-use-halvec-instead-and-save-50-of-your-storage-cost)

---

## 2. Embedding Model Recommendation

### Use OpenAI `text-embedding-3-small` (1536 dimensions)

| Criterion | text-embedding-3-small | Voyage-3 | Cohere embed-v3 |
|-----------|----------------------|-----------|-----------------|
| **MTEB score** | 62.3 | 67.5 | 65.2 |
| **Dimensions** | 1536 (reducible to 512) | 1024 | 1024 |
| **Cost / 1M tokens** | $0.02 | $0.06 | $0.10 |
| **Vercel AI SDK support** | Native (`@ai-sdk/openai`) | Needs custom provider | Native (`@ai-sdk/cohere`) |
| **Batch API** | Yes (50% off) | No | Yes |

**Why `text-embedding-3-small`:**

1. **Native Vercel AI SDK integration** -- `embed()` and `embedMany()` work out of the box. No custom provider code.
2. **Cheapest option** -- $0.02/M tokens. At our usage (estimated 500K tokens/month for embeddings), that is $0.01/month.
3. **Good enough quality** -- We are embedding structured 1:1 session data, not doing open-domain retrieval. The quality difference between models matters less for domain-specific, structured text.
4. **Dimension reduction** -- Can reduce to 512 dimensions via `providerOptions.openai.dimensions` to cut storage by 66% with minimal quality loss. Recommended for our use case.
5. **Already using OpenAI ecosystem indirectly** through Vercel AI SDK patterns.

**Recommended: 512 dimensions** (reduced from 1536). Saves storage, faster queries, and for structured meeting data the quality loss is negligible.

### Why NOT Anthropic for Embeddings

Anthropic does not offer an embedding model. The current stack uses Anthropic Claude for generation (summaries, nudges) but embeddings require a separate provider. This is standard practice -- generation and embedding are different capabilities.

### Integration Code

```typescript
// src/lib/ai/embeddings.ts
import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

const EMBEDDING_MODEL = openai.embedding("text-embedding-3-small", {
  dimensions: 512, // Reduced from 1536 for our use case
});

export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: EMBEDDING_MODEL,
    value: text,
  });
  return embedding;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: EMBEDDING_MODEL,
    values: texts,
  });
  return embeddings;
}
```

### New Dependency Required

```bash
bun add @ai-sdk/openai
```

The project already uses `ai` (Vercel AI SDK) but only has `@ai-sdk/anthropic`. OpenAI provider needed for embeddings.

### Sources
- [Vercel AI SDK Embeddings](https://ai-sdk.dev/docs/ai-sdk-core/embeddings)
- [OpenAI embedding pricing](https://platform.openai.com/docs/pricing)
- [Embedding model comparison](https://elephas.app/blog/best-embedding-models)

---

## 3. Profile Architecture -- Schema Design

### Recommended: Append-Only Chunk Embeddings

Do NOT use a single "profile vector" per user. Instead, embed individual chunks of session data and retrieve relevant chunks via similarity search.

#### Why Append-Only Chunks Beat Single Profile Vectors

| Approach | Pros | Cons |
|----------|------|------|
| **Single evolving vector** | Simple, one row per user | Lossy (averaging destroys nuance), no temporal queries, "what changed?" impossible |
| **Weighted rolling average** | Recency bias, one row | Still lossy, complex decay math, can't explain what contributed |
| **Append-only chunks** | Full fidelity, temporal queries, explainable retrieval, natural growth | More rows, needs HNSW index, slightly more complex queries |

The append-only model is the industry-standard RAG pattern. It is the right choice.

#### Schema Design

```typescript
// src/lib/db/schema/profile-embeddings.ts
import { pgTable, uuid, text, timestamp, integer, index, vector } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";
import { sessions } from "./sessions";

/**
 * Embedded chunks of session data that collectively form a user's AI profile.
 * Each row is a semantic chunk (summary, category rollup, notable answer, etc.)
 * embedded as a vector for similarity-based retrieval.
 */
export const profileEmbeddings = pgTable(
  "profile_embedding",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
    userId: uuid("user_id").notNull().references(() => users.id),
    sessionId: uuid("session_id").references(() => sessions.id),

    /** What kind of chunk: "session_summary", "category_rollup", "notable_answer", "trend_note", "action_pattern" */
    chunkType: text("chunk_type").notNull(),

    /** The text that was embedded -- stored for debugging and re-embedding */
    chunkText: text("chunk_text").notNull(),

    /** The vector embedding (512 dimensions, reduced from 1536) */
    embedding: vector("embedding", { dimensions: 512 }),

    /** Session number for temporal ordering */
    sessionNumber: integer("session_number"),

    /** When the source session occurred */
    sessionDate: timestamp("session_date", { withTimezone: true }),

    /** When this embedding was created */
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // HNSW index for fast cosine similarity search
    index("profile_embedding_vector_idx")
      .using("hnsw", table.embedding.op("vector_cosine_ops")),

    // Filter index: find all embeddings for a user in a tenant
    index("profile_embedding_tenant_user_idx")
      .on(table.tenantId, table.userId),

    // Filter + sort: temporal queries for a user
    index("profile_embedding_user_session_idx")
      .on(table.userId, table.sessionDate),
  ]
);
```

#### Chunk Types and What Gets Embedded

After each session completes (inside the existing AI pipeline), generate and embed these chunks:

| Chunk Type | Source | Example Text | When |
|------------|--------|-------------|------|
| `session_summary` | AI-generated summary (`aiSummary.cardBlurb` + `keyTakeaways`) | "Session #12: Maria showed increased engagement. Key takeaway: excited about the new project..." | Every completed session |
| `category_rollup` | Per-category scores + notable answers | "Wellbeing (Session #12, 2026-03-15): Score 4.2/5. Workload feels manageable. Sleep improving..." | Every completed session, one per category with answers |
| `notable_answer` | Long-form text answers (> 100 chars) | "When asked about career goals: 'I want to move into a tech lead role within 12 months...'" | Selectively, only substantive text answers |
| `trend_note` | AI-generated cross-session observation | "Engagement scores have risen from 2.8 to 4.1 over the last 4 sessions since the team restructuring" | Generated every 3-5 sessions by the AI pipeline |
| `action_pattern` | Action item completion patterns | "Pattern: Maria consistently completes code-review action items within 3 days but defers 1:1 meeting prep items" | Generated every 5-10 sessions |

**Expected volume per user**: 3-6 chunks per session (1 summary + 2-4 category rollups + 0-2 notable answers). With biweekly sessions, that is ~8-15 chunks/month per user. After a year: ~150 chunks per user.

**At 500 users, 1 year**: ~75,000 rows. Trivial for pgvector with HNSW.

---

## 4. Continuous Update Pattern

### Recommended: Post-Session Embedding Pipeline

Extend the existing `runAIPipelineDirect()` function to include an embedding step after the AI summary is generated.

#### Pipeline Integration

```
Session Completed
  |
  v
[Existing] Set aiStatus = "generating"
  |
  v
[Existing] Gather session context
  |
  v
[Existing] Generate unified AI output (summary, addendum, suggestions)
  |
  v
[Existing] Store AI output in session row
  |
  v
[NEW] Generate profile embeddings for this session <--- INSERT HERE
  |  - Embed session summary chunk
  |  - Embed category rollup chunks
  |  - Embed notable answer chunks
  |  - Every Nth session: embed trend notes
  |
  v
[Existing] Compute analytics snapshot
  |
  v
[Existing] Send summary emails
```

#### Embedding Generation Logic

```typescript
// src/lib/ai/profile-embeddings.ts

interface EmbeddingChunk {
  chunkType: string;
  chunkText: string;
  sessionNumber: number;
  sessionDate: Date;
}

export async function generateSessionProfileChunks(
  context: SessionContext,
  aiOutput: UnifiedAIOutput
): Promise<EmbeddingChunk[]> {
  const chunks: EmbeddingChunk[] = [];
  const { sessionNumber, scheduledAt, reportName } = context;

  // 1. Session summary chunk
  const summaryText = [
    `Session #${sessionNumber} with ${reportName} (${scheduledAt.toISOString().split("T")[0]}):`,
    aiOutput.publicSummary.cardBlurb,
    `Key takeaways: ${aiOutput.metrics.keyTakeaways.join(". ")}`,
    `Overall sentiment: ${aiOutput.metrics.overallSentiment}`,
    `AI assessment: ${aiOutput.metrics.objectiveRating}/5`,
  ].join(" ");

  chunks.push({
    chunkType: "session_summary",
    chunkText: summaryText,
    sessionNumber,
    sessionDate: scheduledAt,
  });

  // 2. Category rollup chunks (group answers by section)
  const answersBySection = groupBy(context.answers, (a) => a.sectionName);
  for (const [section, answers] of Object.entries(answersBySection)) {
    const rollupText = [
      `${section} (Session #${sessionNumber}, ${scheduledAt.toISOString().split("T")[0]}):`,
      ...answers.map((a) => {
        if (a.answerNumeric) return `${a.questionText}: ${a.answerNumeric}/5`;
        if (a.answerText) return `${a.questionText}: ${a.answerText}`;
        return null;
      }).filter(Boolean),
    ].join(" ");

    if (rollupText.length > 50) { // Skip near-empty sections
      chunks.push({
        chunkType: "category_rollup",
        chunkText: rollupText,
        sessionNumber,
        sessionDate: scheduledAt,
      });
    }
  }

  // 3. Notable text answers (long-form responses)
  for (const answer of context.answers) {
    if (answer.answerText && answer.answerText.length > 100) {
      chunks.push({
        chunkType: "notable_answer",
        chunkText: `${reportName} on "${answer.questionText}" (Session #${sessionNumber}): ${answer.answerText}`,
        sessionNumber,
        sessionDate: scheduledAt,
      });
    }
  }

  return chunks;
}
```

#### No Re-Embedding Needed

Because we use append-only chunks, there is no need to re-embed or update existing embeddings. Each session adds new chunks. Old chunks remain valid and provide historical context. This is the simplest and most reliable update strategy.

#### Periodic Trend Chunks (Optional, Phase 2)

Every 5 sessions, ask the LLM to generate a "trend note" summarizing changes over the recent period:

```
"Over Sessions #8-12, Maria's engagement has steadily improved from 3.2 to 4.5.
Career anxiety decreased after the promotion discussion in Session #10.
Action item completion rate improved from 40% to 80%."
```

Embed this as a `trend_note` chunk. This provides high-level trajectory context that individual session chunks cannot capture alone.

---

## 5. Integration with Sessions

### How Profile Embeddings Feed Back Into the Session Experience

#### A. Pre-Session Context (highest value)

Before a session starts, retrieve relevant profile chunks to give the AI (and the manager) context:

```typescript
async function getPreSessionProfile(
  userId: string,
  tenantId: string,
  upcomingTopics?: string[] // from talking points or template questions
): Promise<string> {
  const queryText = upcomingTopics
    ? `Upcoming discussion: ${upcomingTopics.join(", ")}`
    : "General 1:1 meeting context and recent trends";

  const queryEmbedding = await generateEmbedding(queryText);

  // Retrieve top-K most relevant chunks for this user
  const relevantChunks = await db
    .select({
      chunkType: profileEmbeddings.chunkType,
      chunkText: profileEmbeddings.chunkText,
      sessionDate: profileEmbeddings.sessionDate,
      similarity: sql<number>`1 - (${cosineDistance(profileEmbeddings.embedding, queryEmbedding)})`,
    })
    .from(profileEmbeddings)
    .where(
      and(
        eq(profileEmbeddings.userId, userId),
        eq(profileEmbeddings.tenantId, tenantId),
      )
    )
    .orderBy(desc(sql`1 - (${cosineDistance(profileEmbeddings.embedding, queryEmbedding)})`))
    .limit(10);

  return relevantChunks
    .map((c) => `[${c.chunkType} | ${c.sessionDate?.toISOString().split("T")[0]}] ${c.chunkText}`)
    .join("\n\n");
}
```

#### B. Enriched AI Pipeline Context

Modify `gatherSessionContext()` to include relevant profile chunks. The existing context already pulls 5 recent sessions with full answers and older sessions with summaries only. Profile embeddings add **semantically relevant** historical context, not just chronologically recent context.

For example: if this session's template has career-focused questions, the profile retrieval surfaces career-related chunks from months ago, even if the last 5 sessions focused on wellbeing.

#### C. Manager Dashboard Insights

Surface profile-derived insights on the dashboard:
- "Maria's engagement has been trending up over 3 months"
- "Similar to patterns seen with Alex before their promotion discussion"
- "Career anxiety topic surfaced 4 times in the last 6 sessions"

#### D. Cross-Team Similarity (future, use with care)

Find employees with similar profile patterns:
```sql
-- Find users with similar wellbeing patterns to a given user
SELECT pe2.user_id, 1 - (pe1.embedding <=> pe2.embedding) AS similarity
FROM profile_embedding pe1
JOIN profile_embedding pe2 ON pe1.tenant_id = pe2.tenant_id
WHERE pe1.user_id = :target_user
  AND pe2.user_id != :target_user
  AND pe1.chunk_type = 'category_rollup'
  AND pe2.chunk_type = 'category_rollup'
  AND pe1.chunk_text LIKE 'Wellbeing%'
  AND pe2.chunk_text LIKE 'Wellbeing%'
ORDER BY pe1.embedding <=> pe2.embedding
LIMIT 5;
```

**Privacy warning**: Cross-user similarity must be tenant-scoped and admin-only. Never expose individual profile data across manager boundaries.

---

## 6. Similarity Search Use Cases

| Use Case | Query Strategy | Who Sees It |
|----------|---------------|-------------|
| **Pre-session context** | Embed upcoming template questions, retrieve relevant chunks for this user | AI pipeline (feeds into prompt) |
| **"What did we discuss about X?"** | Embed the question, retrieve matching chunks across sessions | Manager, in session history search |
| **Detect declining trends** | Retrieve recent vs older sentiment chunks, compare | Manager dashboard alert |
| **Find similar growth patterns** | Cross-user cosine similarity on `trend_note` chunks | Admin analytics (tenant-scoped) |
| **Surface unresolved themes** | Embed "unresolved issues", retrieve recurring topics | AI nudge generation |
| **Team wellbeing snapshot** | Aggregate recent `category_rollup` chunks for wellbeing across team | Manager team analytics |

---

## 7. Drizzle ORM + pgvector Integration

### Current Status (HIGH confidence)

Drizzle ORM has **native pgvector support** since ~v0.30:

- `vector()` column type with `{ dimensions: N }`
- HNSW and IVFFlat index support via `.using("hnsw", ...)`
- Distance functions: `cosineDistance`, `l2Distance`, `innerProduct`, `l1Distance`
- Works with the existing Drizzle setup in the project

### Known Issue (MEDIUM confidence)

There is a reported bug in drizzle-orm 0.45.x where `getTableColumns()` combined with computed SQL expressions returns incorrect values when the schema contains `customType` columns. The project is on drizzle-orm `0.38.4` so this is not currently an issue, but worth noting for future upgrades.

**Workaround**: Use explicit `.select()` with named fields instead of `getTableColumns()` for queries involving vector columns.

### Migration

```sql
-- Migration: add pgvector extension and profile_embedding table
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE profile_embedding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  user_id UUID NOT NULL REFERENCES "user"(id),
  session_id UUID REFERENCES session(id),
  chunk_type TEXT NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding vector(512),
  session_number INTEGER,
  session_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- HNSW index for cosine similarity search
CREATE INDEX profile_embedding_vector_idx
  ON profile_embedding
  USING hnsw (embedding vector_cosine_ops);

-- Filtering indexes
CREATE INDEX profile_embedding_tenant_user_idx
  ON profile_embedding (tenant_id, user_id);

CREATE INDEX profile_embedding_user_session_idx
  ON profile_embedding (user_id, session_date);

-- RLS policy (tenant isolation)
ALTER TABLE profile_embedding ENABLE ROW LEVEL SECURITY;

CREATE POLICY profile_embedding_tenant_isolation
  ON profile_embedding
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

### Sources
- [Drizzle ORM vector similarity search guide](https://orm.drizzle.team/docs/guides/vector-similarity-search)
- [pgvector-node npm package](https://github.com/pgvector/pgvector-node)

---

## 8. Cost and Latency Estimates

### Scale Assumptions

| Metric | Value |
|--------|-------|
| Active users | 500 |
| Sessions/user/month | 2 (biweekly) |
| Chunks/session | 4 (avg) |
| New chunks/month | 4,000 |
| Total chunks after 1 year | ~50,000 |
| Total chunks after 3 years | ~150,000 |

### Embedding Generation Cost

| Item | Calculation | Monthly Cost |
|------|-------------|-------------|
| Tokens per chunk | ~200 tokens avg | -- |
| Total tokens/month | 4,000 chunks x 200 tokens = 800K tokens | -- |
| OpenAI embedding cost | 800K / 1M x $0.02 | **$0.016/month** |
| With batch API (50% off) | -- | **$0.008/month** |

**Embedding cost is essentially free.** Even at 10x scale (5,000 users), it would be $0.16/month.

### Storage Cost (Neon)

| Item | Calculation | Size |
|------|-------------|------|
| Vector per row | 512 dims x 4 bytes = 2,048 bytes | 2 KB |
| Metadata per row | ~500 bytes (text, UUIDs, timestamps) | 0.5 KB |
| Row total | ~2.5 KB | -- |
| 50,000 rows (1 year) | 50,000 x 2.5 KB | **125 MB** |
| HNSW index overhead | ~1.5x data size | **~190 MB** |
| **Total after 1 year** | -- | **~315 MB** |

This is within Neon's free tier storage limits (0.5 GB on Free, 50 GB on Launch). Not a concern.

### Query Latency

| Query Type | Expected Latency | Notes |
|------------|-----------------|-------|
| Top-10 similarity for 1 user (filtered) | **2-5ms** | HNSW index + tenant/user filter |
| Top-10 similarity across team (10 users) | **5-15ms** | Slightly more scanning |
| Full table scan (no index) | **50-200ms** at 50K rows | Only if index is missing |
| Embedding generation (API call) | **100-300ms** | OpenAI API latency |

**The bottleneck is embedding generation (API call), not the database query.** For pre-session context, generate the query embedding once and cache it for the session duration.

---

## 9. Implementation Complexity Assessment

### Phase Breakdown

| Phase | Effort | Description |
|-------|--------|-------------|
| **Phase A: Schema + Extension** | 1 day | Enable pgvector, create table, migration, RLS policy |
| **Phase B: Embedding Service** | 1-2 days | `@ai-sdk/openai` setup, embed/embedMany wrapper, chunk text builder |
| **Phase C: Pipeline Integration** | 1-2 days | Hook into `runAIPipelineDirect()`, generate and store chunks post-session |
| **Phase D: Retrieval Service** | 1-2 days | Similarity search queries, pre-session context builder |
| **Phase E: Context Integration** | 1 day | Modify `gatherSessionContext()` to include profile chunks in AI prompts |
| **Phase F: Backfill** | 0.5 days | Script to embed existing completed sessions (one-time) |
| **Total** | **5-8 days** | |

### What Changes in Existing Code

1. **`src/lib/ai/pipeline.ts`** -- Add embedding step after AI output storage (non-fatal, like analytics snapshot)
2. **`src/lib/ai/context.ts`** -- Add profile chunk retrieval to `gatherSessionContext()`
3. **`src/lib/ai/models.ts`** -- Add OpenAI embedding model configuration
4. **`src/lib/db/schema/`** -- New `profile-embeddings.ts` schema file
5. **`package.json`** -- Add `@ai-sdk/openai` dependency

### What Does NOT Change

- Session wizard UI (no user-facing changes in Phase 1)
- Existing AI summary/nudge generation logic
- Analytics snapshot computation
- Authentication/authorization (RLS handles tenant isolation)

---

## 10. Recommended Implementation Order

### Milestone 1: Foundation (ship as one unit)

1. **Enable pgvector on Neon** -- `CREATE EXTENSION vector`
2. **Schema + migration** -- `profile_embedding` table with HNSW index and RLS
3. **Embedding service** -- `generateEmbedding()` / `generateEmbeddings()` using Vercel AI SDK + OpenAI
4. **Chunk builder** -- Convert session AI output into embeddable text chunks
5. **Pipeline hook** -- Generate and store embeddings after each session completion
6. **Backfill script** -- Embed all existing completed sessions

### Milestone 2: Retrieval Integration

1. **Retrieval service** -- Similarity search with tenant/user filtering
2. **Context enrichment** -- Feed relevant profile chunks into AI prompts
3. **Improved AI output** -- AI summaries now reference longitudinal patterns ("compared to 3 months ago...")

### Milestone 3: User-Facing Features (future)

1. **Manager dashboard insights** -- Profile-derived trend cards
2. **Session prep view** -- "Key context for this 1:1" based on profile retrieval
3. **Team pattern detection** -- Cross-user similarity analysis (admin only)
4. **Search enhancement** -- "What did we discuss about career goals?" using embedding search

---

## 11. Pitfalls and Risks

### Critical

**Embedding model lock-in**: Once you embed 50K chunks with a specific model, switching models requires re-embedding everything. Mitigate by storing `chunk_text` alongside embeddings (already in the schema) so re-embedding is a batch job, not a data loss event.

**Tenant data leakage via similarity search**: Cross-user queries MUST be scoped to `tenant_id`. A careless `ORDER BY embedding <=> query_vector` without tenant filtering would return results across tenants. RLS provides defense-in-depth but application-level checks are still required.

### Moderate

**Chunk text quality determines profile quality**: If AI summaries are poor (garbage in), embeddings will be poor (garbage out). The existing AI pipeline produces good summaries, so this is low risk, but any regression in summary quality will degrade profiles.

**OpenAI dependency for embeddings**: Adds a second AI provider dependency (Anthropic for generation, OpenAI for embeddings). If OpenAI is down, embedding generation fails. Mitigate: make embedding step non-fatal in the pipeline (like analytics snapshot), retry on next session or via background job.

**Drizzle vector column + getTableColumns() bug**: Known issue in newer Drizzle versions. Use explicit selects for vector queries.

### Minor

**Cold start latency**: First embedding query after Neon compute sleep may be slow. Not user-facing if used only in the AI pipeline (fire-and-forget).

**Embedding dimension choice is final-ish**: Switching from 512 to 1536 dimensions later requires re-creating the index and re-embedding. Pick once, stick with it. 512 is the right choice for structured meeting data.

---

## 12. Open Questions for Phase-Specific Research

1. **Trend note generation frequency**: Every 3, 5, or 10 sessions? Needs experimentation.
2. **Chunk text templates**: Exact formatting of embeddable text affects retrieval quality. Will need A/B testing.
3. **Top-K retrieval count**: How many chunks should feed into the AI prompt? 5? 10? 20? Token budget vs context quality tradeoff.
4. **Cross-series profiles**: Should chunks from different meeting series (different managers) combine into one profile? Privacy implications.
5. **Profile deletion/GDPR**: When a user is deactivated, should embeddings be deleted? Anonymized? Retained for aggregate analytics?

---

## Sources

### HIGH confidence (official docs)
- [Neon pgvector documentation](https://neon.com/docs/extensions/pgvector)
- [Neon vector search optimization](https://neon.com/docs/ai/ai-vector-search-optimization)
- [Drizzle ORM vector similarity search](https://orm.drizzle.team/docs/guides/vector-similarity-search)
- [Vercel AI SDK embeddings](https://ai-sdk.dev/docs/ai-sdk-core/embeddings)
- [OpenAI embedding pricing](https://platform.openai.com/docs/pricing)

### MEDIUM confidence (verified multi-source)
- [Embedding model comparison (Elephas)](https://elephas.app/blog/best-embedding-models)
- [pgvector vs Pinecone (Encore)](https://encore.dev/articles/pgvector-vs-pinecone)
- [Neon halfvec blog post](https://neon.com/blog/dont-use-vector-use-halvec-instead-and-save-50-of-your-storage-cost)

### LOW confidence (needs validation)
- Exact Neon pgvector version (check extensions page at implementation time)
- Drizzle 0.45.x vector bug (may be fixed by implementation time)
