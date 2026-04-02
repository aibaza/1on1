/**
 * Capture help screenshots in all 4 variants: EN/RO x light/dark.
 * Each screenshot waits for full page load including charts and avatars.
 * Run: PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser npx tsx scripts/capture-all-screenshots.ts
 */
import { chromium, type Page, type Browser } from "playwright";
import { execSync } from "child_process";
import { join } from "path";
import { mkdirSync, readdirSync, unlinkSync, existsSync } from "fs";

const BASE_URL = process.env.BASE_URL || "http://localhost:4300";
const OUT_BASE = join(process.cwd(), "public/help/screenshots");
const EMAIL = "alice@acme.example.com";
const PASSWORD = "password123";

const SERIES_ID = "45968977-d008-44c0-a4bf-d8a175b218bf";
const COMPLETED_SESSION_ID = "c22f80d7-1da1-443a-9fe5-2f60869edda2";
const TEMPLATE_ID = "dddddddd-0002-4000-a000-000000000002";
const INDIVIDUAL_ID = "aaaaaaaa-0002-4000-a000-000000000002";
const TEAM_ID = "aaaaaaaa-0020-4000-a000-000000000020";

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate((t) => {
    localStorage.setItem("theme", t);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(t);
    localStorage.setItem("next-theme", t);
  }, theme);
}

async function hideDevOverlay(page: Page) {
  await page.evaluate(() => {
    // Hide Next.js dev overlay that intercepts pointer events
    const portals = document.querySelectorAll("nextjs-portal");
    portals.forEach((p) => ((p as HTMLElement).style.display = "none"));
    // Also try the script-based overlay
    const scripts = document.querySelectorAll(
      'script[data-nextjs-dev-overlay="true"]'
    );
    scripts.forEach((s) => {
      const next = s.nextElementSibling;
      if (next && next.tagName === "NEXTJS-PORTAL") {
        (next as HTMLElement).style.display = "none";
      }
    });
  });
}

async function setLocale(page: Page, locale: "en" | "ro") {
  await page.evaluate((l) => {
    document.cookie = `NEXT_LOCALE=${l}; path=/; max-age=31536000`;
  }, locale);
}

async function navigateAndWait(
  page: Page,
  url: string,
  theme: "light" | "dark",
  waitMs: number = 6000
) {
  await page.goto(`${BASE_URL}${url}`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await setTheme(page, theme);
  await hideDevOverlay(page);
  await page.waitForTimeout(waitMs);
}

async function login(page: Page) {
  console.log("Logging in...");
  // Step 1: Get CSRF token
  await page.goto(`${BASE_URL}/api/auth/csrf`, { waitUntil: "networkidle" });
  const csrfText = await page.textContent("body");
  const csrfData = JSON.parse(csrfText || "{}");
  const csrfToken = csrfData.csrfToken;
  console.log("  Got CSRF token");

  // Step 2: Post credentials via fetch (avoids redirect)
  const result = await page.evaluate(
    async ({ url, email, password, csrf }) => {
      const resp = await fetch(`${url}/api/auth/callback/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          email,
          password,
          csrfToken: csrf,
        }),
        redirect: "manual", // Don't follow redirect
      });
      return {
        status: resp.status,
        headers: Object.fromEntries(resp.headers.entries()),
        type: resp.type,
      };
    },
    { url: BASE_URL, email: EMAIL, password: PASSWORD, csrf: csrfToken }
  );
  console.log("  Auth response:", result.status, result.type);

  // The session cookie should now be set. Verify by navigating.
  await page.goto(`${BASE_URL}/overview`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  const currentUrl = page.url();
  console.log("  After login, URL:", currentUrl);

  if (currentUrl.includes("/login")) {
    // If still on login page, try direct form submission
    console.log("  Cookie auth failed, trying form login...");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await hideDevOverlay(page);

    const emailInput =
      (await page.$('input[type="email"]')) ||
      (await page.$('input[name="email"]'));
    const passInput =
      (await page.$('input[type="password"]')) ||
      (await page.$('input[name="password"]'));
    if (emailInput && passInput) {
      await emailInput.fill(EMAIL);
      await passInput.fill(PASSWORD);
      await page.waitForTimeout(300);
      const btn = await page.$('button[type="submit"]');
      if (btn) {
        await btn.click({ force: true });
      }
    }
    await page.waitForTimeout(5000);
    console.log("  After form login, URL:", page.url());
  }
}

async function screenshot(
  page: Page,
  outDir: string,
  name: string,
  opts: { fullPage?: boolean; selector?: string } = {}
) {
  const path = join(outDir, `${name}.png`);
  try {
    if (opts.selector) {
      const el = await page.$(opts.selector);
      if (el) {
        await el.screenshot({ path });
        console.log(`    [OK] ${name} (element: ${opts.selector})`);
        return;
      }
      console.log(
        `    [WARN] selector "${opts.selector}" not found, capturing viewport`
      );
    }
    await page.screenshot({ path, fullPage: opts.fullPage ?? false });
    console.log(`    [OK] ${name}`);
  } catch (err) {
    console.error(
      `    [FAIL] ${name}:`,
      err instanceof Error ? err.message : err
    );
  }
}

async function safeClick(page: Page, selector: string): Promise<boolean> {
  const el = await page.$(selector);
  if (!el) return false;
  await hideDevOverlay(page);
  try {
    await el.click({ force: true, timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function captureSet(
  page: Page,
  locale: "en" | "ro",
  theme: "light" | "dark"
) {
  const outDir = join(OUT_BASE, locale, theme);
  mkdirSync(outDir, { recursive: true });
  console.log(
    `\n========== ${locale.toUpperCase()} / ${theme.toUpperCase()} ==========`
  );

  // Set locale cookie first
  await setLocale(page, locale);
  await setTheme(page, theme);

  // Force locale by navigating first
  await navigateAndWait(page, "/overview", theme, 3000);

  // --- 1. Dashboard overview ---
  console.log("  [1] dashboard-overview");
  await navigateAndWait(page, "/overview", theme, 6000);
  await screenshot(page, outDir, "dashboard-overview");

  // --- 2. Sidebar navigation ---
  console.log("  [2] sidebar-navigation");
  await hideDevOverlay(page);
  // Check if sidebar is collapsed and expand it
  const sidebarEl = await page.$("aside");
  if (sidebarEl) {
    const box = await sidebarEl.boundingBox();
    if (box && box.width < 100) {
      // Sidebar is collapsed, try to expand
      await safeClick(page, '[data-sidebar="trigger"]');
      await page.waitForTimeout(1000);
      await setTheme(page, theme);
    }
  }
  await screenshot(page, outDir, "sidebar-navigation", { selector: "aside" });

  // --- 3. Sessions list ---
  console.log("  [3] sessions-list");
  await navigateAndWait(page, "/sessions", theme, 5000);
  await screenshot(page, outDir, "sessions-list");

  // --- 4. Session create form ---
  console.log("  [4] session-create-form");
  await navigateAndWait(page, "/sessions/new", theme, 4000);
  await screenshot(page, outDir, "session-create-form");

  // --- 5-9. Wizard screenshots ---
  console.log("  [5] Starting wizard session...");
  await navigateAndWait(
    page,
    `/sessions?series=${SERIES_ID}`,
    theme,
    5000
  );

  // Find and click Start button
  let wizardUrl: string | null = null;
  const startClicked = await safeClick(
    page,
    'a:has-text("Start"), button:has-text("Start"), a:has-text("Începe"), button:has-text("Începe")'
  );
  if (startClicked) {
    await page.waitForTimeout(6000);
    await setTheme(page, theme);
    await hideDevOverlay(page);
    wizardUrl = page.url();
    console.log(`    Wizard URL: ${wizardUrl}`);
  }

  if (wizardUrl && wizardUrl.includes("/wizard/")) {
    // 6. Recap step (step 0)
    console.log("  [6] session-wizard-recap");
    await setTheme(page, theme);
    await page.waitForTimeout(3000);
    await screenshot(page, outDir, "session-wizard-recap");

    // 7. Category step - navigate to step 1
    console.log("  [7] session-wizard-category");
    let moved = await safeClick(
      page,
      'button:has-text("Next"), button:has-text("Următorul"), button[aria-label*="next"]'
    );
    if (!moved) {
      // Try clicking step tabs/indicators
      const stepBtns = await page.$$(
        '[data-step], [role="tab"], .step-indicator'
      );
      if (stepBtns.length > 1) {
        await stepBtns[1].click({ force: true });
        moved = true;
      }
    }
    if (moved) {
      await page.waitForTimeout(3000);
      await setTheme(page, theme);
      await hideDevOverlay(page);
    }

    // Try to fill in some answers
    const textareas = await page.$$("textarea");
    for (let i = 0; i < Math.min(textareas.length, 2); i++) {
      try {
        await textareas[i].fill(
          locale === "en"
            ? "The team collaboration has been excellent this sprint. We shipped the new feature on time."
            : "Colaborarea echipei a fost excelenta in acest sprint. Am livrat functionalitatea la timp."
        );
      } catch {}
    }
    // Try radio/scale inputs
    const radioButtons = await page.$$('input[type="radio"], [role="radio"]');
    if (radioButtons.length > 0) {
      const idx = Math.min(3, radioButtons.length - 1);
      try {
        await radioButtons[idx].click({ force: true });
      } catch {}
    }
    await page.waitForTimeout(2000);
    await setTheme(page, theme);
    await screenshot(page, outDir, "session-wizard-category");

    // 8. Context panel
    console.log("  [8] session-wizard-context");
    const ctxClicked = await safeClick(
      page,
      'button[aria-label*="ontext"], button[aria-label*="ayers"], button:has-text("Context"), button:has-text("Layers"), [data-context-toggle]'
    );
    if (ctxClicked) {
      await page.waitForTimeout(2000);
      await setTheme(page, theme);
    }
    await screenshot(page, outDir, "session-wizard-context");

    // 9. Summary step (last step)
    console.log("  [9] session-wizard-summary");
    const allStepBtns = await page.$$(
      '[data-step], [role="tab"], .step-indicator, .wizard-step'
    );
    if (allStepBtns.length > 0) {
      try {
        await allStepBtns[allStepBtns.length - 1].click({ force: true });
        await page.waitForTimeout(4000);
        await setTheme(page, theme);
      } catch {}
    } else {
      // Click Next multiple times
      for (let i = 0; i < 10; i++) {
        const nb = await page.$(
          'button:has-text("Next"), button:has-text("Următorul"), button[aria-label*="next"]'
        );
        if (nb) {
          try {
            await nb.click({ force: true });
            await page.waitForTimeout(1500);
            await setTheme(page, theme);
            await hideDevOverlay(page);
          } catch {
            break;
          }
        } else break;
      }
    }
    await screenshot(page, outDir, "session-wizard-summary");
  } else {
    console.log(
      "    [WARN] Could not start wizard session, capturing fallback pages"
    );
    for (const name of [
      "session-wizard-recap",
      "session-wizard-category",
      "session-wizard-context",
      "session-wizard-summary",
    ]) {
      await screenshot(page, outDir, name);
    }
  }

  // --- 10. Session summary (completed session) ---
  console.log("  [10] session-summary");
  await navigateAndWait(
    page,
    `/sessions/${COMPLETED_SESSION_ID}/summary`,
    theme,
    6000
  );
  await screenshot(page, outDir, "session-summary");

  // --- 11. Session history ---
  console.log("  [11] session-history");
  await navigateAndWait(page, "/history", theme, 5000);
  await screenshot(page, outDir, "session-history");

  // --- 12. Action items list ---
  console.log("  [12] action-items-list");
  await navigateAndWait(page, "/action-items", theme, 5000);
  await screenshot(page, outDir, "action-items-list");

  // --- 13. Action item create ---
  console.log("  [13] action-item-create");
  const addClicked = await safeClick(
    page,
    'button:has-text("Add"), button:has-text("New"), button:has-text("Create"), button:has-text("Adaugă"), button:has-text("Nou"), a:has-text("Add"), a:has-text("New")'
  );
  if (addClicked) {
    await page.waitForTimeout(2000);
    await setTheme(page, theme);
    await hideDevOverlay(page);
  }
  await screenshot(page, outDir, "action-item-create");

  // --- 14. Templates list ---
  console.log("  [14] templates-list");
  await navigateAndWait(page, "/templates", theme, 5000);
  await screenshot(page, outDir, "templates-list");

  // --- 15. Template editor ---
  console.log("  [15] template-create");
  await navigateAndWait(page, `/templates/${TEMPLATE_ID}`, theme, 5000);
  await screenshot(page, outDir, "template-create");

  // --- 16. AI template editor ---
  console.log("  [16] template-ai-editor");
  await navigateAndWait(page, "/templates/ai-editor", theme, 5000);
  await screenshot(page, outDir, "template-ai-editor");

  // --- 17. Analytics dashboard ---
  console.log("  [17] analytics-dashboard");
  await navigateAndWait(page, "/analytics", theme, 6000);
  await screenshot(page, outDir, "analytics-dashboard");

  // --- 18. Analytics individual ---
  console.log("  [18] analytics-individual");
  await navigateAndWait(
    page,
    `/analytics/individual/${INDIVIDUAL_ID}`,
    theme,
    6000
  );
  await screenshot(page, outDir, "analytics-individual");

  // --- 19. Analytics team ---
  console.log("  [19] analytics-team");
  await navigateAndWait(page, `/analytics/team/${TEAM_ID}`, theme, 6000);
  await screenshot(page, outDir, "analytics-team");

  // --- 20. People management ---
  console.log("  [20] people-management");
  await navigateAndWait(page, "/people", theme, 5000);
  await screenshot(page, outDir, "people-management");

  // --- 21. People invite modal ---
  console.log("  [21] people-invite");
  const inviteClicked = await safeClick(
    page,
    'button:has-text("Invite"), button:has-text("Invită"), a:has-text("Invite"), a:has-text("Invită")'
  );
  if (inviteClicked) {
    await page.waitForTimeout(2000);
    await setTheme(page, theme);
    await hideDevOverlay(page);
    // Open role dropdown
    const roleClicked = await safeClick(
      page,
      'button:has-text("Role"), button:has-text("Rol"), [data-role-select], [role="combobox"]'
    );
    if (roleClicked) {
      await page.waitForTimeout(1000);
      await setTheme(page, theme);
    }
  }
  await screenshot(page, outDir, "people-invite");

  // --- 22. Teams list ---
  console.log("  [22] teams-list");
  await navigateAndWait(page, "/teams", theme, 5000);
  await screenshot(page, outDir, "teams-list");

  // --- 23. Team detail ---
  console.log("  [23] teams-detail");
  await navigateAndWait(page, `/teams/${TEAM_ID}`, theme, 5000);
  await screenshot(page, outDir, "teams-detail");

  // --- 24. Settings company ---
  console.log("  [24] settings-company");
  await navigateAndWait(page, "/settings/company", theme, 4000);
  await screenshot(page, outDir, "settings-company");

  // --- 25. Settings billing ---
  console.log("  [25] settings-billing");
  await navigateAndWait(page, "/settings/billing", theme, 4000);
  await screenshot(page, outDir, "settings-billing");

  // --- 26. Settings audit log ---
  console.log("  [26] settings-audit-log");
  await navigateAndWait(page, "/settings/audit-log", theme, 5000);
  await screenshot(page, outDir, "settings-audit-log");

  // --- 27. Account settings ---
  console.log("  [27] account-settings");
  await navigateAndWait(page, "/account", theme, 4000);
  await screenshot(page, outDir, "account-settings");

  // --- 28. Account security ---
  console.log("  [28] account-security");
  await page.evaluate(() => {
    const secEl = document.querySelector(
      '[id*="security"], [id*="Security"], h2, h3'
    );
    if (secEl)
      secEl.scrollIntoView({ behavior: "instant", block: "start" });
    else window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForTimeout(1000);
  await setTheme(page, theme);
  await screenshot(page, outDir, "account-security");

  // --- 29. Login page (unauthenticated) ---
  console.log("  [29] login-page");
  const browser = page.context().browser()!;
  const loginCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const loginPage = await loginCtx.newPage();
  // Set locale cookie
  await loginPage.goto(`${BASE_URL}/login`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await loginPage.evaluate(
    ({ l, t }) => {
      document.cookie = `NEXT_LOCALE=${l}; path=/; max-age=31536000`;
      localStorage.setItem("theme", t);
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(t);
    },
    { l: locale, t: theme }
  );
  // Reload to apply locale
  await loginPage.goto(`${BASE_URL}/login`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await loginPage.evaluate((t) => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(t);
  }, theme);
  await loginPage.waitForTimeout(2000);
  await loginPage.screenshot({
    path: join(outDir, "login-page.png"),
    fullPage: false,
  });
  console.log("    [OK] login-page");
  await loginPage.close();
  await loginCtx.close();

  // --- Convert PNGs to JPEGs ---
  console.log(`  Converting PNGs to JPEGs in ${locale}/${theme}...`);
  const pngs = readdirSync(outDir).filter((f) => f.endsWith(".png"));
  let converted = 0;
  for (const f of pngs) {
    const base = f.replace(".png", "");
    try {
      execSync(
        `convert "${join(outDir, f)}" -resize '1200x>' -quality 85 -strip "${join(outDir, base + ".jpg")}"`,
        { stdio: "pipe" }
      );
      unlinkSync(join(outDir, f));
      converted++;
    } catch {
      console.error(`    [FAIL] convert ${f}`);
    }
  }
  console.log(`  Converted ${converted}/${pngs.length} files`);
}

async function main() {
  console.log("Starting screenshot capture...");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Output: ${OUT_BASE}`);

  const browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    headless: true,
  });

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await ctx.newPage();

  // Login once
  await login(page);

  // Capture all 4 variants
  const variants: Array<[locale: "en" | "ro", theme: "light" | "dark"]> = [
    ["en", "light"],
    ["en", "dark"],
    ["ro", "light"],
    ["ro", "dark"],
  ];

  for (const [locale, theme] of variants) {
    await captureSet(page, locale, theme);
  }

  await browser.close();

  // Final report
  console.log("\n========== FINAL REPORT ==========");
  let totalJpgs = 0;
  for (const [locale, theme] of variants) {
    const dir = join(OUT_BASE, locale, theme);
    if (existsSync(dir)) {
      const files = readdirSync(dir);
      const jpgs = files.filter((f) => f.endsWith(".jpg"));
      const pngs = files.filter((f) => f.endsWith(".png"));
      console.log(
        `  ${locale}/${theme}: ${jpgs.length} JPGs, ${pngs.length} PNGs remaining`
      );
      totalJpgs += jpgs.length;
    } else {
      console.log(`  ${locale}/${theme}: directory not found`);
    }
  }
  console.log(`\n  TOTAL: ${totalJpgs} JPG screenshots across all variants`);
  console.log("\nDone!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
