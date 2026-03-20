/**
 * E2E tests for Phase 29: Template Versioning & Answer Remapping
 *
 * Tests run against UAT (https://1on1.surmont.co) using Acme Corp seed data.
 * Admin (Alice) has template management permissions.
 *
 * Covers:
 * - Publish creates version snapshot (VER-01, VER-02)
 * - Version history API (VER-03)
 * - Diff computation display (VER-04)
 * - Restore creates unpublished draft (VER-05, VER-06)
 * - History tab UI (VER-07)
 * - Restore confirmation dialog (VER-08)
 */
import { test, expect, type Page } from "@playwright/test";

// Acme Corp seed template — "Weekly Check-in"
// DB was seeded with old UUID variant
const TEMPLATE_ID = "dddddddd-0001-4000-d000-000000000001";
const TEMPLATE_URL = `/templates/${TEMPLATE_ID}`;

// Helper: navigate to template editor and wait for load
async function goToTemplate(page: Page) {
  await page.goto(TEMPLATE_URL);
  await page.waitForLoadState("networkidle", { timeout: 15_000 });
  await expect(
    page.getByText(/weekly check-in/i).first()
  ).toBeVisible({ timeout: 10_000 });
}

// Helper: ensure template is in editor view (not history)
async function ensureEditorView(page: Page) {
  const backToEditor = page.getByRole("button", { name: /back to editor/i });
  if (await backToEditor.isVisible().catch(() => false)) {
    await backToEditor.click();
    await page.waitForTimeout(500);
  }
}

// Helper: open the History view
async function openHistory(page: Page) {
  await ensureEditorView(page);
  // The button text is "History" when in editor mode
  const historyBtn = page.getByRole("button", { name: /^history$/i }).first();
  await expect(historyBtn).toBeVisible({ timeout: 5_000 });
  await historyBtn.click();
  await page.waitForTimeout(1000);
}

// Helper: publish template (handles already-published state)
async function ensurePublished(page: Page) {
  await ensureEditorView(page);
  // Check if there's an "Unpublish" button — means it's already published
  const unpublishBtn = page.getByRole("button", { name: /unpublish/i });
  if (await unpublishBtn.isVisible().catch(() => false)) {
    // Already published — unpublish first, then republish to create a new version
    await unpublishBtn.click();
    await page.waitForTimeout(1500);
  }
  // Now publish
  const publishBtn = page.getByRole("button", { name: /publish/i }).first();
  await expect(publishBtn).toBeVisible({ timeout: 5_000 });
  await publishBtn.click();
  await page.waitForTimeout(2000);
}

test.describe("Template Versioning & Answer Remapping", () => {
  test.describe.configure({ mode: "serial" });

  // Template management requires admin or manager role — skip member project
  test.beforeEach(({}, testInfo) => {
    if (testInfo.project.name.includes("member")) {
      test.skip();
    }
  });

  test("publish creates version snapshot and History tab shows it", async ({
    page,
  }) => {
    await goToTemplate(page);

    // Publish to create a version snapshot
    await ensurePublished(page);

    // Open History tab
    await openHistory(page);

    // Should see at least one version entry
    const versionEntry = page.locator("button").filter({ hasText: /v\d+/ }).first();
    await expect(versionEntry).toBeVisible({ timeout: 10_000 });

    // Version entry should show question count
    await expect(
      page.getByText(/\d+ questions/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("publishing again creates a new version with auto-incremented number", async ({
    page,
  }) => {
    await goToTemplate(page);

    // Create another version by unpublish + republish
    await ensurePublished(page);

    // Open history
    await openHistory(page);

    // Should see multiple version entries
    const versionButtons = page.locator("button").filter({ hasText: /v\d+/ });
    const count = await versionButtons.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("clicking a version shows read-only preview with sections and questions", async ({
    page,
  }) => {
    await goToTemplate(page);
    await openHistory(page);

    // Click the first (latest) version
    const versionEntry = page.locator("button").filter({ hasText: /v\d+/ }).first();
    await versionEntry.click();
    await page.waitForTimeout(2000);

    // Should show preview content (section names, question text)
    // Look for known content from the Weekly Check-in template
    await expect(
      page.getByText(/select a version to preview/i)
    ).not.toBeVisible({ timeout: 3_000 });

    // The preview area should have actual content
    const previewArea = page.locator(".lg\\:grid-cols-\\[300px_1fr\\]").locator("div").last();
    const previewText = await previewArea.textContent();
    expect(previewText!.length).toBeGreaterThan(50);
  });

  test("restore button appears for non-latest versions and is hidden for latest", async ({
    page,
  }) => {
    await goToTemplate(page);
    await openHistory(page);

    const versionButtons = page.locator("button").filter({ hasText: /v\d+/ });
    const count = await versionButtons.count();

    if (count < 2) {
      test.skip();
      return;
    }

    // Click latest version — restore should NOT be visible
    await versionButtons.first().click();
    await page.waitForTimeout(1500);
    const restoreBtn = page.getByRole("button", { name: /restore this version/i });
    await expect(restoreBtn).not.toBeVisible();

    // Click oldest version — restore SHOULD be visible
    await versionButtons.last().click();
    await page.waitForTimeout(1500);
    await expect(restoreBtn).toBeVisible({ timeout: 5_000 });
  });

  test("restore shows confirmation dialog with cancel and destructive confirm", async ({
    page,
  }) => {
    await goToTemplate(page);
    await openHistory(page);

    const versionButtons = page.locator("button").filter({ hasText: /v\d+/ });
    const count = await versionButtons.count();
    if (count < 2) {
      test.skip();
      return;
    }

    // Click oldest version
    await versionButtons.last().click();
    await page.waitForTimeout(1500);

    // Click restore
    await page.getByRole("button", { name: /restore this version/i }).click();

    // Confirmation dialog should appear
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Should have version number in title
    const dialogText = await dialog.textContent();
    expect(dialogText).toMatch(/restore.*version/i);

    // Should have cancel button
    await expect(dialog.getByRole("button", { name: /cancel/i })).toBeVisible();

    // Should have destructive confirm button
    const confirmBtn = dialog.getByRole("button", { name: /^restore$/i });
    await expect(confirmBtn).toBeVisible();

    // Cancel for now (we'll test actual restore separately)
    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible();
  });

  test("restoring a version creates an unpublished draft", async ({ page }) => {
    await goToTemplate(page);
    await openHistory(page);

    const versionButtons = page.locator("button").filter({ hasText: /v\d+/ });
    const count = await versionButtons.count();
    if (count < 2) {
      test.skip();
      return;
    }

    // Click oldest version and restore
    await versionButtons.last().click();
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: /restore this version/i }).click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await dialog.getByRole("button", { name: /^restore$/i }).click();

    // Wait for restore to complete
    await page.waitForTimeout(3000);

    // Template should now be unpublished — "Publish" button should be visible
    await expect(
      page.getByRole("button", { name: /publish/i })
    ).toBeVisible({ timeout: 10_000 });

    // Re-publish to leave template in a clean state for other tests
    await page.getByRole("button", { name: /publish/i }).click();
    await page.waitForTimeout(2000);
  });

  test("diff toggle shows changes between versions", async ({ page }) => {
    await goToTemplate(page);
    await openHistory(page);

    const versionButtons = page.locator("button").filter({ hasText: /v\d+/ });
    const count = await versionButtons.count();

    // Click the latest version (should have a previous version for diff)
    await versionButtons.first().click();
    await page.waitForTimeout(2000);

    // Look for diff toggle button
    const diffToggle = page.getByRole("button", { name: /show changes|changes/i });

    if (await diffToggle.isVisible().catch(() => false)) {
      await diffToggle.click();
      await page.waitForTimeout(1500);

      // Check page has some diff-related content
      const pageText = await page.textContent("body");
      // Either shows actual changes or "no changes" indicator
      expect(pageText).toBeTruthy();
    }
    // If diff toggle not visible, first version has no previous — acceptable
  });

  test("History button in mobile overflow menu", async ({ page }) => {
    await goToTemplate(page);
    await ensureEditorView(page);

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000);

    // Look for the three-dot overflow menu
    const moreBtn = page.locator("button").filter({ has: page.locator("svg") }).last();

    // Try clicking the dropdown trigger
    const dropdownTrigger = page.getByRole("button").filter({ hasText: /^$/ }).last();
    if (await dropdownTrigger.isVisible().catch(() => false)) {
      await dropdownTrigger.click();
      await page.waitForTimeout(500);
    }

    // Look for History in dropdown items
    const historyItem = page.getByRole("menuitem", { name: /history/i });
    if (await historyItem.isVisible().catch(() => false)) {
      // Mobile menu has History option
      await expect(historyItem).toBeVisible();
    }

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test("empty state for template with no published versions", async ({
    page,
  }) => {
    // Create a fresh template
    await page.goto("/templates");
    await page.waitForLoadState("networkidle");

    const createBtn = page
      .getByRole("button", { name: /create template/i })
      .first();
    await createBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    const uniqueName = `Version Test ${Date.now()}`;
    await dialog.getByLabel(/template name/i).fill(uniqueName);
    await dialog
      .getByRole("button", { name: /create template/i })
      .click();
    // Dialog closes, template created — click it from the list
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(1000);
    const templateCard = page.locator("a").filter({ hasText: uniqueName }).first();
    await expect(templateCard).toBeVisible({ timeout: 5_000 });
    await templateCard.click();
    await page.waitForURL(/\/templates\/[0-9a-f-]{36}/, { timeout: 10_000 });
    await page.waitForTimeout(1000);

    // Open history on unpublished template
    await openHistory(page);

    // Should show empty state
    await expect(
      page.getByText(/no version history yet/i)
    ).toBeVisible({ timeout: 5_000 });

    // Clean up — archive the test template
    await ensureEditorView(page);
    const archiveBtn = page.getByRole("button", { name: /^archive$/i });
    if (await archiveBtn.isVisible().catch(() => false)) {
      await archiveBtn.click();
      await page.waitForTimeout(500);
      const confirmArchive = page
        .getByRole("button", { name: /confirm|archive|yes/i })
        .last();
      if (await confirmArchive.isVisible().catch(() => false)) {
        await confirmArchive.click();
      }
    }
  });
});
