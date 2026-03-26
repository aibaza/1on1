import { test, expect } from "./fixtures";

/**
 * Authentication E2E tests — login flows for all three roles, invalid login,
 * and logout.
 *
 * Login tests use a fresh browser context (empty storageState) to simulate
 * a user who has not authenticated yet.
 *
 * The logout test uses the `adminPage` fixture (pre-authenticated) to verify
 * the full sign-out flow.
 */
test.describe("Authentication", () => {
  test.setTimeout(30_000);

  // -----------------------------------------------------------------------
  // Login flows
  // -----------------------------------------------------------------------

  test("valid admin credentials redirect to /overview", async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await ctx.newPage();
    try {
      await page.goto("/login");
      await page.getByLabel(/email/i).fill("alice@acme.example.com");
      await page.locator('input[name="password"]').fill("password123");
      await page.getByRole("button", { name: /sign in/i }).click();
      await page.waitForURL(/\/overview/i, { timeout: 20_000 });
      await expect(page.getByText(/welcome/i)).toBeVisible({ timeout: 10_000 });
    } finally {
      await ctx.close();
    }
  });

  test("valid manager credentials redirect to /overview", async ({
    browser,
  }) => {
    const ctx = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await ctx.newPage();
    try {
      await page.goto("/login");
      await page.getByLabel(/email/i).fill("bob@acme.example.com");
      await page.locator('input[name="password"]').fill("password123");
      await page.getByRole("button", { name: /sign in/i }).click();
      await page.waitForURL(/\/overview/i, { timeout: 20_000 });
      await expect(page.getByText(/welcome/i)).toBeVisible({ timeout: 10_000 });
    } finally {
      await ctx.close();
    }
  });

  test("valid member credentials redirect to /overview", async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await ctx.newPage();
    try {
      await page.goto("/login");
      await page.getByLabel(/email/i).fill("dave@acme.example.com");
      await page.locator('input[name="password"]').fill("password123");
      await page.getByRole("button", { name: /sign in/i }).click();
      await page.waitForURL(/\/overview/i, { timeout: 20_000 });
      await expect(page.getByText(/welcome/i)).toBeVisible({ timeout: 10_000 });
    } finally {
      await ctx.close();
    }
  });

  test("invalid password stays on /login", async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await ctx.newPage();
    try {
      await page.goto("/login");
      await page.getByLabel(/email/i).fill("alice@acme.example.com");
      await page.locator('input[name="password"]').fill("wrongpassword");
      await page.getByRole("button", { name: /sign in/i }).click();
      // Auth.js redirects back to /login?error=CredentialsSignin on failure
      await page.waitForTimeout(3_000);
      const url = page.url();
      expect(url).toContain("/login");
    } finally {
      await ctx.close();
    }
  });

  // -----------------------------------------------------------------------
  // Logout flow
  // -----------------------------------------------------------------------

  test("logout redirects to /login and protects /overview", async ({
    adminPage,
  }) => {
    test.setTimeout(30_000);

    await adminPage.goto("/overview");
    await expect(adminPage.getByText(/welcome/i)).toBeVisible({
      timeout: 10_000,
    });

    // Open user menu — the trigger button contains the user's initials avatar.
    // Alice Johnson => "AJ". The button has no accessible name other than
    // the initials text inside the AvatarFallback. Use getByRole with exact
    // initials, or fall back to any small icon button in the header.
    const avatarBtn = adminPage.getByRole("button", { name: /^AJ$/i }).first();
    const isByInitials = await avatarBtn
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    if (isByInitials) {
      await avatarBtn.click();
    } else {
      // Fallback: the avatar button is in the banner region
      const bannerButtons = adminPage.locator("banner button");
      const count = await bannerButtons.count();
      // Click the last button in the banner (user menu trigger is rightmost)
      if (count > 0) {
        await bannerButtons.nth(count - 1).click();
      }
    }

    // The dropdown renders sign-out as a menuitem (Radix UI DropdownMenuItem).
    // The accessible name is "Sign out" (navigation.signOut translation key).
    const signOutItem = adminPage.getByRole("menuitem", { name: /sign out/i });
    await signOutItem.waitFor({ state: "visible", timeout: 5_000 });
    await signOutItem.click({ timeout: 5_000 });
    await adminPage.waitForURL(/\/login/i, { timeout: 10_000 });
    await expect(adminPage).toHaveURL(/\/login/i);

    // Protected route check — navigating to /overview after logout should
    // redirect back to /login
    await adminPage.goto("/overview");
    await adminPage.waitForURL(/\/login/i, { timeout: 10_000 });
    await expect(adminPage).toHaveURL(/\/login/i);
  });
});
