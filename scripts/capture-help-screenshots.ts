/**
 * Capture help documentation screenshots for 1on1 application.
 *
 * Launches a headless Chromium browser, authenticates as an admin user,
 * and takes screenshots of every major page in light mode.
 *
 * Prerequisites:
 *   - App running at http://localhost:4300
 *   - Seed data loaded (bun run db:seed)
 *   - Playwright browsers installed (npx playwright install chromium)
 *
 * Usage:
 *   npx tsx scripts/capture-help-screenshots.ts
 *   # or with bun (may need PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH for snap):
 *   bun run scripts/capture-help-screenshots.ts
 *
 * Environment variables:
 *   PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH — override Chromium binary path
 *   BASE_URL — override app URL (default: http://localhost:4300)
 *
 * Post-processing (requires ImageMagick):
 *   The script automatically converts PNGs to optimized JPEGs at the end.
 */

import { chromium, type Page, type BrowserContext } from "playwright";
import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = process.env.BASE_URL || "http://localhost:4300";
const OUTPUT_DIR = path.resolve(__dirname, "../public/help/screenshots/en");

const CREDENTIALS = {
  email: "alice@acme.example.com",
  password: "password123",
};

const VIEWPORT = { width: 1440, height: 900 };
const DEVICE_SCALE_FACTOR = 2;

/** Extra settle time (ms) after load for JS rendering / animations */
const SETTLE_MS = 2000;

/** Per-page navigation timeout */
const NAV_TIMEOUT = 20_000;

// ---------------------------------------------------------------------------
// Page definitions
// ---------------------------------------------------------------------------

interface PageCapture {
  /** URL path (appended to BASE_URL) */
  path: string;
  /** Filename for full-page screenshot (without extension) */
  name: string;
  /** Optional element-level crops: selector -> filename */
  crops?: Record<string, string>;
}

const PAGES: PageCapture[] = [
  {
    path: "/overview",
    name: "dashboard-overview",
    crops: {
      "[data-testid='quick-stats'], .quick-stats, section:first-of-type":
        "dashboard-quick-stats",
    },
  },
  {
    path: "/sessions",
    name: "sessions-list",
    crops: {
      "[data-testid='session-card'], .session-card, article:first-of-type":
        "sessions-card",
    },
  },
  {
    path: "/sessions/new",
    name: "session-create-form",
  },
  {
    path: "/action-items",
    name: "action-items-list",
    crops: {
      "table, [role='table'], [data-testid='action-items-table']":
        "action-items-table",
    },
  },
  {
    path: "/history",
    name: "session-history",
  },
  {
    path: "/analytics",
    name: "analytics-dashboard",
    crops: {
      ".recharts-wrapper, [data-testid='analytics-chart'], svg.recharts-surface":
        "analytics-chart",
    },
  },
  {
    path: "/people",
    name: "people-management",
  },
  {
    path: "/teams",
    name: "teams-list",
  },
  {
    path: "/templates",
    name: "templates-list",
  },
  {
    path: "/settings/company",
    name: "settings-company",
  },
  {
    path: "/settings/billing",
    name: "settings-billing",
  },
  {
    path: "/settings/audit-log",
    name: "settings-audit-log",
  },
  {
    path: "/account",
    name: "account-settings",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function login(context: BrowserContext): Promise<void> {
  const page = await context.newPage();

  try {
    console.log("  Logging in via Auth.js credentials API...");

    // Step 1: Get CSRF token from Auth.js
    await page.goto(`${BASE_URL}/api/auth/csrf`, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT,
    });
    const csrfResponse = await page.evaluate(() =>
      JSON.parse(document.body.innerText)
    );
    const csrfToken = csrfResponse.csrfToken;
    console.log(`  CSRF token obtained.`);

    // Step 2: POST credentials to Auth.js sign-in endpoint
    const response = await page.evaluate(
      async ({ url, csrf, email, password }) => {
        const res = await fetch(`${url}/api/auth/callback/credentials`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            csrfToken: csrf,
            email,
            password,
            callbackUrl: `${url}/overview`,
          }),
          redirect: "manual",
        });
        return { status: res.status, location: res.headers.get("location"), url: res.url };
      },
      {
        url: BASE_URL,
        csrf: csrfToken,
        email: CREDENTIALS.email,
        password: CREDENTIALS.password,
      }
    );

    console.log(`  Auth response: status=${response.status}, url=${response.url}`);

    // Step 3: Navigate to overview to verify session
    await page.goto(`${BASE_URL}/overview`, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT,
    });

    const finalUrl = page.url();
    if (finalUrl.includes("/login")) {
      throw new Error(`Login failed — redirected back to login: ${finalUrl}`);
    }

    console.log(`  Logged in successfully. Current URL: ${finalUrl}`);
  } finally {
    await page.close();
  }
}

async function setLightMode(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.setItem("theme", "light");
    document.documentElement.classList.remove("dark");
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.style.colorScheme = "light";
  });
}

async function captureFullPage(page: Page, filepath: string): Promise<void> {
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`    Saved: ${path.basename(filepath)}`);
}

async function captureCrop(
  page: Page,
  selector: string,
  filepath: string
): Promise<boolean> {
  const selectors = selector.split(",").map((s) => s.trim());

  for (const sel of selectors) {
    try {
      const element = await page.$(sel);
      if (element) {
        const box = await element.boundingBox();
        if (box && box.width > 10 && box.height > 10) {
          await element.screenshot({ path: filepath });
          console.log(`    Cropped: ${path.basename(filepath)}`);
          return true;
        }
      }
    } catch {
      // Selector not found or not visible, try next
    }
  }
  return false;
}

async function capturePage(
  page: Page,
  def: PageCapture
): Promise<void> {
  const url = `${BASE_URL}${def.path}`;
  console.log(`  [${def.name}] Navigating to ${def.path}`);

  // Navigate with domcontentloaded (reliable) then let JS render
  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: NAV_TIMEOUT,
  });

  // Force light mode
  await setLightMode(page);

  // Settle time for React hydration, charts, animations
  await page.waitForTimeout(SETTLE_MS);

  // Full page screenshot
  const fullPath = path.join(OUTPUT_DIR, `${def.name}.png`);
  await captureFullPage(page, fullPath);

  // Cropped element screenshots
  if (def.crops) {
    for (const [selector, cropName] of Object.entries(def.crops)) {
      const cropPath = path.join(OUTPUT_DIR, `${cropName}.png`);
      const found = await captureCrop(page, selector, cropPath);
      if (!found) {
        console.log(`    Crop skipped (no matching element): ${cropName}`);
      }
    }
  }
}

function postProcess(): void {
  console.log("\nPost-processing screenshots with ImageMagick...");

  // Check if ImageMagick is available
  try {
    execSync("which magick || which convert", { stdio: "pipe" });
  } catch {
    console.warn(
      "  ImageMagick not found. Skipping post-processing.\n" +
        "  Install with: sudo apt install imagemagick"
    );
    return;
  }

  // ImageMagick 7 uses `magick`, 6 uses `convert`
  let convertCmd: string;
  try {
    execSync("which magick", { stdio: "pipe" });
    convertCmd = "magick";
  } catch {
    convertCmd = "convert";
  }

  const pngDir = OUTPUT_DIR;

  // For each PNG: resize to max 1200px wide, convert to JPEG quality 85, strip EXIF
  const cmd =
    "for f in " + JSON.stringify(pngDir) + "/*.png; do\n" +
    '  [ -f "$f" ] || continue\n' +
    '  base="$(basename "$f" .png)"\n' +
    "  " +
    convertCmd +
    ' "$f" -resize "1200x>" -quality 85 -strip ' +
    JSON.stringify(pngDir) +
    '/"${base}.jpg"\n' +
    '  echo "  Converted: ${base}.png -> ${base}.jpg"\n' +
    "done";

  try {
    const output = execSync(cmd, { encoding: "utf-8", shell: "/bin/bash" });
    if (output) console.log(output.trimEnd());
    console.log("  Post-processing complete.");
  } catch (err) {
    console.error("  Post-processing failed:", err);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log("Launching browser...");
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    locale: "en-US",
    colorScheme: "light",
  });

  try {
    // Authenticate — cookies are stored on the context, shared by all pages
    console.log("\nStep 1: Authenticating...");
    await login(context);

    // Capture each page using a single shared page to avoid overwhelming the dev server
    console.log("\nStep 2: Capturing screenshots...\n");

    const page = await context.newPage();
    let succeeded = 0;
    let failed = 0;

    for (const def of PAGES) {
      try {
        await capturePage(page, def);
        succeeded++;
        // Small pause between pages to let the dev server breathe
        await page.waitForTimeout(500);
      } catch (err) {
        failed++;
        console.error(
          `    FAILED to capture ${def.name}:`,
          (err as Error).message?.split("\n")[0] || err
        );
      }
    }

    await page.close();

    console.log(`\n  Results: ${succeeded} captured, ${failed} failed.`);

    // Post-process
    if (succeeded > 0) {
      console.log("\nStep 3: Post-processing...");
      postProcess();
    }

    console.log("\nDone! Screenshots saved to:", OUTPUT_DIR);
  } catch (err) {
    console.error("Screenshot capture failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
