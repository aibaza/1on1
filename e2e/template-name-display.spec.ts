/**
 * E2E test: Template name visible on series cards and wizard header.
 */
import { test, expect } from "@playwright/test";

test.describe("Template name display", () => {
  test.beforeEach(({}, testInfo) => {
    if (testInfo.project.name.includes("member")) {
      test.skip();
    }
  });

  test("series cards show template name", async ({ page }) => {
    await page.goto("/sessions");
    await page.waitForLoadState("networkidle", { timeout: 15_000 });

    // Wait for cards to render
    await expect(page.locator("a[href*='/sessions/']").first()).toBeVisible({
      timeout: 10_000,
    });

    // At least one card should show a known seed template name
    const pageText = await page.textContent("body");
    const hasTemplateName =
      pageText?.includes("Weekly Check-in") ||
      pageText?.includes("Career Development") ||
      pageText?.includes("Structured 1:1") ||
      pageText?.includes("Check-in Săptămânal") ||
      pageText?.includes("Retrospectivă");

    expect(hasTemplateName).toBeTruthy();
  });

  test("wizard header shows template name", async ({ page }) => {
    // Find a session to open in wizard
    await page.goto("/sessions");
    await page.waitForLoadState("networkidle", { timeout: 15_000 });

    // Click Start or Resume on any card
    const actionBtn = page
      .getByRole("button", { name: /start|resume/i })
      .first();

    if (!(await actionBtn.isVisible().catch(() => false))) {
      test.skip(true, "No startable sessions found");
      return;
    }

    await actionBtn.click();
    await page.waitForURL(/\/wizard\//i, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    // The top bar should contain the template name
    const topBar = page.locator("div").filter({ hasText: /Session #\d+/ }).first();
    const topBarText = await topBar.textContent();

    const hasTemplateName =
      topBarText?.includes("Weekly Check-in") ||
      topBarText?.includes("Career Development") ||
      topBarText?.includes("Structured 1:1") ||
      topBarText?.includes("Check-in Săptămânal") ||
      topBarText?.includes("Retrospectivă");

    expect(hasTemplateName).toBeTruthy();
  });
});
