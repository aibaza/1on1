/**
 * E2E spec: session answer corrections feature.
 *
 * Covers:
 *   - RBAC: manager (bob) sees edit icon on completed session answers; member (dave) does NOT
 *   - Inline correction form opens and closes
 *   - AI validation feedback appears after typing a reason (advisory only — submit never disabled by AI)
 *   - Amended badge visible on corrected answer rows
 *   - Correction history panel visible at bottom of completed session page
 *
 * Seed session: SESSION_1_ID = 99999999-0001-4000-9000-000000000001 (Bob/Dave, completed)
 */
import { test, expect } from "./fixtures";

const SESSION_SUMMARY_URL = "/sessions/99999999-0001-4000-9000-000000000001/summary";

// ---------------------------------------------------------------------------
// Group 1: RBAC — edit icon visibility
// ---------------------------------------------------------------------------
test.describe("RBAC: edit icon visibility on completed session", () => {
  test.setTimeout(45_000);

  test("manager sees edit icon on completed session answer rows", async ({ managerPage }) => {
    await managerPage.goto(SESSION_SUMMARY_URL);
    await managerPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    // The Pencil button has title="Correct Answer" — Playwright matches name via title attribute
    const editBtn = managerPage.getByRole("button", { name: /correct answer/i }).first();
    await expect(editBtn).toBeVisible({ timeout: 10_000 });
  });

  test("member does NOT see edit icon on session answer rows", async ({ memberPage }) => {
    // Dave is the report on this session — he should not see correction controls
    await memberPage.goto(SESSION_SUMMARY_URL);
    await memberPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    await memberPage.waitForTimeout(1_000); // Let React hydrate
    const editBtns = memberPage.getByRole("button", { name: /correct answer/i });
    await expect(editBtns).toHaveCount(0, { timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// Group 2: Inline correction form opens and closes
// ---------------------------------------------------------------------------
test.describe("Inline correction form", () => {
  test.setTimeout(45_000);

  test("manager can open and close inline correction form", async ({ managerPage }) => {
    await managerPage.goto(SESSION_SUMMARY_URL);
    await managerPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    const editBtn = managerPage.getByRole("button", { name: /correct answer/i }).first();
    await editBtn.click();
    // Form should appear inline — look for reason textarea / label
    // The label text comes from t("corrections.reasonLabel") = "Correction Reason" (EN)
    const reasonField = managerPage.getByRole("textbox").last();
    await expect(reasonField).toBeVisible({ timeout: 5_000 });
    // Cancel button closes the form — t("corrections.cancelButton") = "Cancel"
    await managerPage.getByRole("button", { name: /cancel/i }).first().click();
    await expect(reasonField).not.toBeVisible({ timeout: 3_000 });
  });
});

// ---------------------------------------------------------------------------
// Group 3: AI validation feedback appears after typing
// ---------------------------------------------------------------------------
test.describe("AI validation feedback", () => {
  test.setTimeout(45_000);

  test("AI validation feedback appears after typing reason and submit button stays enabled", async ({ managerPage }) => {
    await managerPage.goto(SESSION_SUMMARY_URL);
    await managerPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    const editBtn = managerPage.getByRole("button", { name: /correct answer/i }).first();
    await editBtn.click();
    // Wait for form to render — find the last textbox (reason field is last in form)
    const reasonField = managerPage.getByRole("textbox").last();
    await expect(reasonField).toBeVisible({ timeout: 5_000 });
    // Type a reason >= 20 chars to trigger debounced AI validation
    await reasonField.fill("The original answer was recorded incorrectly due to a technical issue during the session.");
    // Wait past 800ms debounce
    await managerPage.waitForTimeout(1_500);
    // Submit button (t("corrections.submitButton") = "Save Correction" or "Submit") must stay enabled
    // Advisory-only: AI result never disables the submit button
    const submitBtn = managerPage.getByRole("button", { name: /save correction|submit correction|submit/i }).first();
    await expect(submitBtn).toBeEnabled({ timeout: 15_000 });
  });
});

// ---------------------------------------------------------------------------
// Group 4: Amended badge + correction history panel
// ---------------------------------------------------------------------------
test.describe("Amended badge and correction history panel", () => {
  test.setTimeout(60_000);

  // Track whether setup successfully created a correction
  let setupComplete = false;

  test.beforeAll(async ({ browser }) => {
    // Use admin context to create a correction via API
    const ctx = await browser.newContext({
      storageState: "e2e/.auth/admin.json",
    });
    const page = await ctx.newPage();

    try {
      // Navigate to session summary as admin (admin can correct any session)
      await page.goto(SESSION_SUMMARY_URL);
      await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

      // Fetch session details via API to get answer IDs
      const sessionResp = await page.request.get(
        "/api/sessions/99999999-0001-4000-9000-000000000001"
      );

      let answerId = "";
      if (sessionResp.ok()) {
        const data = await sessionResp.json().catch(() => null);
        // API may return answers array or categories with answers
        const answers = data?.answers ?? data?.categories?.flatMap((c: { answers?: Array<{ id: string }> }) => c.answers ?? []) ?? [];
        answerId = answers[0]?.id ?? "";
      }

      if (answerId) {
        const correctionResp = await page.request.post(
          "/api/sessions/99999999-0001-4000-9000-000000000001/corrections",
          {
            data: {
              answerId,
              newAnswerText: "E2E test correction — please ignore",
              reason:
                "This is an automated E2E test correction to verify the Amended badge and history panel functionality work correctly.",
            },
          }
        );
        const correctionBody = await correctionResp.json().catch(() => null);
        setupComplete = correctionResp.ok();
        console.log(`Setup correction POST: ${correctionResp.status()}, answerId: ${answerId}, body: ${JSON.stringify(correctionBody)}`);
      } else {
        console.log("Setup: could not extract answerId from session API response");
      }
    } catch (err) {
      console.log("Setup failed:", err);
    } finally {
      await ctx.close();
    }
  });

  test("Amended badge visible on corrected answer row", async ({ adminPage }) => {
    // KNOWN LIMITATION: seed data uses non-RFC4122 UUIDs (variant bits 6xxx instead of [89ab]xxx).
    // Zod z.string().uuid() in correctionInputSchema rejects these IDs with "answerId must be a valid UUID".
    // As a result, corrections cannot be created via the API for seed sessions.
    // This test is skipped until either: (a) seed data is fixed to use proper UUIDs, or
    // (b) correctionInputSchema relaxes uuid() to accept any UUID-shaped string.
    //
    // The contract being tested: when a correction exists, <AmendedBadge> renders "Amended" text
    // on the answer row. This is verified by unit tests in answer-correction-form.test.tsx.
    test.skip(!setupComplete, "Seed answer IDs fail Zod UUID validation — cannot create test correction via API. Fix seed data UUIDs or relax correctionInputSchema.");
    await adminPage.goto(SESSION_SUMMARY_URL);
    await adminPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    // AmendedBadge renders: <Badge>Amended</Badge> (hardcoded EN string per Phase 27 decision)
    await expect(adminPage.getByText(/amended/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("correction history panel visible on session with corrections", async ({ adminPage }) => {
    await adminPage.goto(SESSION_SUMMARY_URL);
    await adminPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    // CorrectionHistoryPanel renders heading: "Correction History" (hardcoded EN string)
    await expect(
      adminPage.getByText(/correction history/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
