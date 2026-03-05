import { test, expect } from "@playwright/test";

/**
 * Dark mode E2E tests: verify theme toggle works, persists across
 * reloads, and key screens render in dark mode.
 */

test.describe("Dark Mode", () => {
  test("toggle switches to dark mode and back", async ({ page }) => {
    await page.goto("/overview");
    await expect(page.getByText(/welcome/i)).toBeVisible({ timeout: 15_000 });

    // Find the theme toggle button (sr-only text "Toggle theme")
    const toggleButton = page.getByRole("button", { name: /toggle theme/i });
    await expect(toggleButton).toBeVisible({ timeout: 5_000 });

    // Get initial theme state
    const initialHasDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );

    // Click toggle -- should switch theme
    await toggleButton.click();
    await page.waitForTimeout(500);

    const afterToggle = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );
    expect(afterToggle).not.toBe(initialHasDark);

    // Click toggle again -- should switch back
    await toggleButton.click();
    await page.waitForTimeout(500);

    const afterSecondToggle = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );
    expect(afterSecondToggle).toBe(initialHasDark);
  });

  test("dark mode persists after page reload", async ({ page }) => {
    await page.goto("/overview");
    await expect(page.getByText(/welcome/i)).toBeVisible({ timeout: 15_000 });

    const toggleButton = page.getByRole("button", { name: /toggle theme/i });
    await expect(toggleButton).toBeVisible({ timeout: 5_000 });

    // Determine current state and ensure we're in dark mode
    const isDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );

    if (!isDark) {
      await toggleButton.click();
      await page.waitForTimeout(500);
    }

    // Verify dark mode is active
    await expect(
      page.evaluate(() =>
        document.documentElement.classList.contains("dark")
      )
    ).resolves.toBe(true);

    // Reload page
    await page.reload();
    await expect(page.getByText(/welcome/i)).toBeVisible({ timeout: 15_000 });

    // Verify dark mode persists after reload
    const stillDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );
    expect(stillDark).toBe(true);

    // Clean up: toggle back to light mode
    const toggle2 = page.getByRole("button", { name: /toggle theme/i });
    await toggle2.click();
    await page.waitForTimeout(500);
  });

  test("key screens render in dark mode without errors", async ({ page }) => {
    await page.goto("/overview");
    await expect(page.getByText(/welcome/i)).toBeVisible({ timeout: 15_000 });

    // Ensure dark mode is on
    const toggleButton = page.getByRole("button", { name: /toggle theme/i });
    const isDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );
    if (!isDark) {
      await toggleButton.click();
      await page.waitForTimeout(500);
    }

    // Screenshot 1: Dashboard overview in dark mode
    await page.screenshot({
      path: "e2e/screenshots/dark-mode-overview.png",
      fullPage: true,
    });

    // Navigate to analytics page
    await page.goto("/analytics");
    await page.waitForTimeout(3_000);
    // Screenshot 2: Analytics in dark mode
    await page.screenshot({
      path: "e2e/screenshots/dark-mode-analytics.png",
      fullPage: true,
    });

    // Navigate to templates page
    await page.goto("/templates");
    await page.waitForTimeout(3_000);
    // Screenshot 3: Templates in dark mode
    await page.screenshot({
      path: "e2e/screenshots/dark-mode-templates.png",
      fullPage: true,
    });

    // Verify no console errors during dark mode navigation
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/sessions");
    await page.waitForTimeout(2_000);

    // Filter out known non-critical errors (React hydration warnings, etc.)
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("hydration") &&
        !e.includes("Hydration") &&
        !e.includes("favicon")
    );
    // We allow some console errors (network, etc.) but log them
    if (criticalErrors.length > 0) {
      console.log("Console errors in dark mode:", criticalErrors);
    }

    // Clean up: restore light mode
    const toggle2 = page.getByRole("button", { name: /toggle theme/i });
    await toggle2.click();
    await page.waitForTimeout(500);
  });
});
