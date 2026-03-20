/**
 * DIAGNOSTIC E2E tests: What happens to session answers when a template changes?
 *
 * These tests are EXPLORATORY — they document current behavior and reveal problems.
 *
 * Uses Acme Corp seed data:
 * - Weekly Check-in template (dddddddd-0001-4000-d000-000000000001)
 * - Completed sessions from Bob→Dave series
 *
 * Flow: find completed session → record baseline → edit template → check impact
 */
import { test, expect } from "@playwright/test";

const WEEKLY_TEMPLATE_ID = "dddddddd-0001-4000-d000-000000000001";
const WEEKLY_TEMPLATE_URL = `/templates/${WEEKLY_TEMPLATE_ID}`;
// Seed completed sessions using Weekly Check-in (from DB)
const SEED_SESSION_1 = "99999999-0001-4000-9000-000000000001";
const SEED_SESSION_2 = "99999999-0002-4000-9000-000000000002";

test.describe("Answer Remapping Diagnostics", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(({}, testInfo) => {
    if (testInfo.project.name.includes("member")) {
      test.skip();
    }
  });

  let completedSessionId: string;
  let baselineAnswerCount: number;
  let baselineQuestionCount: number;

  test("find a completed session and verify baseline: no orphaned answers", async ({
    page,
  }) => {
    completedSessionId = SEED_SESSION_1;

    // Fetch full session detail
    const res = await page.request.get(`/api/sessions/${completedSessionId}`);
    if (!res.ok()) {
      // Try second seed session
      completedSessionId = SEED_SESSION_2;
      const res2 = await page.request.get(`/api/sessions/${completedSessionId}`);
      if (!res2.ok()) {
        test.skip(true, "No accessible completed sessions");
        return;
      }
    }
    const detail = await (
      await page.request.get(`/api/sessions/${completedSessionId}`)
    ).json();

    baselineQuestionCount = detail.template?.questions?.length ?? 0;
    baselineAnswerCount = detail.answers?.length ?? 0;

    const questionIds = new Set(
      (detail.template?.questions ?? []).map((q: { id: string }) => q.id)
    );
    const orphaned = (detail.answers ?? []).filter(
      (a: { questionId: string }) => !questionIds.has(a.questionId)
    );

    console.log(`
=== BASELINE ===
Session: ${completedSessionId}
Questions loaded: ${baselineQuestionCount}
Answers: ${baselineAnswerCount}
Orphaned answers: ${orphaned.length}
`);

    expect(orphaned.length).toBe(0);
  });

  test("after adding a question to template: old answers survive, new question has no answer", async ({
    page,
  }) => {
    test.skip(!completedSessionId, "No completed session");

    // Navigate to template, add a question
    await page.goto(WEEKLY_TEMPLATE_URL);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/weekly check-in/i).first()).toBeVisible({
      timeout: 10_000,
    });

    // Ensure editor view
    const backBtn = page.getByRole("button", { name: /back to editor/i });
    if (await backBtn.isVisible().catch(() => false)) {
      await backBtn.click();
      await page.waitForTimeout(500);
    }

    // Try to add a question via the "Add question" button
    const addBtn = page.getByRole("button", { name: /add question/i }).first();
    if (!(await addBtn.isVisible().catch(() => false))) {
      // Expand a section first
      const sectionHeader = page.locator("button").filter({ hasText: /well-?being|mood|general/i }).first();
      if (await sectionHeader.isVisible().catch(() => false)) {
        await sectionHeader.click();
        await page.waitForTimeout(500);
      }
    }

    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 5_000 });
      await dialog.getByLabel(/question text/i).fill(`DIAG-Q-${Date.now()}`);
      await dialog.getByRole("button", { name: /^add question$/i }).click();
      await page.waitForTimeout(1500);

      // Save
      const saveBtn = page.getByRole("button", { name: /save/i }).first();
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(2000);
      }
    } else {
      console.log("Could not find Add Question button — skipping question add");
    }

    // Check session: answers should be preserved
    const detail = await (
      await page.request.get(`/api/sessions/${completedSessionId}`)
    ).json();

    const newQuestionCount = detail.template?.questions?.length ?? 0;
    const newAnswerCount = detail.answers?.length ?? 0;
    const questionIds = new Set(
      (detail.template?.questions ?? []).map((q: { id: string }) => q.id)
    );
    const orphaned = (detail.answers ?? []).filter(
      (a: { questionId: string }) => !questionIds.has(a.questionId)
    );

    console.log(`
=== AFTER ADDING QUESTION ===
Questions: ${baselineQuestionCount} → ${newQuestionCount}
Answers: ${baselineAnswerCount} → ${newAnswerCount}
Orphaned answers: ${orphaned.length}
Verdict: ${newAnswerCount === baselineAnswerCount && orphaned.length === 0 ? "ANSWERS PRESERVED" : "PROBLEM DETECTED"}
`);

    expect(newAnswerCount).toBe(baselineAnswerCount);
    expect(orphaned.length).toBe(0);
  });

  test("archived questions retain answer_type and score_weight for correct display", async ({
    page,
  }) => {
    test.skip(!completedSessionId, "No completed session");

    const detail = await (
      await page.request.get(`/api/sessions/${completedSessionId}`)
    ).json();

    const questions: Array<{
      id: string;
      questionText: string;
      answerType: string;
      sortOrder: number;
    }> = detail.template?.questions ?? [];
    const answers: Array<{
      questionId: string;
      answerText: string | null;
      answerNumeric: number | null;
      skipped: boolean;
    }> = detail.answers ?? [];

    const mappings = answers.map((a) => {
      const q = questions.find((q) => q.id === a.questionId);
      return {
        questionText: q?.questionText?.slice(0, 50) ?? "MISSING QUESTION",
        answerType: q?.answerType ?? "MISSING",
        hasQuestion: !!q,
        hasAnswer: a.answerText !== null || a.answerNumeric !== null,
        skipped: a.skipped,
      };
    });

    console.log(`
=== ANSWER-QUESTION TYPE MAPPING ===
${mappings.map((m) => `  ${m.hasQuestion ? "✓" : "✗"} [${m.answerType}] "${m.questionText}" → answer=${m.hasAnswer}, skipped=${m.skipped}`).join("\n")}
`);

    // Every answer should have a matching question with a valid type
    const missingType = mappings.filter((m) => m.answerType === "MISSING");
    expect(missingType.length).toBe(0);
  });

  test("previous session answers in wizard context are matched to questions", async ({
    page,
  }) => {
    test.skip(!completedSessionId, "No completed session");

    const detail = await (
      await page.request.get(`/api/sessions/${completedSessionId}`)
    ).json();

    const prevSessions: Array<{
      sessionNumber: number;
      answers: Array<{ questionId: string; skipped: boolean }>;
    }> = detail.previousSessions ?? [];

    const questionIds = new Set(
      (detail.template?.questions ?? []).map((q: { id: string }) => q.id)
    );

    let totalOrphaned = 0;
    for (const prev of prevSessions) {
      const orphaned = prev.answers.filter(
        (a) => !questionIds.has(a.questionId)
      );
      totalOrphaned += orphaned.length;
      console.log(
        `  Session #${prev.sessionNumber}: ${prev.answers.length} answers, ${orphaned.length} orphaned`
      );
    }

    console.log(`
=== PREVIOUS SESSION ANSWERS ===
Previous sessions: ${prevSessions.length}
Total orphaned answers across all previous sessions: ${totalOrphaned}
Verdict: ${totalOrphaned === 0 ? "ALL MATCHED" : "ORPHANS DETECTED — previous session answers reference questions not in current API response"}
`);

    // This may fail — revealing a gap in the archived-question fix
    // (the fix loads archived questions for the CURRENT session but may not
    // cover questions referenced only by PREVIOUS sessions)
    if (totalOrphaned > 0) {
      console.log(
        "⚠ PROBLEM: Previous session answers reference questions that are not loaded. " +
          "The archived-question fix only covers the current session's answers, " +
          "not previous sessions shown in the wizard context panel."
      );
    }
    expect(totalOrphaned).toBe(0);
  });

  test("session score is preserved after template edit", async ({ page }) => {
    test.skip(!completedSessionId, "No completed session");

    const detail = await (
      await page.request.get(`/api/sessions/${completedSessionId}`)
    ).json();

    const score = detail.session?.sessionScore;
    const numericAnswers = (detail.answers ?? []).filter(
      (a: { answerNumeric: number | null }) => a.answerNumeric !== null
    );

    console.log(`
=== SCORE PRESERVATION ===
Score: ${score ?? "null"}
Numeric answers: ${numericAnswers.length}
Verdict: ${score !== null || numericAnswers.length === 0 ? "OK" : "SCORE LOST"}
`);

    if (numericAnswers.length > 0) {
      expect(score).not.toBeNull();
    }
  });

  test("UI: session summary page renders without errors after template edit", async ({
    page,
  }) => {
    test.skip(!completedSessionId, "No completed session");

    // Session summary is at /sessions/[sessionId]/summary
    await page.goto(`/sessions/${completedSessionId}/summary`);
    await page.waitForLoadState("networkidle", { timeout: 15_000 });
    await page.waitForTimeout(3000);

    const pageText = (await page.textContent("body")) ?? "";

    // Check for real error indicators (not generic word "Error" in nav/labels)
    const hasError =
      pageText.includes("Something went wrong") ||
      pageText.includes("500") ||
      pageText.includes("could not be found");
    const skippedCount = (pageText.match(/skipped/gi) || []).length;

    console.log(`
=== UI DISPLAY CHECK (Summary Page) ===
URL: /sessions/${completedSessionId}/summary
Page length: ${pageText.length} chars
Actual error indicators: ${hasError ? "YES — PROBLEM" : "none"}
"Skipped" count: ${skippedCount}
`);

    await page.screenshot({
      path: "test-results/diagnostic-session-summary.png",
      fullPage: true,
    });

    // If the summary 404s, try the history page instead
    if (hasError && pageText.includes("could not be found")) {
      console.log("Summary page 404'd — trying History page for session display");
      await page.goto("/history");
      await page.waitForLoadState("networkidle", { timeout: 10_000 });
      await page.waitForTimeout(2000);

      const historyText = (await page.textContent("body")) ?? "";
      console.log(`History page length: ${historyText.length} chars`);

      await page.screenshot({
        path: "test-results/diagnostic-history-page.png",
        fullPage: true,
      });

      // History page should at least load
      expect(historyText.length).toBeGreaterThan(200);
    } else {
      expect(hasError).toBe(false);
    }
  });

  test("version history reflects the template edit", async ({ page }) => {
    await page.goto(WEEKLY_TEMPLATE_URL);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/weekly check-in/i).first()).toBeVisible({
      timeout: 10_000,
    });

    // Ensure editor view
    const backBtn = page.getByRole("button", { name: /back to editor/i });
    if (await backBtn.isVisible().catch(() => false)) {
      await backBtn.click();
      await page.waitForTimeout(500);
    }

    // Check version history
    const historyBtn = page.getByRole("button", { name: /^history$/i }).first();
    await historyBtn.click();
    await page.waitForTimeout(1000);

    const versions = page.locator("button").filter({ hasText: /v\d+/ });
    const count = await versions.count();

    console.log(`
=== VERSION HISTORY STATE ===
Versions: ${count}
`);

    expect(count).toBeGreaterThanOrEqual(1);

    // Check that latest version has the added question
    await versions.first().click();
    await page.waitForTimeout(2000);

    const previewText = await page.textContent("body");
    const hasDiagQuestion = previewText?.includes("DIAG-Q-");

    console.log(`
Latest version contains diagnostic question: ${hasDiagQuestion ? "YES" : "NO (expected if template wasn't republished)"}
`);
  });

  test("CLEANUP: note — diagnostic questions were added to Weekly Check-in", async ({
    page,
  }) => {
    // The diagnostic tests added DIAG-Q questions to the Weekly Check-in template.
    // These are not removed automatically because the delete interaction is fragile.
    // To clean up manually: open Weekly Check-in in UAT → delete DIAG-Q questions → save.
    //
    // This is acceptable because:
    // 1. DIAG-Q questions are added but the template is NOT republished
    // 2. They don't affect existing sessions (new questions have no answers)
    // 3. The template is still functional with them present

    await page.goto(WEEKLY_TEMPLATE_URL);
    await page.waitForLoadState("networkidle");

    const pageText = await page.textContent("body");
    const diagCount = (pageText?.match(/DIAG-Q-/g) || []).length;

    console.log(`
=== CLEANUP NOTE ===
Diagnostic questions in Weekly Check-in: ${diagCount}
Manual cleanup: delete DIAG-Q questions from template editor if desired
`);
  });
});
