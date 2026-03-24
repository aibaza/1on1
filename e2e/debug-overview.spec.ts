import { test } from "@playwright/test";

const BASE = "https://1on1-git-develop-surcod.vercel.app";

test("Debug overview console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push("PAGE_ERROR: " + err.message));

  await page.goto(`${BASE}/login`);
  await page.locator('input[type="email"]').fill("ciprian@acme.example.com");
  await page.locator('input[type="password"]').fill("password123");
  await page.locator('button[type="submit"]').click();
  await page.waitForURL("**/overview**", { timeout: 15000 }).catch(() => {});

  await page.evaluate(() => {
    document.cookie = "DESIGN_PREF=editorial; path=/; max-age=31536000";
  });
  await page.goto(`${BASE}/overview`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(5000);

  console.log("=== CONSOLE ERRORS ===");
  for (const e of errors) console.log(e);
  console.log(`=== ${errors.length} errors total ===`);
});
