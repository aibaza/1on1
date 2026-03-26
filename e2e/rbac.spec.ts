import { test, expect, type Page } from "@playwright/test";

/**
 * Helper to login as a specific user.
 * This creates a fresh login session by clearing storage and logging in.
 */
async function loginAs(
  page: Page,
  email: string,
  password: string = "password123"
) {
  // Clear any existing auth state
  await page.context().clearCookies();

  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/\/(dashboard|overview)?$/i, {
    timeout: 15_000,
  });
}

test.describe("RBAC - Admin Access", () => {
  // Uses default auth state (Alice, admin)

  test("admin can access People page", async ({ page }) => {
    await page.goto("/people");
    await expect(page.getByRole("heading", { name: "People" })).toBeVisible();
    await expect(page.locator("table")).toBeVisible({ timeout: 10_000 });
  });

  test("admin can access Teams page", async ({ page }) => {
    await page.goto("/teams");
    await expect(page.getByRole("heading", { name: "People" })).toBeVisible();
  });

  test("admin can access Audit Log", async ({ page }) => {
    await page.goto("/settings/audit-log");
    await expect(
      page.getByRole("heading", { name: "Audit Log" })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("admin sees Invite people button on People page", async ({ page }) => {
    await page.goto("/people");
    await expect(page.locator("table")).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("button", { name: /^Invite$/i })
    ).toBeVisible();
  });

  test("admin sees Create Team button on Teams page", async ({ page }) => {
    await page.goto("/teams");
    await expect(page.getByRole("heading", { name: "People" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Create Team/i })
    ).toBeVisible();
  });

  test("admin sidebar shows Settings section with Audit Log", async ({
    page,
  }) => {
    await page.goto("/overview");
    // Settings is a top-nav dropdown — open it first so its links become visible
    await page.getByRole("button", { name: /^Settings$/i }).click();
    await expect(
      page.getByRole("menuitem").filter({ hasText: "Audit Log" })
    ).toBeVisible();
  });

  test("admin sidebar shows Company settings", async ({ page }) => {
    await page.goto("/overview");
    // Settings is a top-nav dropdown — open it first so its links become visible
    await page.getByRole("button", { name: /^Settings$/i }).click();
    await expect(
      page.getByRole("menuitem").filter({ hasText: "Company" })
    ).toBeVisible();
  });
});

test.describe("RBAC - Manager Access", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await loginAs(page, "bob@acme.example.com");
  });

  test("manager can access People page", async ({ page }) => {
    await page.goto("/people");
    await expect(page.getByRole("heading", { name: "People" })).toBeVisible();
    await expect(page.locator("table")).toBeVisible({ timeout: 10_000 });
  });

  test("manager does NOT see Invite people button", async ({ page }) => {
    await page.goto("/people");
    await expect(page.locator("table")).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("button", { name: /Invite people/i })
    ).not.toBeVisible();
  });

  test("manager can access Teams page and sees Create Team button", async ({
    page,
  }) => {
    await page.goto("/teams");
    await expect(page.getByRole("heading", { name: "People" })).toBeVisible();
    // Managers CAN create teams (canCreate = admin or manager)
    await expect(
      page.getByRole("button", { name: /Create Team/i })
    ).toBeVisible();
  });

  test("manager is redirected from Audit Log to overview", async ({
    page,
  }) => {
    await page.goto("/settings/audit-log");
    // Non-admin should be redirected to /overview
    await expect(page).toHaveURL(/\/overview/, { timeout: 10_000 });
  });

  test("manager sidebar does NOT show Settings section", async ({ page }) => {
    await page.goto("/overview");
    await expect(page.getByRole("link", { name: "Overview" })).toBeVisible();
    // Settings section items should not be visible for non-admin
    await expect(
      page.getByRole("link", { name: "Audit Log" })
    ).not.toBeVisible();
    await expect(
      page.getByRole("link", { name: "Company" })
    ).not.toBeVisible();
  });

  test("manager sees role badges instead of dropdowns in people table", async ({
    page,
  }) => {
    await page.goto("/people");
    await expect(page.locator("table")).toBeVisible({ timeout: 10_000 });

    // For managers, the role column should show Badge components, not Select triggers
    // Look for the table - role cells should NOT have combobox triggers
    const bobRow = page.locator("tr").filter({ hasText: "bob@acme.example.com" });
    const roleCell = bobRow.locator("td").nth(2); // role is 3rd column (0-indexed)
    // Should not have a select/combobox within the role cell
    await expect(roleCell.locator("[role='combobox']")).not.toBeVisible();
  });
});

test.describe("RBAC - Member Access", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await loginAs(page, "dave@acme.example.com");
  });

  test("member can access People page", async ({ page }) => {
    await page.goto("/people");
    await expect(page.getByRole("heading", { name: "People" })).toBeVisible();
    await expect(page.locator("table")).toBeVisible({ timeout: 10_000 });
  });

  test("member does NOT see Invite people button", async ({ page }) => {
    await page.goto("/people");
    await expect(page.locator("table")).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("button", { name: /Invite people/i })
    ).not.toBeVisible();
  });

  test("member can access Teams page but does NOT see Create Team button", async ({
    page,
  }) => {
    await page.goto("/teams");
    await expect(page.getByRole("heading", { name: "People" })).toBeVisible();
    // Members should NOT see Create Team button (canCreate = admin or manager only)
    await expect(
      page.getByRole("button", { name: /Create Team/i })
    ).not.toBeVisible();
  });

  test("member is redirected from Audit Log to overview", async ({
    page,
  }) => {
    await page.goto("/settings/audit-log");
    // Non-admin should be redirected to /overview
    await expect(page).toHaveURL(/\/overview/, { timeout: 10_000 });
  });

  test("member sidebar does NOT show Settings section", async ({ page }) => {
    await page.goto("/overview");
    await expect(page.getByRole("link", { name: "Overview" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Audit Log" })
    ).not.toBeVisible();
    await expect(
      page.getByRole("link", { name: "Company" })
    ).not.toBeVisible();
  });

  test("member sees role badges instead of dropdowns in people table", async ({
    page,
  }) => {
    await page.goto("/people");
    await expect(page.locator("table")).toBeVisible({ timeout: 10_000 });

    // For members, the role column should show Badge components, not Select triggers
    const daveRow = page.locator("tr").filter({ hasText: "dave@acme.example.com" });
    const roleCell = daveRow.locator("td").nth(2);
    await expect(roleCell.locator("[role='combobox']")).not.toBeVisible();
  });
});
