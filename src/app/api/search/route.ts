import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { isAdmin } from "@/lib/auth/rbac";
import {
  actionItems,
  sessions,
  meetingSeries,
  users,
  talkingPoints,
  sessionAnswers,
  questionnaireTemplates,
} from "@/lib/db/schema";
import { eq, and, or, sql, inArray } from "drizzle-orm";
import type { TransactionClient } from "@/lib/db/tenant-context";

// --- Types ---

interface SessionSearchResult {
  sessionId: string;
  sessionNumber: number;
  snippet: string;
  seriesId: string;
  reportName: string;
  scheduledAt: string;
}

interface ActionItemSearchResult {
  id: string;
  title: string;
  snippet: string;
  status: string;
  sessionId: string;
  seriesId: string;
}

interface TemplateSearchResult {
  id: string;
  name: string;
  snippet: string;
}

interface PeopleSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string | null;
}

interface SearchResults {
  sessions: SessionSearchResult[];
  actionItems: ActionItemSearchResult[];
  templates: TemplateSearchResult[];
  people: PeopleSearchResult[];
}

// --- Helpers ---

/**
 * Get IDs of all series the user participates in (or all if admin).
 */
async function getUserSeriesIds(
  tx: TransactionClient,
  tenantId: string,
  userId: string,
  level: string
): Promise<string[]> {
  const userIsAdmin = isAdmin(level);

  const seriesFilter = userIsAdmin
    ? eq(meetingSeries.tenantId, tenantId)
    : and(
        eq(meetingSeries.tenantId, tenantId),
        or(
          eq(meetingSeries.managerId, userId),
          eq(meetingSeries.reportId, userId)
        )
      );

  const rows = await tx
    .select({ id: meetingSeries.id })
    .from(meetingSeries)
    .where(seriesFilter!);

  return rows.map((r) => r.id);
}

/**
 * Search sessions via talking points, free-text answers, and shared notes.
 */
async function searchSessions(
  tx: TransactionClient,
  query: string,
  tenantId: string,
  seriesIds: string[],
  limit: number
): Promise<SessionSearchResult[]> {
  if (seriesIds.length === 0) return [];

  // Search talking points
  const tpResults = await tx.execute(sql`
    SELECT
      s.id AS session_id,
      s.session_number,
      s.series_id,
      s.scheduled_at,
      ts_headline('english', tp.content, websearch_to_tsquery('english', ${query}),
        'MaxWords=20,MinWords=10,MaxFragments=1') AS snippet,
      ts_rank(to_tsvector('english', tp.content), websearch_to_tsquery('english', ${query})) AS rank
    FROM talking_point tp
    JOIN session s ON tp.session_id = s.id
    WHERE s.tenant_id = ${tenantId}
      AND s.series_id = ANY(${seriesIds})
      AND to_tsvector('english', tp.content) @@ websearch_to_tsquery('english', ${query})
    ORDER BY rank DESC
    LIMIT ${limit * 3}
  `);

  // Search free-text answers
  const answerResults = await tx.execute(sql`
    SELECT
      s.id AS session_id,
      s.session_number,
      s.series_id,
      s.scheduled_at,
      ts_headline('english', sa.answer_text, websearch_to_tsquery('english', ${query}),
        'MaxWords=20,MinWords=10,MaxFragments=1') AS snippet,
      ts_rank(to_tsvector('english', coalesce(sa.answer_text, '')), websearch_to_tsquery('english', ${query})) AS rank
    FROM session_answer sa
    JOIN session s ON sa.session_id = s.id
    WHERE s.tenant_id = ${tenantId}
      AND s.series_id = ANY(${seriesIds})
      AND sa.answer_text IS NOT NULL
      AND to_tsvector('english', coalesce(sa.answer_text, '')) @@ websearch_to_tsquery('english', ${query})
    ORDER BY rank DESC
    LIMIT ${limit * 3}
  `);

  // Search shared notes (on-the-fly JSONB text extraction, no index)
  const notesResults = await tx.execute(sql`
    SELECT
      s.id AS session_id,
      s.session_number,
      s.series_id,
      s.scheduled_at,
      ts_headline('english',
        (SELECT string_agg(value, ' ') FROM jsonb_each_text(s.shared_notes)),
        websearch_to_tsquery('english', ${query}),
        'MaxWords=20,MinWords=10,MaxFragments=1') AS snippet,
      ts_rank(
        to_tsvector('english', coalesce((SELECT string_agg(value, ' ') FROM jsonb_each_text(s.shared_notes)), '')),
        websearch_to_tsquery('english', ${query})
      ) AS rank
    FROM session s
    WHERE s.tenant_id = ${tenantId}
      AND s.series_id = ANY(${seriesIds})
      AND s.shared_notes IS NOT NULL
      AND s.shared_notes::text <> 'null'
      AND to_tsvector('english', coalesce((SELECT string_agg(value, ' ') FROM jsonb_each_text(s.shared_notes)), ''))
        @@ websearch_to_tsquery('english', ${query})
    ORDER BY rank DESC
    LIMIT ${limit * 3}
  `);

  // Deduplicate by sessionId, keep highest rank, merge snippets
  const sessionMap = new Map<
    string,
    {
      sessionId: string;
      sessionNumber: number;
      seriesId: string;
      scheduledAt: string;
      snippet: string;
      rank: number;
    }
  >();

  const allResults = [
    ...(tpResults.rows as Array<Record<string, unknown>>),
    ...(answerResults.rows as Array<Record<string, unknown>>),
    ...(notesResults.rows as Array<Record<string, unknown>>),
  ];

  for (const row of allResults) {
    const sessionId = row.session_id as string;
    const rank = Number(row.rank);
    const existing = sessionMap.get(sessionId);

    if (!existing || rank > existing.rank) {
      sessionMap.set(sessionId, {
        sessionId,
        sessionNumber: Number(row.session_number),
        seriesId: row.series_id as string,
        scheduledAt: (row.scheduled_at as Date).toISOString(),
        snippet: (row.snippet as string) || "",
        rank,
      });
    }
  }

  // Sort by rank and limit
  const deduplicated = Array.from(sessionMap.values())
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit);

  // Fetch report names for the series in results
  const resultSeriesIds = [...new Set(deduplicated.map((r) => r.seriesId))];
  if (resultSeriesIds.length === 0) return [];

  const seriesInfo = await tx
    .select({
      id: meetingSeries.id,
      reportId: meetingSeries.reportId,
    })
    .from(meetingSeries)
    .where(inArray(meetingSeries.id, resultSeriesIds));

  const reportIds = [...new Set(seriesInfo.map((s) => s.reportId))];
  const reportRows =
    reportIds.length > 0
      ? await tx
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
          })
          .from(users)
          .where(inArray(users.id, reportIds))
      : [];

  const reportMap = new Map(reportRows.map((u) => [u.id, u]));
  const seriesReportMap = new Map(
    seriesInfo.map((s) => [s.id, reportMap.get(s.reportId)])
  );

  return deduplicated.map((r) => {
    const report = seriesReportMap.get(r.seriesId);
    return {
      sessionId: r.sessionId,
      sessionNumber: r.sessionNumber,
      snippet: r.snippet,
      seriesId: r.seriesId,
      reportName: report
        ? `${report.firstName} ${report.lastName}`.trim()
        : "",
      scheduledAt: r.scheduledAt,
    };
  });
}

/**
 * Search action items by title and description.
 */
async function searchActionItems(
  tx: TransactionClient,
  query: string,
  tenantId: string,
  seriesIds: string[],
  limit: number
): Promise<ActionItemSearchResult[]> {
  if (seriesIds.length === 0) return [];

  const results = await tx.execute(sql`
    SELECT
      ai.id,
      ai.title,
      ai.status,
      ai.session_id,
      s.series_id,
      ts_headline('english',
        coalesce(ai.title, '') || ' ' || coalesce(ai.description, ''),
        websearch_to_tsquery('english', ${query}),
        'MaxWords=20,MinWords=10,MaxFragments=1') AS snippet,
      ts_rank(
        to_tsvector('english', coalesce(ai.title, '') || ' ' || coalesce(ai.description, '')),
        websearch_to_tsquery('english', ${query})
      ) AS rank
    FROM action_item ai
    JOIN session s ON ai.session_id = s.id
    WHERE ai.tenant_id = ${tenantId}
      AND s.series_id = ANY(${seriesIds})
      AND to_tsvector('english', coalesce(ai.title, '') || ' ' || coalesce(ai.description, ''))
        @@ websearch_to_tsquery('english', ${query})
    ORDER BY rank DESC
    LIMIT ${limit}
  `);

  return (results.rows as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    snippet: (row.snippet as string) || "",
    status: row.status as string,
    sessionId: row.session_id as string,
    seriesId: row.series_id as string,
  }));
}

/**
 * Search templates by name and description (ILIKE for simplicity).
 */
async function searchTemplates(
  tx: TransactionClient,
  query: string,
  tenantId: string,
  limit: number
): Promise<TemplateSearchResult[]> {
  const likePattern = `%${query}%`;

  const results = await tx
    .select({
      id: questionnaireTemplates.id,
      name: questionnaireTemplates.name,
      description: questionnaireTemplates.description,
    })
    .from(questionnaireTemplates)
    .where(
      and(
        or(
          eq(questionnaireTemplates.tenantId, tenantId),
          sql`${questionnaireTemplates.tenantId} IS NULL`
        ),
        eq(questionnaireTemplates.isArchived, false),
        or(
          sql`${questionnaireTemplates.name} ILIKE ${likePattern}`,
          sql`${questionnaireTemplates.description} ILIKE ${likePattern}`
        )
      )
    )
    .limit(limit);

  return results.map((r) => ({
    id: r.id,
    name: r.name,
    snippet: r.description
      ? r.description.length > 100
        ? r.description.slice(0, 100) + "..."
        : r.description
      : "",
  }));
}

/**
 * Search people by name, email, or job title (ILIKE).
 */
async function searchPeople(
  tx: TransactionClient,
  query: string,
  tenantId: string,
  limit: number
): Promise<PeopleSearchResult[]> {
  const likePattern = `%${query}%`;

  const results = await tx
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      jobTitle: users.jobTitle,
    })
    .from(users)
    .where(
      and(
        eq(users.tenantId, tenantId),
        eq(users.isActive, true),
        or(
          sql`${users.firstName} ILIKE ${likePattern}`,
          sql`${users.lastName} ILIKE ${likePattern}`,
          sql`${users.email} ILIKE ${likePattern}`,
          sql`${users.jobTitle} ILIKE ${likePattern}`
        )
      )
    )
    .limit(limit);

  return results.map((r) => ({
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    email: r.email,
    jobTitle: r.jobTitle,
  }));
}

// --- Route Handler ---

/**
 * GET /api/search
 *
 * Full-text search API aggregating results across sessions, action items,
 * templates, and people. Uses PostgreSQL tsvector/GIN indexes for session
 * content search and ILIKE for templates/people.
 *
 * Query params:
 *   - q (required): Search query string
 *   - limit (optional): Max results per type (default 5, max 10)
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limitParam = searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitParam ?? "5", 10) || 5, 1), 10);

  // Empty query returns empty results
  if (!q) {
    return NextResponse.json({
      results: {
        sessions: [],
        actionItems: [],
        templates: [],
        people: [],
      } satisfies SearchResults,
    });
  }

  try {
    const results = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Get series IDs for role-based visibility
        const seriesIds = await getUserSeriesIds(
          tx,
          session.user.tenantId,
          session.user.id,
          session.user.level
        );

        // Run all searches in parallel
        const [sessionResults, actionItemResults, templateResults, peopleResults] =
          await Promise.all([
            searchSessions(tx, q, session.user.tenantId, seriesIds, limit),
            searchActionItems(tx, q, session.user.tenantId, seriesIds, limit),
            searchTemplates(tx, q, session.user.tenantId, limit),
            searchPeople(tx, q, session.user.tenantId, limit),
          ]);

        return {
          sessions: sessionResults,
          actionItems: actionItemResults,
          templates: templateResults,
          people: peopleResults,
        } satisfies SearchResults;
      }
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search failed:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
