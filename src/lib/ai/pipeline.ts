import * as Sentry from "@sentry/nextjs";
import { gatherSessionContext } from "./context";
import {
  generateSummary,
  generateManagerAddendum,
  generateActionSuggestions,
} from "./service";
import { withTenantContext } from "@/lib/db/tenant-context";
import { logAuditEvent } from "@/lib/audit/log";
import { computeSessionSnapshot } from "@/lib/analytics/compute";
import { sendPostSessionSummaryEmails } from "@/lib/notifications/summary-email";
import { sessions, tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface PipelineInput {
  sessionId: string;
  seriesId: string;
  tenantId: string;
  managerId: string;
  reportId: string;
}

/**
 * Run the full post-session AI pipeline directly (no Inngest).
 *
 * This is a fire-and-forget function — call it without await.
 * It handles its own error handling and sets aiStatus to "failed" on error.
 */
export async function runAIPipelineDirect(input: PipelineInput): Promise<void> {
  const { sessionId, seriesId, tenantId, managerId, reportId } = input;

  // Attach pipeline context to all Sentry events in this scope
  Sentry.setContext("ai_pipeline", { sessionId, seriesId, tenantId, managerId, reportId });

  try {
    // Step 1 — set status to generating
    Sentry.addBreadcrumb({ category: "ai_pipeline", message: "Starting: setting status to generating", level: "info", data: { sessionId } });
    await withTenantContext(tenantId, managerId, async (tx) => {
      await tx
        .update(sessions)
        .set({ aiStatus: "generating", updatedAt: new Date() })
        .where(eq(sessions.id, sessionId));
    });

    // Step 2 — gather context
    Sentry.addBreadcrumb({ category: "ai_pipeline", message: "Gathering session context", level: "info", data: { sessionId } });
    const context = await gatherSessionContext({
      sessionId,
      seriesId,
      tenantId,
      managerId,
      reportId,
    });
    Sentry.addBreadcrumb({ category: "ai_pipeline", message: "Context gathered", level: "info", data: { sessionId, answersCount: context.answers.length, previousSessionsCount: context.previousSessions.length } });

    // Step 3 — fetch tenant language
    const tenantData = await withTenantContext(tenantId, managerId, async (tx) => {
      const [t] = await tx
        .select({ settings: tenants.settings })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);
      return t;
    });
    const language = (tenantData?.settings as Record<string, unknown> | null)?.preferredLanguage as string | undefined;
    Sentry.addBreadcrumb({ category: "ai_pipeline", message: "Language resolved", level: "info", data: { sessionId, language: language ?? "en (default)" } });

    // Step 4 — generate summary
    Sentry.addBreadcrumb({ category: "ai_pipeline", message: "Calling generateSummary", level: "info", data: { sessionId } });
    const summary = await generateSummary(context, language);
    Sentry.addBreadcrumb({ category: "ai_pipeline", message: "Summary generated", level: "info", data: { sessionId, keyTakeaways: summary.keyTakeaways.length } });

    // Step 5 — generate manager addendum
    Sentry.addBreadcrumb({ category: "ai_pipeline", message: "Calling generateManagerAddendum", level: "info", data: { sessionId } });
    const addendum = await generateManagerAddendum(context, language);
    Sentry.addBreadcrumb({ category: "ai_pipeline", message: "Addendum generated", level: "info", data: { sessionId, assessmentScore: addendum.assessmentScore } });

    // Step 6 — store summary + addendum
    await withTenantContext(tenantId, managerId, async (tx) => {
      await tx
        .update(sessions)
        .set({
          aiSummary: summary,
          aiManagerAddendum: addendum,
          aiAssessmentScore: addendum.assessmentScore,
          updatedAt: new Date(),
        })
        .where(eq(sessions.id, sessionId));
    });

    // Step 7 — generate action suggestions
    Sentry.addBreadcrumb({ category: "ai_pipeline", message: "Calling generateActionSuggestions", level: "info", data: { sessionId } });
    const suggestions = await generateActionSuggestions(context, summary, language);
    Sentry.addBreadcrumb({ category: "ai_pipeline", message: "Suggestions generated", level: "info", data: { sessionId, suggestionsCount: suggestions.suggestions.length } });

    // Step 8 — store suggestions
    await withTenantContext(tenantId, managerId, async (tx) => {
      await tx
        .update(sessions)
        .set({
          aiSuggestions: suggestions,
          updatedAt: new Date(),
        })
        .where(eq(sessions.id, sessionId));
    });

    // Step 9 — finalize
    const now = new Date();
    await withTenantContext(tenantId, managerId, async (tx) => {
      await tx
        .update(sessions)
        .set({
          aiStatus: "completed",
          aiCompletedAt: now,
          updatedAt: now,
        })
        .where(eq(sessions.id, sessionId));

      await logAuditEvent(tx, {
        tenantId,
        actorId: managerId,
        action: "ai_pipeline_completed",
        resourceType: "session",
        resourceId: sessionId,
        metadata: {
          summaryKeyTakeaways: summary.keyTakeaways.length,
          suggestionsCount: suggestions.suggestions.length,
          mode: "direct",
        },
      });
    });
    Sentry.addBreadcrumb({ category: "ai_pipeline", message: "Pipeline completed successfully", level: "info", data: { sessionId } });

    // Compute analytics snapshot (non-fatal)
    try {
      await withTenantContext(tenantId, managerId, async (tx) => {
        await computeSessionSnapshot(tx, sessionId, tenantId, reportId, seriesId);
      });
      console.log(`[AI Pipeline] Analytics snapshot computed for session ${sessionId}`);
    } catch (snapshotError) {
      console.error(`[AI Pipeline] Analytics snapshot failed for session ${sessionId}:`, snapshotError);
      Sentry.captureException(snapshotError, { tags: { pipeline_step: "analytics_snapshot" }, extra: { sessionId, tenantId } });
    }

    // Send post-session summary emails (non-fatal)
    try {
      await sendPostSessionSummaryEmails({
        sessionId,
        seriesId,
        tenantId,
        managerId,
        reportId,
      });
      console.log(`[AI Pipeline] Summary emails sent for session ${sessionId}`);
    } catch (emailError) {
      console.error(`[AI Pipeline] Summary email failed for session ${sessionId}:`, emailError);
      Sentry.captureException(emailError, { tags: { pipeline_step: "summary_email" }, extra: { sessionId, tenantId } });
    }

    console.log(`[AI Pipeline] Completed for session ${sessionId}`);
  } catch (error) {
    console.error(`[AI Pipeline] Failed for session ${sessionId}:`, error);

    // Report to Sentry with full context
    Sentry.captureException(error, {
      tags: { pipeline_step: "ai_generation" },
      extra: {
        sessionId,
        seriesId,
        tenantId,
        managerId,
        reportId,
        anthropicKeyPresent: !!process.env.ANTHROPIC_API_KEY,
      },
    });

    // Set status to failed
    try {
      await withTenantContext(tenantId, managerId, async (tx) => {
        await tx
          .update(sessions)
          .set({ aiStatus: "failed", updatedAt: new Date() })
          .where(eq(sessions.id, sessionId));
      });
    } catch (failError) {
      console.error("[AI Pipeline] Failed to set failed status:", failError);
      Sentry.captureException(failError, { tags: { pipeline_step: "set_failed_status" }, extra: { sessionId, tenantId } });
    }

    // Still send degraded summary email (without AI content)
    try {
      await sendPostSessionSummaryEmails({
        sessionId,
        seriesId,
        tenantId,
        managerId,
        reportId,
      });
    } catch (emailError) {
      console.error("[AI Pipeline] Summary email failed after AI failure:", emailError);
      Sentry.captureException(emailError, { tags: { pipeline_step: "degraded_email" }, extra: { sessionId, tenantId } });
    }
  }
}
