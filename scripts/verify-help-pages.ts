/**
 * Verify help pages load correctly on Vercel preview.
 * Run: PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser npx tsx scripts/verify-help-pages.ts
 */
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "https://1on1-5w99s32dx-surcod.vercel.app";
const EMAIL = "alice@acme.example.com";
const PASSWORD = "password123";

const HELP_SLUGS = [
  "getting-started/overview",
  "getting-started/first-login",
  "getting-started/navigation",
  "sessions/scheduling",
  "sessions/wizard",
  "sessions/summary",
  "sessions/history",
  "action-items/overview",
  "action-items/managing",
  "templates/overview",
  "templates/creating",
  "templates/ai-editor",
  "analytics/dashboard",
  "analytics/individual",
  "analytics/team",
  "people/managing",
  "people/inviting",
  "teams/overview",
  "settings/company",
  "settings/billing",
  "settings/audit-log",
  "account/profile",
  "account/security",
];

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    headless: true,
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Login
  console.log("Logging in at", BASE_URL);
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const emailInput = await page.$('input[type="email"]') || await page.$('input[name="email"]');
  const passInput = await page.$('input[type="password"]') || await page.$('input[name="password"]');
  if (emailInput && passInput) {
    await emailInput.fill(EMAIL);
    await passInput.fill(PASSWORD);
    await page.waitForTimeout(300);
    const btn = await page.$('button[type="submit"]');
    if (btn) await btn.click();
  }
  await page.waitForTimeout(5000);
  console.log("After login:", page.url());

  // Check help landing page
  console.log("\n=== Help Landing Page ===");
  await page.goto(`${BASE_URL}/help`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const landingTitle = await page.$eval("h1", (el) => el.textContent).catch(() => "NOT FOUND");
  const cardCount = await page.$$eval("a[href^='/help/']", (els) => els.length).catch(() => 0);
  console.log(`Title: "${landingTitle}", Section cards: ${cardCount}`);

  // Check each help page
  console.log("\n=== Help Articles ===");
  let pass = 0;
  let fail = 0;

  for (const slug of HELP_SLUGS) {
    await page.goto(`${BASE_URL}/help/${slug}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    // Check for article content (prose)
    const hasContent = await page.$eval("article", (el) => {
      const text = el.textContent?.trim() || "";
      return text.length > 50; // Must have substantial content
    }).catch(() => false);

    // Check for title
    const title = await page.$eval("h1", (el) => el.textContent?.trim() || "").catch(() => "");

    // Check for 404
    const is404 = page.url().includes("404") || title.toLowerCase().includes("not found");

    if (hasContent && !is404) {
      console.log(`  PASS  ${slug} (title: "${title}")`);
      pass++;
    } else {
      console.log(`  FAIL  ${slug} (title: "${title}", hasContent: ${hasContent}, is404: ${is404})`);
      fail++;
    }
  }

  console.log(`\n=== Results: ${pass} passed, ${fail} failed out of ${HELP_SLUGS.length} ===`);

  await browser.close();
}

main().catch(console.error);
