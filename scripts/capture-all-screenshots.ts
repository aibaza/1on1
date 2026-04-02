/**
 * Capture help screenshots in all 4 variants: EN/RO × light/dark.
 * Each screenshot waits for full page load including charts and avatars.
 * Run: PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser npx tsx scripts/capture-all-screenshots.ts
 */
import { chromium, type Page } from "playwright";
import { execSync } from "child_process";
import { join } from "path";
import { mkdirSync, readdirSync, unlinkSync } from "fs";

const BASE_URL = process.env.BASE_URL || "http://localhost:4300";
const OUT_BASE = join(process.cwd(), "public/help/screenshots");
const EMAIL = "alice@acme.example.com";
const PASSWORD = "password123";

const PAGES = [
  { name: "dashboard-overview", url: "/overview", wait: 6000 },
  { name: "sessions-list", url: "/sessions", wait: 5000 },
  { name: "session-create-form", url: "/sessions/new", wait: 4000 },
  { name: "action-items-list", url: "/action-items", wait: 5000 },
  { name: "action-item-create", url: "/action-items", wait: 5000 },
  { name: "session-history", url: "/history", wait: 5000 },
  { name: "analytics-dashboard", url: "/analytics", wait: 6000 },
  { name: "analytics-individual", url: "/analytics", wait: 6000 },
  { name: "analytics-team", url: "/analytics", wait: 6000 },
  { name: "people-management", url: "/people", wait: 5000 },
  { name: "people-invite", url: "/people", wait: 5000 },
  { name: "teams-list", url: "/teams", wait: 5000 },
  { name: "templates-list", url: "/templates", wait: 5000 },
  { name: "template-create", url: "/templates", wait: 5000 },
  { name: "template-ai-editor", url: "/templates", wait: 5000 },
  { name: "settings-company", url: "/settings/company", wait: 4000 },
  { name: "settings-billing", url: "/settings/billing", wait: 4000 },
  { name: "settings-audit-log", url: "/settings/audit-log", wait: 5000 },
  { name: "account-settings", url: "/account", wait: 4000 },
  { name: "account-security", url: "/account", wait: 4000 },
  { name: "session-wizard", url: "/sessions", wait: 5000 },
  { name: "session-summary", url: "/history", wait: 5000 },
  { name: "sidebar-navigation", url: "/overview", wait: 5000, selector: "aside" },
  { name: "dashboard-quick-stats", url: "/overview", wait: 6000 },
];

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate((t) => {
    localStorage.setItem("theme", t);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(t);
  }, theme);
}

async function setLocale(page: Page, locale: "en" | "ro") {
  await page.evaluate(
    (l) => {
      document.cookie = `NEXT_LOCALE=${l}; path=/; max-age=31536000`;
    },
    locale
  );
}

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
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
    if (btn) await btn.click();
  }
  await page.waitForTimeout(5000);
}

async function captureSet(
  page: Page,
  locale: "en" | "ro",
  theme: "light" | "dark"
) {
  const outDir = join(OUT_BASE, locale, theme);
  mkdirSync(outDir, { recursive: true });

  console.log(`\n=== ${locale.toUpperCase()} / ${theme} ===`);

  // Set locale and theme
  await setLocale(page, locale);
  await setTheme(page, theme);

  // Navigate to overview first to apply locale
  await page.goto(`${BASE_URL}/overview`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  // Re-apply theme (page navigation may reset it)
  await setTheme(page, theme);

  for (const pg of PAGES) {
    console.log(`  ${pg.name}...`);
    await page.goto(`${BASE_URL}${pg.url}`, { waitUntil: "networkidle" });
    // Re-apply theme after navigation
    await setTheme(page, theme);
    // Wait for charts, avatars, async data
    await page.waitForTimeout(pg.wait);

    try {
      if (pg.selector) {
        const el = await page.$(pg.selector);
        if (el) {
          await el.screenshot({ path: join(outDir, `${pg.name}.png`) });
        } else {
          await page.screenshot({
            path: join(outDir, `${pg.name}.png`),
            fullPage: false,
          });
        }
      } else {
        await page.screenshot({
          path: join(outDir, `${pg.name}.png`),
          fullPage: false,
        });
      }
    } catch (err) {
      console.error(`  FAILED: ${pg.name}`, err);
    }
  }

  // Login page needs unauthenticated context
  console.log(`  login-page...`);
  const loginPage = await page.context().browser()!.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  await loginPage.addInitScript(
    (t) => {
      localStorage.setItem("theme", t);
      document.documentElement.classList.add(t);
    },
    theme
  );
  await loginPage.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await loginPage.waitForTimeout(2000);
  await loginPage.screenshot({
    path: join(outDir, "login-page.png"),
    fullPage: false,
  });
  await loginPage.close();

  // Optimize PNGs → JPEGs
  console.log(`  Optimizing ${locale}/${theme}...`);
  for (const f of readdirSync(outDir).filter((f) => f.endsWith(".png"))) {
    const base = f.replace(".png", "");
    try {
      execSync(
        `convert "${join(outDir, f)}" -resize '1200x>' -quality 85 -strip "${join(outDir, base + ".jpg")}"`,
        { stdio: "pipe" }
      );
      unlinkSync(join(outDir, f));
    } catch {
      console.error(`  Failed to optimize ${f}`);
    }
  }
}

async function main() {
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
  await captureSet(page, "en", "light");
  await captureSet(page, "en", "dark");
  await captureSet(page, "ro", "light");
  await captureSet(page, "ro", "dark");

  await browser.close();
  console.log("\nAll done!");
}

main().catch(console.error);
