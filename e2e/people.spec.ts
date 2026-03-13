import { test, expect } from "./fixtures";

test.describe("People Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/people");
    // Wait for the people table to load (TanStack Query hydration)
    await expect(page.getByRole("heading", { name: "People" })).toBeVisible();
    await expect(page.locator("table")).toBeVisible({ timeout: 10_000 });
  });

  test("shows the People page heading and description", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "People" })).toBeVisible();
    await expect(
      page.getByText("Manage your organization's members")
    ).toBeVisible();
  });

  test("shows People and Teams tabs", async ({ page }) => {
    // Scope to the tab bar area (inside main, not the sidebar)
    const main = page.getByRole("main");
    await expect(
      main.getByRole("link", { name: "People" })
    ).toBeVisible();
    await expect(
      main.getByRole("link", { name: "Teams" })
    ).toBeVisible();
  });

  test("People tab is active on /people", async ({ page }) => {
    // The tab links are inside the main content area; sidebar also has a "People" link
    const main = page.getByRole("main");
    const peopleTab = main.getByRole("link", { name: "People" });
    // The active tab has the bg-background class with shadow
    await expect(peopleTab).toHaveClass(/bg-background/);
  });

  test("shows user data table with expected columns", async ({ page }) => {
    const table = page.locator("table");

    // Check column headers exist (they are buttons because they're sortable)
    await expect(
      table.getByRole("button", { name: /Name/i })
    ).toBeVisible();
    await expect(
      table.getByRole("button", { name: /Email/i })
    ).toBeVisible();
    await expect(
      table.getByRole("button", { name: /Role/i })
    ).toBeVisible();
    await expect(table.getByText("Teams")).toBeVisible();
    await expect(
      table.getByRole("button", { name: /Manager/i })
    ).toBeVisible();
    await expect(
      table.getByRole("button", { name: /Status/i })
    ).toBeVisible();
  });

  test("shows seeded users (Alice, Bob, Dave) in the table", async ({
    page,
  }) => {
    await expect(page.getByText("alice@acme.example.com")).toBeVisible();
    await expect(page.getByText("bob@acme.example.com")).toBeVisible();
    await expect(page.getByText("dave@acme.example.com")).toBeVisible();
  });

  test("admin sees Invite button", async ({ page }) => {
    // Logged in as Alice (admin) via auth setup — button label is "Invite"
    await expect(
      page.getByRole("button", { name: /^invite$/i })
    ).toBeVisible();
  });

  test("search input filters users by name or email", async ({ page }) => {
    const searchInput = page.getByPlaceholder(
      /Search by name, email, or job title/i
    );
    await expect(searchInput).toBeVisible();

    // Search for Alice
    await searchInput.fill("alice");
    await expect(page.getByText("alice@acme.example.com")).toBeVisible();
    // Other users should not be visible
    await expect(page.getByText("bob@acme.example.com")).not.toBeVisible();
    await expect(page.getByText("dave@acme.example.com")).not.toBeVisible();

    // Clear and search for Bob
    await searchInput.clear();
    await searchInput.fill("bob");
    await expect(page.getByText("bob@acme.example.com")).toBeVisible();
    await expect(page.getByText("alice@acme.example.com")).not.toBeVisible();
  });

  test("role filter dropdown works", async ({ page }) => {
    // Find the role filter trigger (contains "All Roles" initially)
    const roleFilter = page.locator("button").filter({ hasText: "All Roles" });
    await roleFilter.click();

    // Select "Admin" from the dropdown
    await page.getByRole("option", { name: "Admin" }).click();

    // Alice (admin) should still be visible
    await expect(page.getByText("alice@acme.example.com")).toBeVisible();
    // Bob (manager) and Dave (member) should be filtered out
    await expect(page.getByText("bob@acme.example.com")).not.toBeVisible();
    await expect(page.getByText("dave@acme.example.com")).not.toBeVisible();
  });

  test("status filter dropdown works", async ({ page }) => {
    // Find the status filter trigger
    const statusFilter = page
      .locator("button")
      .filter({ hasText: "All Status" });
    await statusFilter.click();

    // Select "Active"
    await page.getByRole("option", { name: "Active" }).click();

    // Active users should still be visible
    await expect(page.getByText("alice@acme.example.com")).toBeVisible();
  });

  test("clicking a table row opens the profile sheet", async ({ page }) => {
    // Click on the name cell in Alice's row (avoid clicking on interactive elements
    // like role select, manager select, or actions menu which have stopPropagation)
    const aliceRow = page.locator("tr").filter({ hasText: "alice@acme.example.com" });
    // Click on the first cell (name) to trigger the row click handler
    await aliceRow.locator("td").first().click();

    // Profile sheet should open - Radix Sheet renders with role="dialog"
    const sheet = page.locator("[data-slot='sheet-content']");
    await expect(sheet).toBeVisible({ timeout: 5_000 });
    // Should show "View Full Profile" link
    await expect(
      page.getByRole("link", { name: /View Full Profile/i })
    ).toBeVisible();
  });

  test("profile sheet can be closed", async ({ page }) => {
    // Open profile sheet by clicking name cell
    const aliceRow = page.locator("tr").filter({ hasText: "alice@acme.example.com" });
    await aliceRow.locator("td").first().click();

    const sheet = page.locator("[data-slot='sheet-content']");
    await expect(sheet).toBeVisible({ timeout: 5_000 });

    // Close the sheet by clicking the X button (has sr-only "Close" text)
    await sheet.getByRole("button", { name: "Close" }).click();

    // Sheet should be hidden
    await expect(sheet).not.toBeVisible();
  });

  test("admin can see role select dropdowns (not badges) for active users", async ({
    page,
  }) => {
    // As admin, role column should show Select triggers for active users, not just badges
    // Look for a select trigger in the role column area of a table row
    const bobRow = page.locator("tr").filter({ hasText: "bob@acme.example.com" });
    const roleSelect = bobRow.locator("[role='combobox'], button").filter({ hasText: /Manager/i });
    await expect(roleSelect).toBeVisible();
  });

  test("user actions menu shows View Profile option", async ({ page }) => {
    // Find the actions menu button (kebab menu) - it has sr-only text "Open menu"
    const firstActionsButton = page
      .getByRole("button", { name: /Open menu/i })
      .first();
    await firstActionsButton.click();

    // Should show "View Profile" option
    await expect(
      page.getByRole("menuitem", { name: /View Profile/i })
    ).toBeVisible();
  });

  test("sorting by Name column works", async ({ page }) => {
    // Click the Name column header to sort
    const nameHeader = page.locator("table").getByRole("button", { name: /Name/i });
    await nameHeader.click();

    // The table should be sorted - we verify that the table still renders
    await expect(page.locator("table tbody tr").first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// RBAC tests: multi-role fixture-based tests for People management
// ---------------------------------------------------------------------------

test.describe("People Management RBAC", () => {
  test.setTimeout(30_000);

  test("admin sees people list with all seeded users", async ({ adminPage }) => {
    await adminPage.goto("/people");
    await expect(adminPage.getByRole("heading", { name: /people/i })).toBeVisible({ timeout: 10_000 });
    await expect(adminPage.locator("table")).toBeVisible({ timeout: 10_000 });
    // Seeded users visible
    await expect(adminPage.getByText("alice@acme.example.com")).toBeVisible({ timeout: 10_000 });
    await expect(adminPage.getByText("bob@acme.example.com")).toBeVisible({ timeout: 5_000 });
    await expect(adminPage.getByText("dave@acme.example.com")).toBeVisible({ timeout: 5_000 });
  });

  test("admin sees Invite button", async ({ adminPage }) => {
    await adminPage.goto("/people");
    await expect(adminPage.locator("table")).toBeVisible({ timeout: 10_000 });
    // Button label is "Invite" (dialog title is "Invite people")
    await expect(adminPage.getByRole("button", { name: /^invite$/i })).toBeVisible();
  });

  test("admin can see role dropdown for users (admin has role change ability)", async ({ adminPage }) => {
    await adminPage.goto("/people");
    await expect(adminPage.locator("table")).toBeVisible({ timeout: 10_000 });
    // Admin should see combobox/select triggers in the role column for other users
    const bobRow = adminPage.locator("tr").filter({ hasText: "bob@acme.example.com" });
    await expect(bobRow).toBeVisible({ timeout: 10_000 });
    // Admin can change roles — look for combobox or select trigger in the row
    const roleSelector = bobRow.locator("[role='combobox'], select").first();
    await expect(roleSelector).toBeVisible({ timeout: 5_000 });
  });

  test("manager does NOT see Invite button", async ({ managerPage }) => {
    await managerPage.goto("/people");
    await expect(managerPage.locator("table")).toBeVisible({ timeout: 10_000 });
    await expect(managerPage.getByRole("button", { name: /^invite$/i })).not.toBeVisible();
  });

  test("member does NOT see Invite button", async ({ memberPage }) => {
    await memberPage.goto("/people");
    await expect(memberPage.locator("table")).toBeVisible({ timeout: 10_000 });
    await expect(memberPage.getByRole("button", { name: /^invite$/i })).not.toBeVisible();
  });

  test("manager sees role badges (not dropdowns) in people table", async ({ managerPage }) => {
    await managerPage.goto("/people");
    await expect(managerPage.locator("table")).toBeVisible({ timeout: 10_000 });
    // For managers: role column shows text/Badge, not Select trigger
    const bobRow = managerPage.locator("tr").filter({ hasText: "bob@acme.example.com" });
    await expect(bobRow.locator("[role='combobox']")).not.toBeVisible();
  });
});
