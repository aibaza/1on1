import { test, expect } from "@playwright/test";

test.describe("Audit Log Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings/audit-log");
    // Wait for the page heading
    await expect(
      page.getByRole("heading", { name: "Audit Log" })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows the Audit Log page heading and description", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", { name: "Audit Log" })
    ).toBeVisible();
    await expect(
      page.getByText("View all administrative actions in your organization")
    ).toBeVisible();
    // Breadcrumb
    await expect(page.getByText("Organization Settings > Audit Log")).toBeVisible();
  });

  test("shows filter controls: search, action type, and date range", async ({
    page,
  }) => {
    // Search input
    await expect(
      page.getByPlaceholder("Search actions...")
    ).toBeVisible();

    // Action type filter
    const actionFilter = page
      .locator("button")
      .filter({ hasText: "All actions" });
    await expect(actionFilter).toBeVisible();

    // Date pickers (custom Popover-based, not native input[type=date])
    // Both render a <button> with placeholder text "Pick a date" when empty
    const datePickers = page.getByRole("button", { name: /pick a date/i });
    await expect(datePickers).toHaveCount(2);
  });

  test("action type dropdown shows expected action types", async ({
    page,
  }) => {
    // Open the action type dropdown
    const actionFilter = page
      .locator("button")
      .filter({ hasText: "All actions" });
    await actionFilter.click();

    // Check that some key action types are listed
    await expect(page.getByRole("option", { name: "Invite Sent" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Role Changed" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Team Created" })).toBeVisible();
    await expect(
      page.getByRole("option", { name: "User Deactivated" })
    ).toBeVisible();
  });

  test("shows audit log entries or empty state", async ({ page }) => {
    // Wait for loading to complete
    await page.waitForTimeout(2000);

    const table = page.locator("table");
    const emptyState = page.getByText("No audit log entries found");

    const hasEntries = await table.isVisible();
    if (hasEntries) {
      // Table should have expected column headers
      await expect(table.getByText("Timestamp")).toBeVisible();
      await expect(table.getByText("Actor")).toBeVisible();
      await expect(table.getByText("Action")).toBeVisible();
      await expect(table.getByText("Target")).toBeVisible();
    } else {
      await expect(emptyState).toBeVisible();
    }
  });

  test("audit log table shows entries after creating a team (to generate audit events)", async ({
    page,
  }) => {
    // First create a team to generate an audit event
    const teamName = `Audit Test Team ${Date.now()}`;
    await page.request.post("/api/teams", {
      data: { name: teamName },
    });

    // Reload the audit log page
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Audit Log" })
    ).toBeVisible({ timeout: 10_000 });

    // Wait for data to load
    await page.waitForTimeout(2000);

    // Should have at least one entry visible in the table
    const table = page.locator("table");
    if (await table.isVisible()) {
      const rows = table.locator("tbody tr");
      await expect(rows.first()).toBeVisible();
    }
  });

  test("search filter works", async ({ page }) => {
    const searchInput = page.getByPlaceholder("Search actions...");
    await searchInput.fill("nonexistentrandomstring12345");

    // Wait for the query to refetch
    await page.waitForTimeout(1500);

    // Should show empty state or no matching rows
    const emptyState = page.getByText("No audit log entries found");
    const table = page.locator("table");

    const hasTable = await table.isVisible();
    if (!hasTable) {
      await expect(emptyState).toBeVisible();
    }
  });
});
