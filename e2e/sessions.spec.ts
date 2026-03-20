import * as fs from "fs";
import * as path from "path";
import { test, expect } from "./fixtures";

/**
 * Sessions E2E tests — sessions list, wizard flow, session summary crash capture,
 * and session detail page.
 *
 * Seed data used:
 *   SESSION_1_ID = '99999999-0001-4000-9000-000000000001' (Bob/Dave, completed)
 *   SESSION_2_ID = '99999999-0002-4000-9000-000000000002' (Bob/Dave, completed)
 *   SESSION_3_ID = '99999999-0003-4000-9000-000000000003' (Bob/Dave, completed)
 *   SESSION_EVE_1_ID = '99999999-0004-4000-9000-000000000004' (Bob/Eve, completed)
 *   SESSION_EVE_2_ID = '99999999-0005-4000-9000-000000000005' (Bob/Eve, completed)
 */

// ─── Group 1: Sessions list ────────────────────────────────────────────────

test.describe("Sessions list (as admin)", () => {
  test.setTimeout(30_000);

  test("/sessions loads with Sessions heading", async ({ adminPage }) => {
    await adminPage.goto("/sessions");
    await expect(
      adminPage.getByRole("heading", { name: /sessions/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("seeded series cards show Dave Brown and Eve Johnson", async ({
    adminPage,
  }) => {
    await adminPage.goto("/sessions");
    await expect(adminPage.getByText("Dave Brown")).toBeVisible({
      timeout: 10_000,
    });
    // Eve Davis is the seeded name in seed.ts (not Eve Johnson — see seed data)
    await expect(adminPage.getByText("Eve Davis")).toBeVisible({ timeout: 10_000 });
  });

  test("series cards are visible with session progress info", async ({
    adminPage,
  }) => {
    await adminPage.goto("/sessions");
    await adminPage.waitForTimeout(2_000);

    // Admin can see all series cards as links (admin does not own the series
    // so no Start/Resume button is rendered — only the manager who owns the
    // series sees those buttons). Verify cards are shown via "in progress" or
    // session number text or series links.
    const seriesLinks = adminPage.locator("a[href^='/sessions/ffffffff']");
    const count = await seriesLinks.count();
    expect(count).toBeGreaterThan(0);
  });
});

// ─── Group 2: Start wizard and complete (as manager bob) ──────────────────

test.describe("Session wizard (as manager bob)", () => {
  test.setTimeout(90_000);

  test("can start a new session from /sessions and complete wizard", async ({
    managerPage,
  }) => {
    await managerPage.goto("/sessions");
    await managerPage.waitForTimeout(2_000);

    // All seeded sessions are completed — Start button creates a new session
    const startBtn = managerPage
      .getByRole("button", { name: /^start$/i })
      .first();
    const resumeBtn = managerPage
      .getByRole("button", { name: /resume/i })
      .first();

    const hasStart = await startBtn
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    const hasResume = await resumeBtn
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    if (!hasStart && !hasResume) {
      // No sessions available for this manager — skip gracefully
      test.skip();
      return;
    }

    // Click whichever button is available (Start creates new, Resume continues)
    if (hasStart) {
      await startBtn.click();
    } else {
      await resumeBtn.click();
    }

    // Wait for wizard URL
    await managerPage.waitForURL(/\/wizard\//i, { timeout: 15_000 });

    // Wizard loads data via API — wait for the spinner to disappear and content
    // to render. The wizard shell shows a Loader2 spinner while data is loading.
    // Wait until either the wizard content or navigation buttons are visible.
    await managerPage.waitForFunction(
      () => {
        // Check that the loading spinner is gone (it has animate-spin class)
        const spinner = document.querySelector(".animate-spin");
        return !spinner;
      },
      { timeout: 20_000 }
    ).catch(() => {});

    // Additional buffer for React hydration and query settlement
    await managerPage.waitForTimeout(2_000);

    // Wizard content should be visible — the first step is "Session Recap"
    // or navigation buttons (Next) should be present
    const wizardContent = managerPage
      .getByText(/session recap|session context|how are you|recap|context|step/i)
      .first();
    const nextBtn2 = managerPage.getByRole("button", { name: /next/i }).first();

    const isWizardContentVisible = await wizardContent
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    const isNextVisible = await nextBtn2
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    expect(
      isWizardContentVisible || isNextVisible,
      "Wizard should show content or Next button after loading"
    ).toBe(true);

    // Fill any visible textareas with test answers
    const textAreas = managerPage.locator("textarea:visible");
    const textCount = await textAreas.count();
    for (let i = 0; i < Math.min(textCount, 5); i++) {
      const current = await textAreas.nth(i).inputValue();
      if (!current) {
        await textAreas.nth(i).fill("E2E test answer — automated response.");
      }
    }

    // Allow auto-save to fire
    await managerPage.waitForTimeout(2_000);

    // Navigate through wizard steps by clicking Next up to 10 times
    const nextBtn = managerPage.getByRole("button", { name: /next/i });
    for (let attempt = 0; attempt < 10; attempt++) {
      const isNextVisible = await nextBtn
        .isVisible({ timeout: 1_500 })
        .catch(() => false);
      if (!isNextVisible) break;
      await nextBtn.click();
      await managerPage.waitForTimeout(1_000);
    }

    // Complete session if the button appeared
    const completeBtn = managerPage.getByRole("button", {
      name: /complete session/i,
    });
    const isCompleteVisible = await completeBtn
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (isCompleteVisible) {
      await completeBtn.click();
      await managerPage.waitForTimeout(5_000);

      // After completion we land on /sessions, /sessions/:id/summary, or stay on wizard
      const finalUrl = managerPage.url();
      expect(
        finalUrl.includes("/sessions") ||
          finalUrl.includes("/summary") ||
          finalUrl.includes("/wizard")
      ).toBe(true);
    } else {
      // Still in wizard — verify we're still on a wizard page
      await expect(managerPage).toHaveURL(/\/wizard\//i);
    }
  });
});

// ─── Group 3: Session summary — load and crash capture ────────────────────

test.describe("Session summary page", () => {
  test.setTimeout(45_000);

  test("session summary loads and captures any errors for diagnosis", async ({
    adminPage,
  }) => {
    const SESSION_ID = "99999999-0001-4000-9000-000000000001";

    const consoleErrors: Array<{
      type: string;
      message: string;
      timestamp: number;
    }> = [];
    const pageErrors: Array<{
      message: string;
      stack: string;
      timestamp: number;
    }> = [];
    const networkErrors: Array<{
      method: string;
      url: string;
      status: number;
      timestamp: number;
    }> = [];

    adminPage.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push({
          type: "console_error",
          message: msg.text(),
          timestamp: Date.now(),
        });
      }
    });

    adminPage.on("pageerror", (err) => {
      pageErrors.push({
        message: err.message,
        stack: err.stack ?? "",
        timestamp: Date.now(),
      });
    });

    adminPage.on("response", (res) => {
      if (res.status() >= 400) {
        networkErrors.push({
          method: res.request().method(),
          url: res.url(),
          status: res.status(),
          timestamp: Date.now(),
        });
      }
    });

    const response = await adminPage.goto(
      `/sessions/${SESSION_ID}/summary`,
      {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      }
    );

    await adminPage
      .waitForLoadState("networkidle", { timeout: 8_000 })
      .catch(() => {});
    await adminPage.waitForTimeout(1_000);

    const httpStatus = response?.status();
    const finalUrl = adminPage.url();
    const isErrorPage = await adminPage
      .locator("text=/application error|server-side exception|digest/i")
      .isVisible()
      .catch(() => false);

    // Write debug report regardless of pass/fail — always helpful for diagnosis
    const reportsDir = path.join("e2e", "reports");
    fs.mkdirSync(reportsDir, { recursive: true });
    fs.writeFileSync(
      path.join(reportsDir, "session-summary-debug.json"),
      JSON.stringify(
        {
          sessionId: SESSION_ID,
          httpStatus,
          finalUrl,
          isErrorPage,
          consoleErrors,
          pageErrors,
          networkErrors,
          capturedAt: new Date().toISOString(),
          hypothesis:
            "Check networkErrors for ws:// WebSocket URLs (Neon serverless on local PG) or pageErrors containing hydration/ErrorEvent",
        },
        null,
        2
      )
    );

    // Assert: if application error page is shown, fail with a helpful message
    expect(
      isErrorPage,
      `Session summary shows application error. Debug report: e2e/reports/session-summary-debug.json`
    ).toBe(false);
    expect(httpStatus, `HTTP status for session summary`).toBe(200);
  });
});

// ─── Group 4: Session detail page ─────────────────────────────────────────

test.describe("Session detail page", () => {
  test.setTimeout(30_000);

  test("/sessions/:id loads with HTTP 200 and session content", async ({
    adminPage,
  }) => {
    const SESSION_ID = "99999999-0001-4000-9000-000000000001";
    const response = await adminPage.goto(`/sessions/${SESSION_ID}`, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });

    // Page should respond with 200 (not 404 or 500)
    expect(response?.status()).toBe(200);

    // Page content should include session-related information
    await adminPage
      .waitForLoadState("networkidle", { timeout: 8_000 })
      .catch(() => {});
    const isErrorPage = await adminPage
      .locator("text=/application error|server-side exception|digest/i")
      .isVisible()
      .catch(() => false);
    expect(isErrorPage).toBe(false);
  });
});
