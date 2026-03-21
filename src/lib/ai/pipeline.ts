import * as Sentry from "@sentry/nextjs";
import { gatherSessionContext } from "./context";
import { generateUnifiedOutput } from "./service";
import { withTenantContext } from "@/lib/db/tenant-context";
import { logAuditEvent } from "@/lib/audit/log";
import { computeSessionSnapshot } from "@/lib/analytics/compute";
import { sendPostSessionSummaryEmails } from "@/lib/notifications/summary-email";
import { sessions, tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { AISummary } from "./schemas/summary";
import type { AIManagerAddendum } from "./schemas/addendum";
import type { AIActionSuggestions } from "./schemas/action-items";

interface PipelineInput {
  sessionId: string;
  seriesId: string;
  tenantId: string;
  managerId: string;
  reportId: string;
}

/**
 * Run the post-session AI pipeline — single unified LLM call.
 *
 * This is a fire-and-forget function — call it without await.
 * It handles its own error handling and sets aiStatus to "failed" on error.
 */
export async function runAIPipelineDirect(input: PipelineInput): Promise<void> {
  const { sessionId, seriesId, tenantId, managerId, reportId } = input;

  Sentry.setContext("ai_pipeline", { sessionId, seriesId, tenantId, managerId, reportId });
  Sentry.captureMessage(`[AI Pipeline] Invoked for session ${sessionId}`, "info");

  try {
    // Step 1 — set status to generating
    Sentry.addBreadcrumb({ category: "ai_pipeline", message: "Starting: setting status to generating", level: "info", data: { sessionId } });
    await withTenantContext(tenantId, managerId, async (tx) => {
      await tx
        .update(sessions)
        .set({ aiStatus: "generating", updatedAt: new Date() })
        .where(eq(sessions.id, sessionId));
    });

    // Step 2 — gather context (includes company context, team context, full history)
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

    // Step 4 — single unified AI call
    Sentry.addBreadcrumb({ category: "ai_pipeline", message: "Calling generateUnifiedOutput", level: "info", data: { sessionId } });
    const unified = await generateUnifiedOutput(context, language);
    Sentry.addBreadcrumb({ category: "ai_pipeline", message: "Unified output generated", level: "info", data: {
      sessionId,
      keyTakeaways: unified.metrics.keyTakeaways.length,
      objectiveRating: unified.metrics.objectiveRating,
      suggestionsCount: unified.publicSummary.suggestions.length,
    } });

    // Step 5 — map unified output to existing storage columns (backward compatible)
    const summaryForStorage: AISummary = {
      cardBlurb: unified.publicSummary.cardBlurb,
      keyTakeaways: unified.metrics.keyTakeaways,
      discussionHighlights: unified.publicSummary.discussionHighlights,
      followUpItems: unified.publicSummary.followUpItems,
      overallSentiment: unified.metrics.overallSentiment,
    };

    const addendumForStorage: AIManagerAddendum = {
      sentimentAnalysis: unified.managerAddendum.sentimentAnalysis,
      patterns: unified.managerAddendum.patterns,
      coachingSuggestions: unified.managerAddendum.coachingSuggestions,
      followUpPriority: unified.managerAddendum.followUpPriority,
    };

    const suggestionsForStorage: AIActionSuggestions = {
      suggestions: unified.publicSummary.suggestions,
    };

    // Step 6 — single DB write
    const now = new Date();
    await withTenantContext(tenantId, managerId, async (tx) => {
      await tx
        .update(sessions)
        .set({
          aiSummary: summaryForStorage,
          aiManagerAddendum: addendumForStorage,
          aiSuggestions: suggestionsForStorage,
          aiAssessmentScore: unified.metrics.objectiveRating,
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
          keyTakeaways: unified.metrics.keyTakeaways.length,
          suggestionsCount: unified.publicSummary.suggestions.length,
          objectiveRating: unified.metrics.objectiveRating,
          mode: "unified",
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
  } finally {
    await Sentry.flush(3000);
  }
}
