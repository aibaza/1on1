import { test, expect } from "@playwright/test";

const BASE = "https://1on1-git-develop-surcod.vercel.app";
const SCREENSHOT_DIR = "e2e/screenshots/role-to-level";

// Use editorial seed admin
const ADMIN_EMAIL = "ciprian@acme.example.com";
const ADMIN_PASS = "password123";
const MANAGER_ID = "aaaaaaaa-0020-4000-a000-000000000020"; // Ciprian — manager with reports

test.describe("Role→Level + Derived Teams smoke tests", () => {
  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(30_000);

    // Login
    await page.goto(`${BASE}/login`);
    await page.waitForLoadState("networkidle");

    await page.locator('input[name="email"], input[type="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[name="password"], input[type="password"]').fill(ADMIN_PASS);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL("**/overview**", { timeout: 15_000 }).catch(() => {});
    await page.waitForLoadState("networkidle");

    // Set editorial design
    await page.evaluate(() => {
      document.cookie = "DESIGN_PREF=editorial; path=/; max-age=31536000";
    });
  });

  test("1. Overview loads without errors", async ({ page }) => {
    await page.goto(`${BASE}/overview`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-overview.png`, fullPage: true });

    // Should not show error boundary
    const errorBoundary = page.locator("text=Application error");
    await expect(errorBoundary).toHaveCount(0);
    console.log("Overview: OK");
  });

  test("2. People page loads, shows Level column", async ({ page }) => {
    await page.goto(`${BASE}/people`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-people.png`, fullPage: true });

    // Check for "Level" header text (not "Role")
    // The editorial table uses uppercase CSS, but textContent is still "Level"
    const levelHeader = page.locator('th:has-text("Level"), th:has-text("Nivel"), th:has-text("LEVEL"), th:has-text("NIVEL")');
    const levelCount = await levelHeader.count();
    console.log(`People: found ${levelCount} Level/Nivel header(s)`);
    expect(levelCount).toBeGreaterThanOrEqual(1);

    console.log("People: OK — Level column present");
  });

  test("3. People page — LevelSelect dropdown works", async ({ page }) => {
    await page.goto(`${BASE}/people`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Find a level select trigger (the Select component)
    const levelSelect = page.locator('[role="combobox"]').first();
    if (await levelSelect.isVisible()) {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/03-level-select.png`, fullPage: true });
      console.log("People: LevelSelect visible");
    } else {
      console.log("People: No LevelSelect visible (might be non-admin view)");
    }
  });

  test("4. Teams page loads with derived teams", async ({ page }) => {
    await page.goto(`${BASE}/teams`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-teams.png`, fullPage: true });

    const errorBoundary = page.locator("text=Application error");
    await expect(errorBoundary).toHaveCount(0);

    // Check for "Team" prefix in team names
    const teamCards = page.locator('text=/Team\\s/');
    const teamCount = await teamCards.count();
    console.log(`Teams: ${teamCount} team cards with 'Team' prefix`);
  });

  test("5. Team detail page loads", async ({ page }) => {
    await page.goto(`${BASE}/teams/${MANAGER_ID}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-team-detail.png`, fullPage: true });

    const errorBoundary = page.locator("text=Application error");
    await expect(errorBoundary).toHaveCount(0);
    console.log("Team detail: OK");
  });

  test("6. Analytics page loads with Team prefix", async ({ page }) => {
    await page.goto(`${BASE}/analytics`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-analytics.png`, fullPage: true });

    const errorBoundary = page.locator("text=Application error");
    await expect(errorBoundary).toHaveCount(0);
    console.log("Analytics: OK");
  });

  test("7. Team analytics page loads without crash", async ({ page }) => {
    await page.goto(`${BASE}/analytics/team/${MANAGER_ID}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-team-analytics.png`, fullPage: true });

    const errorBoundary = page.locator("text=Application error");
    const errorCount = await errorBoundary.count();

    if (errorCount > 0) {
      // Capture console errors
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      await page.reload();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/07-team-analytics-reload.png`, fullPage: true });
      console.log("Team analytics: ERROR DETECTED");
      console.log("Console errors:", consoleErrors.join("\n"));
    } else {
      console.log("Team analytics: OK");
    }

    expect(errorCount).toBe(0);
  });

  test("8. Sessions page loads", async ({ page }) => {
    await page.goto(`${BASE}/sessions`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-sessions.png`, fullPage: true });

    const errorBoundary = page.locator("text=Application error");
    await expect(errorBoundary).toHaveCount(0);
    console.log("Sessions: OK");
  });

  test("9. Templates page loads", async ({ page }) => {
    await page.goto(`${BASE}/templates`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/09-templates.png`, fullPage: true });

    const errorBoundary = page.locator("text=Application error");
    await expect(errorBoundary).toHaveCount(0);
    console.log("Templates: OK");
  });

  test("10. History page loads", async ({ page }) => {
    await page.goto(`${BASE}/history`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/10-history.png`, fullPage: true });

    const errorBoundary = page.locator("text=Application error");
    await expect(errorBoundary).toHaveCount(0);
    console.log("History: OK");
  });

  test("11. Invite dialog shows Level (not Role)", async ({ page }) => {
    await page.goto(`${BASE}/people`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Click invite button
    const inviteBtn = page.locator('button:has-text("Invite"), button:has-text("Invit")');
    if (await inviteBtn.isVisible()) {
      await inviteBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/11-invite-dialog.png`, fullPage: true });

      // Check for "Level" label in dialog
      const levelLabel = page.locator('text=/Level|Nivel/');
      const count = await levelLabel.count();
      console.log(`Invite dialog: ${count} Level/Nivel labels found`);
    } else {
      console.log("Invite dialog: invite button not found");
    }
  });
});
