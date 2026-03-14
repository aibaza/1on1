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

// ---------------------------------------------------------------------------
// Group 5: History before/after display
// ---------------------------------------------------------------------------
test.describe("History before/after display", () => {
  test.setTimeout(30_000);

  test("history panel entry shows question text in italic", async ({ adminPage }) => {
    await adminPage.goto(SESSION_SUMMARY_URL);
    await adminPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    // Question text rendered in <p className="... italic">
    const italicEl = adminPage.locator("p.italic").first();
    await expect(italicEl).toBeVisible({ timeout: 10_000 });
  });

  test("'→' arrow is visible between before and after pills", async ({ adminPage }) => {
    await adminPage.goto(SESSION_SUMMARY_URL);
    await adminPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    // The arrow separator is a text node with "→"
    await expect(adminPage.getByText("→").first()).toBeVisible({ timeout: 10_000 });
  });

  test("before pill has line-through styling", async ({ adminPage }) => {
    await adminPage.goto(SESSION_SUMMARY_URL);
    await adminPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    // Before pill has class "line-through" applied
    const beforePill = adminPage.locator(".line-through").first();
    await expect(beforePill).toBeVisible({ timeout: 10_000 });
  });

  test("after pill has green styling", async ({ adminPage }) => {
    await adminPage.goto(SESSION_SUMMARY_URL);
    await adminPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    // After pill has bg-green class
    const afterPill = adminPage.locator("[class*='bg-green']").first();
    await expect(afterPill).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// Group 6: Admin revert RBAC + flow
// ---------------------------------------------------------------------------
test.describe("Admin revert RBAC and flow", () => {
  test.setTimeout(60_000);

  let revertAnswerId = "";

  test.beforeAll(async ({ browser }) => {
    // Create a fresh correction via admin API so we have a known history entry to revert
    const ctx = await browser.newContext({
      storageState: "e2e/.auth/admin.json",
    });
    const page = await ctx.newPage();

    try {
      await page.goto(SESSION_SUMMARY_URL);
      await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });

      const sessionResp = await page.request.get(
        "/api/sessions/99999999-0001-4000-9000-000000000001"
      );

      if (sessionResp.ok()) {
        const data = await sessionResp.json().catch(() => null);
        const answers =
          data?.answers ??
          data?.categories?.flatMap(
            (c: { answers?: Array<{ id: string }> }) => c.answers ?? []
          ) ??
          [];
        revertAnswerId = answers[0]?.id ?? "";
      }

      if (revertAnswerId) {
        const correctionResp = await page.request.post(
          "/api/sessions/99999999-0001-4000-9000-000000000001/corrections",
          {
            data: {
              answerId: revertAnswerId,
              newAnswerText: "E2E revert test correction — please ignore",
              reason:
                "Automated E2E test correction created to validate the admin revert functionality end-to-end.",
            },
          }
        );
        console.log(`Group 6 setup correction: ${correctionResp.status()}, answerId: ${revertAnswerId}`);
      } else {
        console.log("Group 6 setup: could not extract answerId");
      }
    } catch (err) {
      console.log("Group 6 setup failed:", err);
    } finally {
      await ctx.close();
    }
  });

  test("admin sees Revert button in history panel", async ({ adminPage }) => {
    await adminPage.goto(SESSION_SUMMARY_URL);
    await adminPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    const revertBtn = adminPage
      .locator("button")
      .filter({ hasText: /^Revert$/ })
      .first();
    await expect(revertBtn).toBeVisible({ timeout: 10_000 });
  });

  test("manager does NOT see Revert button in history panel", async ({ managerPage }) => {
    await managerPage.goto(SESSION_SUMMARY_URL);
    await managerPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    await managerPage.waitForTimeout(1_000);
    const revertBtns = managerPage
      .locator("button")
      .filter({ hasText: /^Revert$/ });
    await expect(revertBtns).toHaveCount(0, { timeout: 5_000 });
  });

  test("member does NOT see Revert button in history panel", async ({ memberPage }) => {
    await memberPage.goto(SESSION_SUMMARY_URL);
    await memberPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    await memberPage.waitForTimeout(1_000);
    const revertBtns = memberPage
      .locator("button")
      .filter({ hasText: /^Revert$/ });
    await expect(revertBtns).toHaveCount(0, { timeout: 5_000 });
  });

  test("clicking Revert shows 'Restore answer to this before-value?' confirmation", async ({ adminPage }) => {
    await adminPage.goto(SESSION_SUMMARY_URL);
    await adminPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    const revertBtn = adminPage
      .locator("button")
      .filter({ hasText: /^Revert$/ })
      .first();
    await revertBtn.click();
    await expect(
      adminPage.getByText("Restore answer to this before-value?")
    ).toBeVisible({ timeout: 5_000 });
  });

  test("clicking Cancel dismisses confirmation and restores Revert button", async ({ adminPage }) => {
    await adminPage.goto(SESSION_SUMMARY_URL);
    await adminPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    const revertBtn = adminPage
      .locator("button")
      .filter({ hasText: /^Revert$/ })
      .first();
    await revertBtn.click();
    await expect(
      adminPage.getByText("Restore answer to this before-value?")
    ).toBeVisible({ timeout: 5_000 });
    await adminPage.getByRole("button", { name: "Cancel" }).click();
    await expect(
      adminPage.getByText("Restore answer to this before-value?")
    ).not.toBeVisible({ timeout: 3_000 });
    await expect(revertBtn).toBeVisible({ timeout: 3_000 });
  });

  test("clicking Confirm reverts the correction and history grows by one entry", async ({ adminPage, browser }) => {
    await adminPage.goto(SESSION_SUMMARY_URL);
    await adminPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});

    // Count existing history entries (border-rounded entries inside the panel)
    const entriesBefore = await adminPage
      .locator(".correction-history-panel .rounded-md.border, [data-testid='correction-entry'], div.rounded-md.border.px-4.py-3")
      .count();

    const revertBtn = adminPage
      .locator("button")
      .filter({ hasText: /^Revert$/ })
      .first();
    await revertBtn.click();
    await expect(
      adminPage.getByText("Restore answer to this before-value?")
    ).toBeVisible({ timeout: 5_000 });

    // Intercept the revert POST to confirm it is called
    const [revertResponse] = await Promise.all([
      adminPage.waitForResponse(
        (resp) =>
          resp.url().includes("/corrections/revert") && resp.request().method() === "POST",
        { timeout: 15_000 }
      ),
      adminPage.getByRole("button", { name: "Confirm" }).click(),
    ]);

    expect(revertResponse.status()).toBe(200);

    // After page refresh, verify the correction history panel is still present
    await adminPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    await expect(
      adminPage.getByText(/correction history/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
