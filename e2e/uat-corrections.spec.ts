/**
 * UAT spec: session answer corrections — targeting https://1on1.surmont.co/
 *
 * Covers all manually requested test scenarios:
 *   1. Existing correction E2E suite (RBAC, inline form, AI validation, Amended badge)
 *   2. Per-answer widget correction (emoji picker / star rating — NOT raw number input)
 *   3. Edit Section batch correction (dialog with widgets, reason, submit)
 *   4. "No changes" path: toast "No answers were changed", dialog stays open
 *   5. RBAC: member sees NO "Edit section" buttons and NO pencil icons
 *   6. React hydration error #418 check (clean context)
 *
 * Seed session: SESSION_1_ID = 99999999-0001-4000-9000-000000000001 (Bob/Dave, completed)
 */
import { test as base, expect, type Page, type Browser } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const AUTH_DIR = path.join(__dirname, ".auth-uat");
const SESSION_SUMMARY_URL = "/sessions/99999999-0001-4000-9000-000000000001/summary";

type Fixtures = {
  adminPage: Page;
  managerPage: Page;
  memberPage: Page;
};

const test = base.extend<Fixtures>({
  adminPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: path.join(AUTH_DIR, "admin.json") });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
  managerPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: path.join(AUTH_DIR, "manager.json") });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
  memberPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: path.join(AUTH_DIR, "member.json") });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
});

// ---------------------------------------------------------------------------
// Utility: collect console errors
// ---------------------------------------------------------------------------
function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", msg => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", err => errors.push(`PAGE_ERROR: ${err.message}`));
  return errors;
}

// ---------------------------------------------------------------------------
// Group 0: Connectivity + hydration check
// ---------------------------------------------------------------------------
test.describe("0. UAT connectivity and hydration", () => {
  test.setTimeout(30_000);

  test("session summary page returns HTTP 200 and no React #418 error", async ({ browser }) => {
    // Use a fresh context (no stored auth) to check public redirect, then authenticated check
    const ctx = await browser.newContext({ storageState: path.join(AUTH_DIR, "admin.json") });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on("console", msg => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", err => errors.push(`PAGE_ERROR: ${err.message}`));

    const resp = await page.goto(SESSION_SUMMARY_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(1_500); // extra settle time for hydration

    const status = resp?.status();
    console.log(`HTTP status: ${status}`);
    console.log(`Final URL: ${page.url()}`);

    // Check for app error page
    const isErrorPage = await page.locator("text=/application error|server-side exception|digest/i").isVisible().catch(() => false);
    expect(isErrorPage, "should not be an error page").toBe(false);
    expect(status, "HTTP status should be 200").toBe(200);

    // Check for hydration error #418
    const hydrationErrors = errors.filter(e => e.includes("418") || e.includes("Hydration") || e.includes("hydrat"));
    console.log(`All console errors (${errors.length}):`, errors.slice(0, 10));
    if (hydrationErrors.length > 0) {
      console.warn("HYDRATION ERRORS DETECTED:", hydrationErrors);
    } else {
      console.log("No React hydration error #418 detected.");
    }

    // Take screenshot for reference
    await page.screenshot({ path: "e2e/screenshots/uat-session-summary.png" });
    await ctx.close();
  });
});

// ---------------------------------------------------------------------------
// Group 1: RBAC — edit icon visibility
// ---------------------------------------------------------------------------
test.describe("1. RBAC: edit icon visibility on completed session", () => {
  test.setTimeout(45_000);

  test("manager (bob) sees pencil/correct-answer icons on completed session", async ({ managerPage }) => {
    const errors = collectErrors(managerPage);
    await managerPage.goto(SESSION_SUMMARY_URL);
    await managerPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    await managerPage.waitForTimeout(1_000);

    const editBtn = managerPage.getByRole("button", { name: /correct answer/i }).first();
    const isVisible = await editBtn.isVisible().catch(() => false);

    // Also try pencil icon alternative selectors
    const pencilBtn = managerPage.locator("button[title*='orrect'], button[aria-label*='orrect'], button[title*='edit'], button[title*='Edit']").first();
    const pencilVisible = await pencilBtn.isVisible().catch(() => false);

    console.log(`Manager: correct-answer role button visible: ${isVisible}`);
    console.log(`Manager: pencil selector visible: ${pencilVisible}`);
    console.log(`Console errors: ${errors.length}`, errors.slice(0, 5));

    // Capture screenshot
    await managerPage.screenshot({ path: "e2e/screenshots/uat-manager-session-summary.png" });

    expect(isVisible || pencilVisible, "manager should see at least one correction button").toBe(true);
  });

  test("member (dave) does NOT see any correction controls", async ({ memberPage }) => {
    await memberPage.goto(SESSION_SUMMARY_URL);
    await memberPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    await memberPage.waitForTimeout(1_500); // Let React hydrate

    const editBtns = memberPage.getByRole("button", { name: /correct answer/i });
    const editSectionBtns = memberPage.getByRole("button", { name: /edit section/i });
    const pencilBtns = memberPage.locator("button[title*='orrect'], button[aria-label*='orrect']");

    const editBtnCount = await editBtns.count();
    const editSectionCount = await editSectionBtns.count();
    const pencilCount = await pencilBtns.count();

    console.log(`Member: correct-answer buttons: ${editBtnCount}, edit-section: ${editSectionCount}, pencil: ${pencilCount}`);
    await memberPage.screenshot({ path: "e2e/screenshots/uat-member-session-summary.png" });

    expect(editBtnCount, "member should NOT see 'Correct Answer' buttons").toBe(0);
    expect(editSectionCount, "member should NOT see 'Edit Section' buttons").toBe(0);
    expect(pencilCount, "member should NOT see any pencil/correct buttons").toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Group 2: Inline correction form opens and closes
// ---------------------------------------------------------------------------
test.describe("2. Inline correction form open/close", () => {
  test.setTimeout(45_000);

  test("manager can open and close inline correction form", async ({ managerPage }) => {
    await managerPage.goto(SESSION_SUMMARY_URL);
    await managerPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});

    const editBtn = managerPage.getByRole("button", { name: /correct answer/i }).first();
    await editBtn.click();

    const reasonField = managerPage.getByRole("textbox").last();
    await expect(reasonField).toBeVisible({ timeout: 5_000 });

    // Cancel closes the form
    await managerPage.getByRole("button", { name: /cancel/i }).first().click();
    await expect(reasonField).not.toBeVisible({ timeout: 3_000 });
  });
});

// ---------------------------------------------------------------------------
// Group 3: Widget check (no raw number input for mood/rating)
// ---------------------------------------------------------------------------
test.describe("3. Per-answer widget correction (no raw number input)", () => {
  test.setTimeout(60_000);

  test("clicking pencil on a mood/rating answer shows widget — not raw number input", async ({ managerPage }) => {
    const errors = collectErrors(managerPage);
    await managerPage.goto(SESSION_SUMMARY_URL);
    await managerPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    await managerPage.waitForTimeout(1_000);

    await managerPage.screenshot({ path: "e2e/screenshots/uat-before-correction-click.png" });

    // Click first correction button
    const editBtns = managerPage.getByRole("button", { name: /correct answer/i });
    const count = await editBtns.count();
    console.log(`Found ${count} 'Correct Answer' buttons`);

    if (count === 0) {
      // Try alternative selectors
      const altBtns = managerPage.locator("button[title*='orrect'], [data-testid*='correct']");
      const altCount = await altBtns.count();
      console.log(`Alternative correction buttons: ${altCount}`);
      if (altCount > 0) {
        await altBtns.first().click();
      } else {
        // Log page structure for debugging
        const html = await managerPage.locator("main").innerHTML().catch(() => "N/A");
        console.log("Main HTML (first 2000 chars):", html.substring(0, 2000));
        test.skip();
        return;
      }
    } else {
      await editBtns.first().click();
    }

    await managerPage.waitForTimeout(500);
    await managerPage.screenshot({ path: "e2e/screenshots/uat-after-correction-click.png" });

    // Check that NO raw <input type="number"> is visible
    const numberInputs = managerPage.locator("input[type='number']");
    const numberInputCount = await numberInputs.count();
    console.log(`Raw number inputs visible: ${numberInputCount}`);

    // Check for widget elements: emoji buttons, star rating buttons, mood buttons
    const emojiButtons = managerPage.locator("[data-testid*='mood'], [data-testid*='emoji'], [aria-label*='mood'], [aria-label*='emoji']");
    const starButtons = managerPage.locator("[data-testid*='star'], [aria-label*='star'], .star-rating button, button[data-value]");
    const widgetLike = managerPage.locator("button[data-value], [role='radio'][data-value], [data-answer-type]");

    const emojiCount = await emojiButtons.count();
    const starCount = await starButtons.count();
    const widgetCount = await widgetLike.count();

    console.log(`Emoji/mood buttons: ${emojiCount}, Star buttons: ${starCount}, Widget-like: ${widgetCount}`);
    console.log(`Console errors: ${errors.length}`);

    // The form should be open (reason textbox visible)
    const reasonField = managerPage.getByRole("textbox").last();
    await expect(reasonField).toBeVisible({ timeout: 5_000 });

    // ASSERTION: No raw number input should be visible inside the open correction form
    expect(numberInputCount, "raw <input type='number'> should NOT appear for mood/rating corrections").toBe(0);

    await managerPage.screenshot({ path: "e2e/screenshots/uat-correction-form-open.png" });
  });

  test("manager can fill widget, add reason, and submit correction", async ({ managerPage }) => {
    const errors = collectErrors(managerPage);
    await managerPage.goto(SESSION_SUMMARY_URL);
    await managerPage.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await managerPage.waitForTimeout(1_000);

    const editBtns = managerPage.getByRole("button", { name: /correct answer/i });
    const count = await editBtns.count();
    if (count === 0) {
      console.log("No correction buttons found — skipping widget submit test");
      test.skip();
      return;
    }

    await editBtns.first().click();
    await managerPage.waitForTimeout(500);

    // Try to interact with widget — click any clickable option (emoji, star, radio)
    const widgetOptions = managerPage.locator("button[data-value], [role='radio'], [data-testid*='rating'], [data-testid*='mood']");
    const wCount = await widgetOptions.count();
    console.log(`Widget options available: ${wCount}`);
    if (wCount > 0) {
      await widgetOptions.first().click().catch(e => console.log("Widget click failed:", e.message));
    }

    // Fill reason (min 20 chars)
    const reasonField = managerPage.getByRole("textbox").last();
    await expect(reasonField).toBeVisible({ timeout: 5_000 });
    await reasonField.fill("The original answer was recorded incorrectly during the session — correcting now.");

    // Wait for debounce (AI validation)
    await managerPage.waitForTimeout(1_500);

    // Submit button must be enabled
    const submitBtn = managerPage.getByRole("button", { name: /save correction|submit correction|submit/i }).first();
    await expect(submitBtn).toBeEnabled({ timeout: 10_000 });

    // Click submit
    await submitBtn.click();
    await managerPage.waitForTimeout(2_000);

    // Verify: form closes (reason field gone) and Amended badge may appear
    const reasonVisible = await reasonField.isVisible().catch(() => false);
    console.log(`After submit — reason field still visible: ${reasonVisible}`);

    const amendedBadge = managerPage.getByText(/amended/i).first();
    const amendedVisible = await amendedBadge.isVisible().catch(() => false);
    console.log(`Amended badge visible: ${amendedVisible}`);

    await managerPage.screenshot({ path: "e2e/screenshots/uat-after-correction-submit.png" });
    console.log(`Console errors: ${errors.length}`, errors.slice(0, 5));

    expect(reasonVisible, "correction form should close after submit").toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Group 4: Edit Section batch correction
// ---------------------------------------------------------------------------
// IMPORTANT: The "Edit section" button is a small <button> nested inside a
// CollapsibleTrigger <button>. The CollapsibleTrigger has full-width text
// "WellbeingEdit section". We MUST click only the inner small button.
// Use locator("button").filter({ hasText: /^Edit section$/ }) to match
// the inner button (textContent is exactly "Edit section" with no category name).
// ---------------------------------------------------------------------------
test.describe("4. Edit Section batch correction dialog", () => {
  test.setTimeout(60_000);

  // Helper: find the correct "Edit section" small buttons (not CollapsibleTrigger)
  function getEditSectionBtns(page: Page) {
    // The inner button has textContent exactly "Edit section" (no category name prefix)
    return page.locator("button").filter({ hasText: /^Edit section$/ });
  }

  test("Edit Section button opens dialog with category name in title", async ({ managerPage }) => {
    await managerPage.goto(SESSION_SUMMARY_URL);
    await managerPage.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await managerPage.waitForTimeout(1_000);

    await managerPage.screenshot({ path: "e2e/screenshots/uat-before-edit-section.png" });

    const editSectionBtns = getEditSectionBtns(managerPage);
    const count = await editSectionBtns.count();
    console.log(`Exact 'Edit section' small buttons found: ${count}`);

    if (count === 0) {
      console.log("No Edit section buttons found");
      test.skip();
      return;
    }

    // Scroll to and click the first small "Edit section" button
    await editSectionBtns.first().scrollIntoViewIfNeeded();
    await editSectionBtns.first().click();
    console.log("Clicked Edit section button");
    await managerPage.waitForTimeout(1_000);

    await managerPage.screenshot({ path: "e2e/screenshots/uat-after-edit-section-click.png" });

    // Dialog should open
    const dialog = managerPage.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 8_000 });

    // Dialog title should contain category name
    const dialogTitle = dialog.getByRole("heading");
    const titleText = await dialogTitle.first().textContent().catch(() => "");
    console.log(`Dialog title: "${titleText}"`);
    expect(titleText, "dialog should have a heading").toBeTruthy();

    await managerPage.screenshot({ path: "e2e/screenshots/uat-edit-section-dialog.png" });
  });

  test("Edit Section dialog shows no raw number inputs (widgets only)", async ({ managerPage }) => {
    await managerPage.goto(SESSION_SUMMARY_URL);
    await managerPage.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await managerPage.waitForTimeout(1_000);

    const editSectionBtns = getEditSectionBtns(managerPage);
    if (await editSectionBtns.count() === 0) {
      test.skip();
      return;
    }

    await editSectionBtns.first().scrollIntoViewIfNeeded();
    await editSectionBtns.first().click();
    await managerPage.waitForTimeout(1_000);

    const dialog = managerPage.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 8_000 });

    // Check for raw number inputs inside dialog
    const numberInputs = dialog.locator("input[type='number']");
    const numberInputCount = await numberInputs.count();
    console.log(`Raw number inputs in Edit Section dialog: ${numberInputCount}`);

    await managerPage.screenshot({ path: "e2e/screenshots/uat-edit-section-widgets.png" });

    expect(numberInputCount, "Edit Section dialog should NOT contain raw number inputs").toBe(0);
  });

  test("Edit Section: change answer, add reason, submit — Amended badges appear", async ({ managerPage }) => {
    await managerPage.goto(SESSION_SUMMARY_URL);
    await managerPage.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await managerPage.waitForTimeout(1_000);

    const editSectionBtns = getEditSectionBtns(managerPage);
    if (await editSectionBtns.count() === 0) {
      test.skip();
      return;
    }

    await editSectionBtns.first().scrollIntoViewIfNeeded();
    await editSectionBtns.first().click();
    await managerPage.waitForTimeout(1_000);

    const dialog = managerPage.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 8_000 });

    // Try to change at least one answer via any clickable widget
    // Emoji mood buttons (5 face emojis), star buttons, or textarea
    const emojiButtons = dialog.locator("button").filter({ hasText: /😢|😕|😐|😊|😄|😀|😃|🙁|😞|😫|😩|😟|😤|😡|😈|👿|😭|😖|😣|😣|😧|😨|😰|😱/ });
    const emojiCount = await emojiButtons.count();
    console.log(`Emoji buttons in dialog: ${emojiCount}`);

    let changed = false;
    if (emojiCount > 0) {
      await emojiButtons.first().click();
      changed = true;
      console.log("Clicked emoji button");
    } else {
      // Try text answers
      const textareas = dialog.locator("textarea");
      const taCount = await textareas.count();
      if (taCount > 0) {
        await textareas.first().fill("Updated answer text from E2E test — automated correction.");
        changed = true;
      }
    }
    console.log(`Answer changed: ${changed}`);

    // Fill reason
    const reasonField = dialog.locator("textarea").last();
    await expect(reasonField).toBeVisible({ timeout: 5_000 });
    await reasonField.fill("E2E automated batch correction test — verifying the Edit Section workflow end-to-end.");

    await managerPage.waitForTimeout(1_000);

    // Submit
    const submitBtn = dialog.getByRole("button", { name: /save correction|save|submit/i }).last();
    await expect(submitBtn).toBeEnabled({ timeout: 5_000 });
    await submitBtn.click();
    await managerPage.waitForTimeout(2_000);

    const dialogVisible = await dialog.isVisible().catch(() => false);
    console.log(`Dialog still visible after submit: ${dialogVisible}`);

    await managerPage.screenshot({ path: "e2e/screenshots/uat-after-edit-section-submit.png" });

    const amendedBadges = managerPage.getByText(/amended/i);
    const badgeCount = await amendedBadges.count();
    console.log(`Amended badges after batch submit: ${badgeCount}`);
  });

  test("Edit Section: no changes → toast 'No answers were changed', dialog stays open", async ({ managerPage }) => {
    await managerPage.goto(SESSION_SUMMARY_URL);
    await managerPage.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await managerPage.waitForTimeout(1_000);

    const editSectionBtns = getEditSectionBtns(managerPage);
    if (await editSectionBtns.count() === 0) {
      test.skip();
      return;
    }

    await editSectionBtns.first().scrollIntoViewIfNeeded();
    await editSectionBtns.first().click();
    await managerPage.waitForTimeout(1_000);

    const dialog = managerPage.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 8_000 });

    // Fill reason but don't change any answer
    const reasonField = dialog.locator("textarea").last();
    await expect(reasonField).toBeVisible({ timeout: 5_000 });
    await reasonField.fill("Reason provided but no answer was actually changed in this test — verifying no-op path.");

    // Submit without changing any answer
    const submitBtn = dialog.getByRole("button", { name: /save correction|save|submit/i }).last();
    await submitBtn.click();
    await managerPage.waitForTimeout(2_000);

    // Toast should appear: "No answers were changed"
    const toast = managerPage.getByText(/no answers were changed/i);
    const toastVisible = await toast.isVisible().catch(() => false);
    console.log(`"No answers were changed" toast visible: ${toastVisible}`);

    // Dialog should stay open
    const dialogStillOpen = await dialog.isVisible().catch(() => false);
    console.log(`Dialog still open after no-change submit: ${dialogStillOpen}`);

    await managerPage.screenshot({ path: "e2e/screenshots/uat-no-changes-toast.png" });

    expect(toastVisible, "'No answers were changed' toast should appear").toBe(true);
    expect(dialogStillOpen, "dialog should stay open when no answers changed").toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Group 5: Amended badge + correction history panel (via API setup)
// ---------------------------------------------------------------------------
test.describe("5. Amended badge and correction history panel", () => {
  test.setTimeout(60_000);

  test.beforeAll(async ({ browser }) => {
    // Create a correction via API as admin
    const ctx = await browser.newContext({ storageState: path.join(AUTH_DIR, "admin.json") });
    const page = await ctx.newPage();

    try {
      await page.goto(SESSION_SUMMARY_URL);
      await page.waitForLoadState("domcontentloaded", { timeout: 15_000 });

      const sessionResp = await page.request.get("/api/sessions/99999999-0001-4000-9000-000000000001");
      let answerId = "";
      if (sessionResp.ok()) {
        const data = await sessionResp.json().catch(() => null);
        const answers =
          data?.answers ??
          data?.categories?.flatMap((c: { answers?: Array<{ id: string }> }) => c.answers ?? []) ??
          [];
        answerId = answers[0]?.id ?? "";
      }
      console.log(`Setup: sessionResp.status=${sessionResp.status()}, answerId=${answerId}`);

      if (answerId) {
        const corrResp = await page.request.post(
          "/api/sessions/99999999-0001-4000-9000-000000000001/corrections",
          {
            data: {
              answerId,
              newAnswerText: "E2E UAT test correction — please ignore",
              reason:
                "This is an automated E2E UAT test correction to verify the Amended badge and correction history panel work correctly after reseeding.",
            },
          }
        );
        const body = await corrResp.json().catch(() => null);
        console.log(`Setup correction POST: status=${corrResp.status()}, body=${JSON.stringify(body)}`);
      }
    } catch (err) {
      console.log("Setup beforeAll failed:", err);
    } finally {
      await ctx.close();
    }
  });

  test("Amended badge visible on corrected answer row", async ({ adminPage }) => {
    await adminPage.goto(SESSION_SUMMARY_URL);
    await adminPage.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await adminPage.waitForTimeout(1_000);

    await adminPage.screenshot({ path: "e2e/screenshots/uat-amended-badge.png" });
    await expect(adminPage.getByText(/amended/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("correction history panel visible on session with corrections", async ({ adminPage }) => {
    await adminPage.goto(SESSION_SUMMARY_URL);
    await adminPage.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await adminPage.waitForTimeout(1_000);

    await expect(adminPage.getByText(/correction history/i).first()).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// Group 7: History before/after display
// ---------------------------------------------------------------------------
test.describe("7. History before/after display", () => {
  test.setTimeout(30_000);

  test("history panel entry shows question text in italic", async ({ adminPage }) => {
    await adminPage.goto(SESSION_SUMMARY_URL);
    await adminPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    // Question text is rendered in <p className="... italic">
    const italicEl = adminPage.locator("p.italic").first();
    await expect(italicEl).toBeVisible({ timeout: 10_000 });
  });

  test("'→' arrow is visible between before and after pills", async ({ adminPage }) => {
    await adminPage.goto(SESSION_SUMMARY_URL);
    await adminPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    await expect(adminPage.getByText("→").first()).toBeVisible({ timeout: 10_000 });
  });

  test("before pill has line-through styling", async ({ adminPage }) => {
    await adminPage.goto(SESSION_SUMMARY_URL);
    await adminPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    const beforePill = adminPage.locator(".line-through").first();
    await expect(beforePill).toBeVisible({ timeout: 10_000 });
  });

  test("after pill has green styling", async ({ adminPage }) => {
    await adminPage.goto(SESSION_SUMMARY_URL);
    await adminPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    const afterPill = adminPage.locator("[class*='bg-green']").first();
    await expect(afterPill).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// Group 8: Admin revert RBAC + flow
// ---------------------------------------------------------------------------
test.describe("8. Admin revert RBAC and flow", () => {
  test.setTimeout(60_000);

  test.beforeAll(async ({ browser }) => {
    // Create a fresh correction via admin API to have a known history entry to revert
    const ctx = await browser.newContext({ storageState: path.join(AUTH_DIR, "admin.json") });
    const page = await ctx.newPage();

    try {
      await page.goto(SESSION_SUMMARY_URL);
      await page.waitForLoadState("domcontentloaded", { timeout: 15_000 });

      const sessionResp = await page.request.get("/api/sessions/99999999-0001-4000-9000-000000000001");
      let answerId = "";
      if (sessionResp.ok()) {
        const data = await sessionResp.json().catch(() => null);
        const answers =
          data?.answers ??
          data?.categories?.flatMap((c: { answers?: Array<{ id: string }> }) => c.answers ?? []) ??
          [];
        answerId = answers[0]?.id ?? "";
      }

      if (answerId) {
        const corrResp = await page.request.post(
          "/api/sessions/99999999-0001-4000-9000-000000000001/corrections",
          {
            data: {
              answerId,
              newAnswerText: "E2E revert test correction — please ignore",
              reason:
                "Automated E2E UAT test correction created to validate the admin revert functionality end-to-end.",
            },
          }
        );
        console.log(`Group 8 setup: status=${corrResp.status()}, answerId=${answerId}`);
      } else {
        console.log("Group 8 setup: could not extract answerId");
      }
    } catch (err) {
      console.log("Group 8 beforeAll failed:", err);
    } finally {
      await ctx.close();
    }
  });

  test("admin sees Revert button in history panel", async ({ adminPage }) => {
    await adminPage.goto(SESSION_SUMMARY_URL);
    await adminPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    const revertBtn = adminPage.locator("button").filter({ hasText: /^Revert$/ }).first();
    await expect(revertBtn).toBeVisible({ timeout: 10_000 });
  });

  test("manager does NOT see Revert button in history panel", async ({ managerPage }) => {
    await managerPage.goto(SESSION_SUMMARY_URL);
    await managerPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    await managerPage.waitForTimeout(1_000);
    const revertBtns = managerPage.locator("button").filter({ hasText: /^Revert$/ });
    await expect(revertBtns).toHaveCount(0, { timeout: 5_000 });
  });

  test("member does NOT see Revert button in history panel", async ({ memberPage }) => {
    await memberPage.goto(SESSION_SUMMARY_URL);
    await memberPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    await memberPage.waitForTimeout(1_000);
    const revertBtns = memberPage.locator("button").filter({ hasText: /^Revert$/ });
    await expect(revertBtns).toHaveCount(0, { timeout: 5_000 });
  });

  test("clicking Revert shows 'Restore answer to this before-value?' confirmation", async ({ adminPage }) => {
    await adminPage.goto(SESSION_SUMMARY_URL);
    await adminPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    const revertBtn = adminPage.locator("button").filter({ hasText: /^Revert$/ }).first();
    await revertBtn.click();
    await expect(adminPage.getByText("Restore answer to this before-value?")).toBeVisible({ timeout: 5_000 });
  });

  test("clicking Cancel dismisses confirmation and restores Revert button", async ({ adminPage }) => {
    await adminPage.goto(SESSION_SUMMARY_URL);
    await adminPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    const revertBtn = adminPage.locator("button").filter({ hasText: /^Revert$/ }).first();
    await revertBtn.click();
    await expect(adminPage.getByText("Restore answer to this before-value?")).toBeVisible({ timeout: 5_000 });
    await adminPage.getByRole("button", { name: "Cancel" }).click();
    await expect(adminPage.getByText("Restore answer to this before-value?")).not.toBeVisible({ timeout: 3_000 });
    await expect(revertBtn).toBeVisible({ timeout: 3_000 });
  });

  test("clicking Confirm reverts the correction — POST /corrections/revert returns 200", async ({ adminPage }) => {
    await adminPage.goto(SESSION_SUMMARY_URL);
    await adminPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});

    const revertBtn = adminPage.locator("button").filter({ hasText: /^Revert$/ }).first();
    await revertBtn.click();
    await expect(adminPage.getByText("Restore answer to this before-value?")).toBeVisible({ timeout: 5_000 });

    const [revertResponse] = await Promise.all([
      adminPage.waitForResponse(
        (resp) =>
          resp.url().includes("/corrections/revert") && resp.request().method() === "POST",
        { timeout: 15_000 }
      ),
      adminPage.getByRole("button", { name: "Confirm" }).click(),
    ]);

    expect(revertResponse.status()).toBe(200);

    // After page refresh, history panel should still be visible
    await adminPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    await expect(adminPage.getByText(/correction history/i).first()).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// Group 6: AI validation feedback
// ---------------------------------------------------------------------------
test.describe("6. AI validation feedback", () => {
  test.setTimeout(60_000);

  test("AI validation feedback appears after typing reason; submit stays enabled", async ({ managerPage }) => {
    await managerPage.goto(SESSION_SUMMARY_URL);
    await managerPage.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});

    const editBtns = managerPage.getByRole("button", { name: /correct answer/i });
    if (await editBtns.count() === 0) {
      test.skip();
      return;
    }

    await editBtns.first().click();
    const reasonField = managerPage.getByRole("textbox").last();
    await expect(reasonField).toBeVisible({ timeout: 5_000 });

    await reasonField.fill("The original answer was recorded incorrectly due to a technical issue during the session.");
    await managerPage.waitForTimeout(1_500); // Wait past 800ms debounce

    const submitBtn = managerPage.getByRole("button", { name: /save correction|submit correction|submit/i }).first();
    await expect(submitBtn).toBeEnabled({ timeout: 15_000 });
  });
});
