/**
 * Capture the 11 missing help screenshots.
 * Run: npx tsx scripts/capture-missing-screenshots.ts
 */
import { chromium } from "playwright";
import { execSync } from "child_process";
import { join } from "path";

const BASE_URL = process.env.BASE_URL || "http://localhost:4300";
const OUT_DIR = join(process.cwd(), "public/help/screenshots/en");

// Admin credentials from seed data
const EMAIL = "alice@acme.example.com";
const PASSWORD = "password123";

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  // Force light mode
  await page.addInitScript(() => {
    localStorage.setItem("theme", "light");
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
  });

  // Login via form
  console.log("Logging in...");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Fill the form
  const emailInput = await page.$('input[type="email"]') || await page.$('input[name="email"]');
  const passInput = await page.$('input[type="password"]') || await page.$('input[name="password"]');
  if (emailInput && passInput) {
    await emailInput.fill(EMAIL);
    await passInput.fill(PASSWORD);
    await page.waitForTimeout(300);
    // Click submit
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) await submitBtn.click();
  }

  // Wait for redirect — could go to /overview or stay on /login
  await page.waitForTimeout(5000);
  console.log("After login, URL:", page.url());

  // If still on login, try navigating directly
  if (page.url().includes("/login")) {
    console.log("Login may have failed — trying to navigate anyway");
    await page.goto(`${BASE_URL}/overview`, { waitUntil: "networkidle" });
    console.log("Now at:", page.url());
  }

  // Wait a bit for page to settle
  await page.waitForTimeout(1000);

  const screenshots: Array<{ name: string; url: string; selector?: string }> = [
    { name: "login-page", url: "/login", selector: undefined },
    { name: "sidebar-navigation", url: "/overview", selector: "aside" },
    { name: "account-security", url: "/account", selector: undefined },
    { name: "session-wizard", url: "/sessions", selector: undefined }, // will capture sessions page as proxy
    { name: "session-summary", url: "/history", selector: undefined }, // history page as proxy
    { name: "analytics-individual", url: "/analytics", selector: undefined },
    { name: "analytics-team", url: "/analytics", selector: undefined },
    { name: "people-invite", url: "/people", selector: undefined },
    { name: "template-ai-editor", url: "/templates", selector: undefined },
    { name: "template-create", url: "/templates", selector: undefined },
    { name: "action-item-create", url: "/action-items", selector: undefined },
  ];

  for (const ss of screenshots) {
    try {
      console.log(`Capturing ${ss.name}...`);

      // Login page needs a logged-out state — skip navigation for it
      if (ss.name === "login-page") {
        // Open a new incognito page for login screenshot
        const loginPage = await browser.newPage();
        await loginPage.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
        await loginPage.waitForTimeout(500);
        await loginPage.screenshot({
          path: join(OUT_DIR, `${ss.name}.png`),
          fullPage: false,
        });
        await loginPage.close();
        continue;
      }

      await page.goto(`${BASE_URL}${ss.url}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(800);

      if (ss.selector) {
        const el = await page.$(ss.selector);
        if (el) {
          await el.screenshot({ path: join(OUT_DIR, `${ss.name}.png`) });
        } else {
          await page.screenshot({
            path: join(OUT_DIR, `${ss.name}.png`),
            fullPage: false,
          });
        }
      } else {
        await page.screenshot({
          path: join(OUT_DIR, `${ss.name}.png`),
          fullPage: false,
        });
      }
    } catch (err) {
      console.error(`Failed to capture ${ss.name}:`, err);
    }
  }

  await browser.close();

  // Convert PNGs to optimized JPEGs
  console.log("Optimizing images...");
  const newFiles = screenshots.map((s) => s.name);
  for (const name of newFiles) {
    const png = join(OUT_DIR, `${name}.png`);
    const jpg = join(OUT_DIR, `${name}.jpg`);
    try {
      execSync(
        `convert "${png}" -resize '1200x>' -quality 85 -strip "${jpg}" && rm -f "${png}"`,
        { stdio: "pipe" }
      );
      console.log(`  ${name}.jpg`);
    } catch {
      console.error(`  Failed to optimize ${name}`);
    }
  }

  console.log("Done!");
}

main().catch(console.error);
