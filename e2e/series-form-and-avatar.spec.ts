import { test, expect } from "@playwright/test";

test.describe("Avatar Regeneration", () => {
  test.use({ storageState: "e2e/.auth-uat/admin.json" });

  test("regenerated avatar updates in account page and user menu", async ({ page }) => {
    await page.goto("/account");
    await page.waitForLoadState("networkidle");

    // Get the current avatar src from user menu (top-right)
    const userMenuAvatar = page.locator('[data-slot="avatar-image"]').last();
    const oldMenuSrc = await userMenuAvatar.getAttribute("src");

    // Get the current avatar src from account page (large avatar)
    const accountAvatar = page.locator("img[alt]").first();
    const oldAccountSrc = await accountAvatar.getAttribute("src");

    // Click regenerate
    const regenButton = page.getByRole("button", { name: /regenera/i });
    await regenButton.click();

    // Wait for the success toast
    await expect(page.locator("[data-sonner-toast]")).toContainText(/avatar/i, { timeout: 10000 });

    // Wait a bit for refresh to complete
    await page.waitForTimeout(2000);

    // Check account page avatar changed
    const newAccountSrc = await accountAvatar.getAttribute("src");
    expect(newAccountSrc).not.toBe(oldAccountSrc);

    // Check user menu avatar changed
    const newMenuSrc = await userMenuAvatar.getAttribute("src");
    expect(newMenuSrc).not.toBe(oldMenuSrc);
  });
});

test.describe("Editorial Series Create", () => {
  test.use({ storageState: "e2e/.auth-uat/admin.json" });

  test("can create a new series with all fields filled", async ({ page }) => {
    await page.goto("/sessions/new");
    await page.waitForLoadState("networkidle");

    // Should see the editorial form with heading
    await expect(page.locator("h1")).toBeVisible();

    // Select a report (click first user card)
    const reportCards = page.locator("section").first().locator("button[type='button']");
    const reportCount = await reportCards.count();
    if (reportCount > 0) {
      await reportCards.first().click();
    }

    // Cadence should default to biweekly, verify it's visually selected
    // Select weekly instead
    await page.getByRole("button", { name: /weekly|săptămânal/i }).first().click();

    // Select preferred day
    const daySelect = page.locator("select").first();
    await daySelect.selectOption({ index: 3 }); // Wednesday

    // Select preferred time - hour
    const hourSelect = page.locator("select").nth(1);
    await hourSelect.selectOption("10");

    // Select minute
    const minuteSelect = page.locator("select").nth(2);
    await minuteSelect.selectOption("30");

    // Select date from calendar
    const calendarButton = page.getByRole("button", { name: /select.*date|alege.*data/i });
    if (await calendarButton.isVisible()) {
      await calendarButton.click();
      // Click a future date (any enabled day button in the calendar)
      const enabledDays = page.locator("[role='gridcell'] button:not([disabled])");
      const dayCount = await enabledDays.count();
      if (dayCount > 0) {
        // Pick a day that's not today (somewhere in the middle)
        const targetIndex = Math.min(Math.floor(dayCount / 2), dayCount - 1);
        await enabledDays.nth(targetIndex).click();
      }
    }

    // Select template
    const templateSelects = page.locator("select");
    // Find the template select (last one or the one in template section)
    const templateSelect = templateSelects.last();
    const templateOptions = await templateSelect.locator("option").count();
    if (templateOptions > 1) {
      await templateSelect.selectOption({ index: 1 }); // First real template
    }

    // Submit the form
    const submitButton = page.locator("button[type='submit']");
    await submitButton.click();

    // Should redirect to sessions list or show success
    await expect(page).toHaveURL(/\/sessions(?!\/new)/, { timeout: 15000 });
  });
});

test.describe("Editorial Series Edit", () => {
  test.use({ storageState: "e2e/.auth-uat/admin.json" });

  test("can navigate to edit page and update series", async ({ page }) => {
    // Go to sessions list
    await page.goto("/sessions");
    await page.waitForLoadState("networkidle");

    // Click on the first series card to go to detail
    const seriesLink = page.locator("a[href^='/sessions/']").first();
    await seriesLink.click();
    await page.waitForLoadState("networkidle");

    // Look for the Edit button
    const editLink = page.getByRole("link", { name: /edit|editează/i });
    if (await editLink.isVisible()) {
      await editLink.click();
      await page.waitForLoadState("networkidle");

      // Should be on the edit page
      await expect(page.url()).toContain("/edit");

      // The report should be shown as fixed (not selectable)
      // Change the duration
      const durationInput = page.locator("input[type='number'][min='15']");
      if (await durationInput.isVisible()) {
        await durationInput.fill("45");
      }

      // Submit
      const submitButton = page.locator("button[type='submit']");
      await submitButton.click();

      // Should show success toast or redirect
      // Wait for navigation back
      await page.waitForTimeout(3000);
    }
  });
});
