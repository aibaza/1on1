import { test, expect } from "./fixtures";

test.describe("Templates CRUD", () => {
  test.setTimeout(60_000);

  const TEMPLATE_NAME = `E2E Templates Test ${Date.now()}`;

  /**
   * Helper: click the "Create Template" button and fill the dialog.
   * Returns after the dialog is dismissed (app may navigate to detail or stay on list).
   */
  async function createTemplate(
    adminPage: import("@playwright/test").Page,
    name: string,
    description = "Created by E2E test suite"
  ) {
    await adminPage.getByRole("button", { name: /create template/i }).first().click();
    await expect(adminPage.getByRole("dialog")).toBeVisible({ timeout: 5_000 });
    await adminPage.getByLabel(/template name/i).fill(name);
    await adminPage.getByLabel(/description/i).fill(description);
    await adminPage.getByRole("button", { name: /create template/i }).last().click();
    // Wait for the dialog to close
    await expect(adminPage.getByRole("dialog")).not.toBeVisible({ timeout: 10_000 });
  }

  /**
   * Helper: navigate to a template detail page by name from the /templates list.
   * Assumes /templates is already loaded.
   */
  async function openTemplateByName(
    adminPage: import("@playwright/test").Page,
    name: string
  ) {
    // Template cards are <a href="/templates/{uuid}">. Click within the card matching the name.
    // Use a locator that targets anchors with UUID-style hrefs (not /templates/schema or /templates/ai-editor).
    const templateCard = adminPage
      .locator("a")
      .filter({ hasText: name })
      .first();
    await templateCard.click({ timeout: 5_000 });
    await adminPage.waitForURL(/\/templates\/[0-9a-f-]{36}/, { timeout: 10_000 });
  }

  test("templates list loads with seeded template visible", async ({
    adminPage,
  }) => {
    await adminPage.goto("/templates");
    await expect(
      adminPage.getByRole("heading", { name: /templates/i })
    ).toBeVisible({ timeout: 10_000 });
    // Template cards exist (anchors pointing to template detail pages)
    await expect(
      adminPage.locator("a[href*='/templates/']").first()
    ).toBeVisible({ timeout: 10_000 });
    // Create Template button visible for admin
    await expect(
      adminPage.getByRole("button", { name: /create template/i })
    ).toBeVisible();
  });

  test("admin can create a new template", async ({ adminPage }) => {
    await adminPage.goto("/templates");
    await createTemplate(adminPage, TEMPLATE_NAME);
    // After creation the app may stay on list or navigate to template detail.
    // In either case the template name should be visible.
    await expect(adminPage.getByText(TEMPLATE_NAME).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("admin can navigate to template detail and add a question", async ({
    adminPage,
  }) => {
    await adminPage.goto("/templates");

    // If the TEMPLATE_NAME exists from the create test, click it; otherwise create it first.
    const templateLink = adminPage.locator("a").filter({ hasText: TEMPLATE_NAME }).first();
    const exists = await templateLink.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!exists) {
      await createTemplate(adminPage, TEMPLATE_NAME);
      // After creation, we may be on the list or the detail. Navigate to list to ensure consistent state.
      await adminPage.goto("/templates");
    }

    await openTemplateByName(adminPage, TEMPLATE_NAME);

    // Wait for the template detail page to fully load (sections counter visible)
    await expect(adminPage.locator("text=/section/i").first()).toBeVisible({
      timeout: 10_000,
    });

    // Add a section — always required before adding a question (questions live inside sections)
    // Click whichever "Add Section" button is visible (header button or empty-state button)
    const addSectionBtn = adminPage
      .getByRole("button", { name: /add section/i })
      .first();
    await expect(addSectionBtn).toBeVisible({ timeout: 5_000 });
    await addSectionBtn.click();
    // Wait for the section to appear (a new section row is rendered inside the sections list)
    await expect(
      adminPage.getByRole("button", { name: /add question/i }).first()
    ).toBeVisible({ timeout: 10_000 });

    // Add a question
    await adminPage
      .getByRole("button", { name: /add question/i })
      .first()
      .click();
    await expect(adminPage.getByRole("dialog")).toBeVisible({ timeout: 5_000 });

    // Fill question text
    const questionInput = adminPage.getByLabel(/question text/i);
    await questionInput.fill("E2E test question: how productive was this sprint?");
    // Submit the question dialog
    await adminPage.getByRole("button", { name: /^add question$/i }).click();
    await adminPage.waitForTimeout(1_000);

    // Question should appear in the template
    await expect(
      adminPage.getByText(/how productive was this sprint/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("admin can archive a template", async ({ adminPage }) => {
    // Create a template specifically for archiving
    const ARCHIVE_TEMPLATE_NAME = `Archive Me E2E ${Date.now()}`;
    await adminPage.goto("/templates");
    await createTemplate(adminPage, ARCHIVE_TEMPLATE_NAME, "Will be archived");

    // After creation, the template name should be visible (on list or detail page).
    await expect(
      adminPage.getByText(ARCHIVE_TEMPLATE_NAME).first()
    ).toBeVisible({ timeout: 10_000 });

    // Navigate to template detail if not already there (creation may stay on list)
    if (!adminPage.url().match(/\/templates\/[0-9a-f-]{36}/)) {
      await adminPage.goto("/templates");
      await openTemplateByName(adminPage, ARCHIVE_TEMPLATE_NAME);
    }

    // Confirm we are on the template detail page
    await adminPage.waitForURL(/\/templates\/[0-9a-f-]{36}/, { timeout: 10_000 });

    // Click Archive button (visible in the template detail action bar)
    const archiveBtn = adminPage.getByRole("button", { name: /^archive$/i });
    await expect(archiveBtn).toBeVisible({ timeout: 5_000 });
    await archiveBtn.click();

    // Confirm archive dialog if present
    const confirmBtn = adminPage
      .getByRole("button", { name: /confirm|archive|yes/i })
      .last();
    if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    // Should redirect to templates list after archiving
    await adminPage
      .waitForURL(/\/templates$/, { timeout: 10_000 })
      .catch(() => {});
    await adminPage.goto("/templates");
    // Archived template should not appear in the active list
    await expect(
      adminPage.getByText(ARCHIVE_TEMPLATE_NAME)
    ).not.toBeVisible({ timeout: 5_000 });
  });
});
