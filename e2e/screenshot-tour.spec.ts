/**
 * screenshot-tour.spec.ts
 *
 * Comprehensive visual catalogue of the 1on1 app.
 * Captures every major page in 4 configurations:
 *   desktop-light | desktop-dark | mobile-light | mobile-dark
 *
 * Output: screenshots/{label}/{slug}.png  (~160 total)
 *
 * Requires dev server running on port 4300 (does NOT start one).
 * Seed creds: alice@acme.example.com / password123 (admin)
 *             bob@acme.example.com   / password123 (manager)
 */

import { test, Browser, BrowserContext, Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// Pre-built auth state files (created by auth.setup.ts)
const AUTH_DIR = path.join(__dirname, ".auth");

// ---------------------------------------------------------------------------
// Configuration matrix
// ---------------------------------------------------------------------------

interface Config {
  label: string;
  viewport: { width: number; height: number };
  dark: boolean;
}

const CONFIGS: Config[] = [
  { label: "desktop-light", viewport: { width: 1440, height: 900 }, dark: false },
  { label: "desktop-dark",  viewport: { width: 1440, height: 900 }, dark: true  },
  { label: "mobile-light",  viewport: { width: 390,  height: 844 }, dark: false },
  { label: "mobile-dark",   viewport: { width: 390,  height: 844 }, dark: true  },
];

// Short timeout for optional UI interactions (hover, click optional elements)
const UI_TIMEOUT = 3_000;

// ---------------------------------------------------------------------------
// Seed data constants
// ---------------------------------------------------------------------------

const ALICE_EMAIL = "alice@acme.example.com";
const BOB_EMAIL   = "bob@acme.example.com";
const PASSWORD    = "password123";

const SESSION_1   = "99999999-0001-4000-9000-000000000001";
const TEMPLATE_1  = "dddddddd-0001-4000-a000-000000000001";
const DAVE_ID     = "aaaaaaaa-0004-4000-a000-000000000004";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

async function shot(page: Page, dir: string, slug: string) {
  ensureDir(dir);
  const file = path.join(dir, `${slug}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  ✓ ${slug}`);
}

async function shotScrolled(page: Page, dir: string, slug: string) {
  ensureDir(dir);
  const file = path.join(dir, `${slug}.png`);
  const height = page.viewportSize()?.height ?? 900;
  await page.evaluate((h) => window.scrollBy(0, h * 0.6), height);
  await page.waitForTimeout(300);
  await page.screenshot({ path: file, fullPage: false });
  await page.evaluate(() => window.scrollTo(0, 0));
  console.log(`  ✓ ${slug}`);
}

/**
 * Navigate to a URL and wait for DOM + a short settle period.
 * Uses domcontentloaded (never hangs) plus a capped networkidle.
 */
async function nav(page: Page, url: string) {
  // Use a longer timeout and retry once — dev server can be slow after many requests
  const goto = async () =>
    page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await goto().catch(async () => {
    // Wait briefly then retry once
    await page.waitForTimeout(3_000);
    await goto();
  });
  // Allow up to 10s for network to quiet down (TanStack Query initial fetch + dev compilation)
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(600);
}

/**
 * Open a new browser context with theme pre-applied via localStorage injection.
 * Optionally pass a stored auth state file for pre-authenticated contexts.
 */
async function newContext(
  browser: Browser,
  cfg: Config,
  storageState?: string,
): Promise<BrowserContext> {
  const ctx = await browser.newContext({
    viewport: cfg.viewport,
    storageState: storageState ?? undefined,
  });
  // Inject theme into every page BEFORE any navigation
  await ctx.addInitScript((dark: boolean) => {
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, cfg.dark);
  return ctx;
}

/**
 * Login as the given user and wait for dashboard redirect.
 * Used only as a fallback when stored auth state is unavailable.
 */
async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(400);
  await page.getByLabel(/email/i).fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/(dashboard|overview)/i, { timeout: 20_000 });
  // Reload so next-themes applies the class from localStorage
  await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(600);
}

// ---------------------------------------------------------------------------
// Main test — iterates over all 4 configs
// ---------------------------------------------------------------------------

test("screenshot tour", async ({ browser }) => {
  // Skip in CI — this is a visual documentation tool, not a functional test.
  // The wizard-summary step triggers AI polling (3s interval, 2 min timeout)
  // which hangs networkidle and causes the 25-min test timeout to fire.
  if (process.env.CI) test.skip();
  test.setTimeout(25 * 60 * 1_000); // 25 min total

  for (const cfg of CONFIGS) {
    const dir = path.join("screenshots", cfg.label);
    console.log(`\n--- ${cfg.label} ---`);

    // -----------------------------------------------------------------------
    // AUTH PAGES  (no login required)
    // -----------------------------------------------------------------------
    {
      const ctx = await newContext(browser, cfg);
      const page = await ctx.newPage();

      await nav(page, "/login");
      await page.getByLabel(/email/i).fill("alice@acme.example.com").catch(() => {});
      await page.locator('input[name="password"]').fill("••••••••••••").catch(() => {});
      await shot(page, dir, "auth-login");

      await nav(page, "/register");
      await page.getByLabel(/name/i).first().fill("Jane Smith").catch(() => {});
      await page.getByLabel(/email/i).fill("jane@example.com").catch(() => {});
      await shot(page, dir, "auth-register");

      await nav(page, "/forgot-password");
      await page.getByLabel(/email/i).fill("alice@acme.example.com").catch(() => {});
      await shot(page, dir, "auth-forgot-password");

      await ctx.close();
    }

    // -----------------------------------------------------------------------
    // ALICE (ADMIN) — all main pages
    // -----------------------------------------------------------------------
    {
      // Use stored auth state to avoid login flakiness during long test runs.
      // Falls back to manual login if the auth file doesn't exist.
      const adminAuthFile = path.join(AUTH_DIR, "admin.json");
      const useStoredAuth = fs.existsSync(adminAuthFile);
      const ctx = await newContext(browser, cfg, useStoredAuth ? adminAuthFile : undefined);
      const page = await ctx.newPage();
      if (!useStoredAuth) {
        await login(page, ALICE_EMAIL, PASSWORD);
      }

      // dashboard-overview
      await nav(page, "/overview");
      await shot(page, dir, "dashboard-overview");

      // sessions-list
      await nav(page, "/sessions");
      await page.locator("article, [class*='card'], li").first().hover({ timeout: UI_TIMEOUT }).catch(() => {});
      await shot(page, dir, "sessions-list");

      // sessions-new
      await nav(page, "/sessions/new");
      await shot(page, dir, "sessions-new");

      // session-detail
      await nav(page, `/sessions/${SESSION_1}`);
      await shot(page, dir, "session-detail");
      await shotScrolled(page, dir, "session-detail-scrolled");

      // session-summary
      await nav(page, `/sessions/${SESSION_1}/summary`);
      await shot(page, dir, "session-summary");

      // history
      await nav(page, "/history");
      await page.evaluate(() => window.scrollBy(0, 200));
      await page.waitForTimeout(300);
      await shot(page, dir, "history");

      // action-items
      await nav(page, "/action-items");
      await shot(page, dir, "action-items");

      // people-list
      await nav(page, "/people");
      await shot(page, dir, "people-list");

      // people-detail (Dave)
      await nav(page, `/people/${DAVE_ID}`);
      await shot(page, dir, "people-detail");

      // teams-list
      await nav(page, "/teams");
      await shot(page, dir, "teams-list");

      // teams-detail — click first team link from the list
      {
        const teamHref = await page
          .locator("a[href*='/teams/']")
          .first()
          .getAttribute("href", { timeout: UI_TIMEOUT })
          .catch(() => null);
        if (teamHref) {
          await nav(page, teamHref);
        }
        await shot(page, dir, "teams-detail");
      }

      // templates-list
      await nav(page, "/templates");
      await shot(page, dir, "templates-list");

      // templates-detail
      await nav(page, `/templates/${TEMPLATE_1}`);
      await shot(page, dir, "templates-detail");
      await shotScrolled(page, dir, "templates-detail-scrolled");

      // templates-schema
      await nav(page, "/templates/schema");
      await shot(page, dir, "templates-schema");

      // analytics-overview
      await nav(page, "/analytics");
      await shot(page, dir, "analytics-overview");
      await shotScrolled(page, dir, "analytics-overview-scrolled");

      // analytics-individual (Dave)
      await nav(page, `/analytics/individual/${DAVE_ID}`);
      await shot(page, dir, "analytics-individual");

      // analytics-team — find first team analytics link via teams page
      {
        // Try teams page first, then analytics page, then fall back gracefully
        let analyticsHref: string | null = null;
        try {
          await nav(page, "/teams");
          analyticsHref = await page
            .locator("a[href*='/analytics/team']")
            .first()
            .getAttribute("href", { timeout: UI_TIMEOUT })
            .catch(() => null);
          if (!analyticsHref) {
            // Fallback: check the analytics page itself for a team link
            await nav(page, "/analytics");
            analyticsHref = await page
              .locator("a[href*='/analytics/team']")
              .first()
              .getAttribute("href", { timeout: UI_TIMEOUT })
              .catch(() => null);
          }
        } catch {
          // Navigation failed — screenshot whatever is currently loaded
        }
        if (analyticsHref) {
          await nav(page, analyticsHref).catch(() => {});
        } else if (!page.url().includes("/analytics")) {
          // Screenshot analytics overview again as fallback
          await nav(page, "/analytics").catch(() => {});
        }
        await shot(page, dir, "analytics-team");
      }

      // settings-company
      await nav(page, "/settings/company");
      await shot(page, dir, "settings-company");

      // settings-audit-log
      await nav(page, "/settings/audit-log");
      await shot(page, dir, "settings-audit-log");

      // AI editor — new
      await nav(page, "/templates/ai-editor");
      await shot(page, dir, "ai-editor-new");

      // AI editor — editing existing template
      await nav(page, `/templates/${TEMPLATE_1}/ai-editor`);
      await shot(page, dir, "ai-editor-existing");

      await ctx.close();
    }

    // -----------------------------------------------------------------------
    // BOB (MANAGER) — Wizard section
    // -----------------------------------------------------------------------
    {
      // Use stored auth state to avoid login flakiness during long test runs.
      const managerAuthFile = path.join(AUTH_DIR, "manager.json");
      const useStoredManagerAuth = fs.existsSync(managerAuthFile);
      const ctx = await newContext(browser, cfg, useStoredManagerAuth ? managerAuthFile : undefined);
      const page = await ctx.newPage();
      if (!useStoredManagerAuth) {
        await login(page, BOB_EMAIL, PASSWORD);
      }

      // Find a resumable or startable session
      await nav(page, "/sessions");

      let wizardLanded = false;

      // Try Resume first
      const resumeBtn = page.getByRole("button", { name: /resume/i }).first();
      if (await resumeBtn.isVisible({ timeout: UI_TIMEOUT }).catch(() => false)) {
        await resumeBtn.click();
        await page.waitForURL(/\/wizard\//, { timeout: 15_000 }).catch(() => {});
        wizardLanded = page.url().includes("/wizard/");
      }

      // Try Start if Resume didn't work
      if (!wizardLanded) {
        const startBtn = page.getByRole("button", { name: /^start$/i }).first();
        if (await startBtn.isVisible({ timeout: UI_TIMEOUT }).catch(() => false)) {
          await startBtn.click();
          await page.waitForURL(/\/wizard\//, { timeout: 15_000 }).catch(() => {});
          wizardLanded = page.url().includes("/wizard/");
        }
      }

      // Try direct navigation to known session IDs
      if (!wizardLanded) {
        for (const sid of [
          "99999999-0003-4000-9000-000000000003",
          "99999999-0002-4000-9000-000000000002",
          "99999999-0004-4000-9000-000000000004",
        ]) {
          await page.goto(`/wizard/${sid}`, { waitUntil: "domcontentloaded", timeout: 15_000 });
          await page.waitForTimeout(1_000);
          if (page.url().includes("/wizard/")) {
            wizardLanded = true;
            break;
          }
        }
      }

      const wizardSlugs = [
        "wizard-step-1-blank",
        "wizard-step-1-answered",
        "wizard-step-2",
        "wizard-step-2-answered",
        "wizard-step-3",
        "wizard-context-panel-open",
        "wizard-mobile-carousel",
        "wizard-summary",
      ];

      if (wizardLanded) {
        await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
        await page.waitForTimeout(600);

        // Step 1 blank
        await shot(page, dir, "wizard-step-1-blank");

        // Try interacting with mood/rating widget
        // Look for numbered rating buttons (1-5)
        for (const n of ["4", "5"]) {
          const btn = page.getByRole("button", { name: new RegExp(`^${n}$`) }).first();
          if (await btn.isVisible({ timeout: UI_TIMEOUT }).catch(() => false)) {
            await btn.click();
            await page.waitForTimeout(400);
            break;
          }
        }
        // Fill any visible textarea
        const ta1 = page.locator("textarea:visible").first();
        if (await ta1.isVisible({ timeout: UI_TIMEOUT }).catch(() => false)) {
          const val = await ta1.inputValue().catch(() => "");
          if (!val) {
            await ta1.fill("Great progress this week — shipped the analytics dashboard, team morale high.");
            await page.waitForTimeout(400);
          }
        }
        await shot(page, dir, "wizard-step-1-answered");

        // Next → step 2
        {
          const nb = page.getByRole("button", { name: /next/i }).first();
          if (await nb.isVisible({ timeout: UI_TIMEOUT }).catch(() => false)) {
            await nb.click();
            await page.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => {});
            await page.waitForTimeout(500);
          }
        }
        await shot(page, dir, "wizard-step-2");

        // Fill step 2
        const ta2 = page.locator("textarea:visible").first();
        if (await ta2.isVisible({ timeout: UI_TIMEOUT }).catch(() => false)) {
          const val = await ta2.inputValue().catch(() => "");
          if (!val) {
            await ta2.fill("Need to address backlog prioritisation and align on Q2 objectives next week.");
            await page.waitForTimeout(400);
          }
        }
        const yesBtn = page.getByRole("button", { name: /^yes$/i }).first();
        if (await yesBtn.isVisible({ timeout: UI_TIMEOUT }).catch(() => false)) {
          await yesBtn.click();
          await page.waitForTimeout(300);
        }
        await shot(page, dir, "wizard-step-2-answered");

        // Next → step 3
        {
          const nb = page.getByRole("button", { name: /next/i }).first();
          if (await nb.isVisible({ timeout: UI_TIMEOUT }).catch(() => false)) {
            await nb.click();
            await page.waitForTimeout(500);
          }
        }
        await shot(page, dir, "wizard-step-3");

        // Open context panel — try various selectors
        {
          const panelSelectors = [
            "[data-testid*='context-panel']",
            "[aria-label*='context']",
            "[aria-label*='panel']",
            "button[class*='layer']",
          ];
          let opened = false;
          for (const sel of panelSelectors) {
            const el = page.locator(sel).first();
            if (await el.isVisible({ timeout: 1_500 }).catch(() => false)) {
              await el.click({ timeout: UI_TIMEOUT });
              await page.waitForTimeout(600);
              opened = true;
              break;
            }
          }
          // If none matched, try last button with an SVG icon in the wizard footer/header
          if (!opened) {
            const svgBtns = page.locator("button:has(svg)");
            const count = await svgBtns.count();
            if (count > 0) {
              await svgBtns.last().click({ timeout: UI_TIMEOUT }).catch(() => {});
              await page.waitForTimeout(600);
            }
          }
          await shot(page, dir, "wizard-context-panel-open");
          // Close context panel (click the same toggle again)
          const panelClose = page.locator("[data-testid*='context-panel'], [aria-label*='context']").first();
          await panelClose.click({ timeout: UI_TIMEOUT }).catch(() => {});
        }

        // Mobile carousel swipe (only meaningful on mobile viewports)
        if (cfg.viewport.width <= 430) {
          const carousel = page.locator("[class*='carousel'], [class*='swipe'], [data-testid*='carousel']").first();
          if (await carousel.isVisible({ timeout: UI_TIMEOUT }).catch(() => false)) {
            const box = await carousel.boundingBox();
            if (box) {
              await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2);
              await page.mouse.down();
              await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 10 });
              await page.mouse.up();
              await page.waitForTimeout(500);
            }
          }
        }
        await shot(page, dir, "wizard-mobile-carousel");

        // Navigate to summary via repeated Next clicks
        for (let i = 0; i < 10; i++) {
          const nb = page.getByRole("button", { name: /next/i }).first();
          if (await nb.isVisible({ timeout: 1_500 }).catch(() => false)) {
            await nb.click();
            await page.waitForTimeout(600);
          } else {
            break;
          }
        }
        await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
        await page.waitForTimeout(600);
        await shot(page, dir, "wizard-summary");
      } else {
        // Wizard unavailable — screenshot sessions page for all wizard slugs
        console.log(`  ! Wizard unavailable for ${cfg.label} — using sessions page as fallback`);
        await nav(page, "/sessions");
        for (const slug of wizardSlugs) {
          await shot(page, dir, slug);
        }
      }

      await ctx.close();
    }

    console.log(`--- ${cfg.label} done ---`);
  }
});
