/**
 * Verification screenshots for unified AI pipeline changes.
 * Run: npx playwright test e2e/verify-unified-ai.spec.ts --project=debug-uat
 */
import { test, expect } from "@playwright/test";

const BASE_URL = "https://1on1.surmont.co";
const ADMIN_STORAGE = "e2e/.auth-uat/admin.json";

test.use({ storageState: ADMIN_STORAGE, baseURL: BASE_URL });

test("company settings - Internal Manifesto card visible", async ({ page }) => {
  await page.goto("/settings/company");
  await page.waitForLoadState("networkidle");

  // Scroll to bottom to see the manifesto card
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);

  await page.screenshot({
    path: "e2e/screenshots/unified-ai-company-settings.png",
    fullPage: true,
  });

  // Verify the manifesto card exists
  const manifestoCard = page.getByText(/Internal Manifesto|Manifest intern/i);
  await expect(manifestoCard).toBeVisible({ timeout: 5000 });
});

test("company settings - manifesto textarea has seed data", async ({ page }) => {
  await page.goto("/settings/company");
  await page.waitForLoadState("networkidle");

  // Check textarea has the seed company context
  const textarea = page.locator("#company-context");
  await expect(textarea).toBeVisible({ timeout: 5000 });
  const value = await textarea.inputValue();
  expect(value).toContain("Acme Corp");
});

test("dashboard - recent sessions with sentiment borders", async ({ page }) => {
  await page.goto("/overview");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: "e2e/screenshots/unified-ai-dashboard.png",
    fullPage: true,
  });
});

test("series detail - session history cards", async ({ page }) => {
  // Navigate to sessions list first
  await page.goto("/sessions");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: "e2e/screenshots/unified-ai-sessions-list.png",
    fullPage: true,
  });

  // Click on "Dave Brown" series card to see session history
  const daveCard = page.getByText("Dave Brown").first();
  if (await daveCard.isVisible()) {
    await daveCard.click();
    await page.waitForURL(/\/sessions\/[a-f0-9-]+$/);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: "e2e/screenshots/unified-ai-series-detail.png",
      fullPage: true,
    });
  }
});

test("session summary - AI output display", async ({ page }) => {
  // Find a completed session with AI summary
  await page.goto("/history");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // Click on first history item
  const firstItem = page.locator("a[href*='/summary']").first();
  if (await firstItem.isVisible()) {
    await firstItem.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: "e2e/screenshots/unified-ai-session-summary.png",
      fullPage: true,
    });
  }
});

test("sparklines on series cards", async ({ page }) => {
  await page.goto("/sessions");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Take a zoomed screenshot of the first series card
  const firstCard = page.locator("[class*='group relative']").first();
  if (await firstCard.isVisible()) {
    await firstCard.screenshot({
      path: "e2e/screenshots/unified-ai-sparkline-card.png",
    });
  }
});
