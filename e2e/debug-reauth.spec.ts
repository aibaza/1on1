/**
 * Re-authenticate UAT users after database re-seed.
 * Run: npx playwright test e2e/debug-reauth.spec.ts --project=debug-uat
 */
import { test, type Page } from "@playwright/test";
import * as fs from "fs";

const BASE = "https://1on1.surmont.co";
const AUTH_DIR = "e2e/.auth-uat";

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

async function loginAndSave(page: Page, email: string, password: string, file: string) {
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState("domcontentloaded", { timeout: 20_000 });
  await page.getByLabel(/email/i).fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/(overview|dashboard)/i, { timeout: 30_000 });
  await page.context().storageState({ path: file });
  console.log(`Saved auth state for ${email} → ${file}`);
}

test("re-auth admin", async ({ page }) => {
  await loginAndSave(page, "alice@acme.example.com", "password123", `${AUTH_DIR}/admin.json`);
});

test("re-auth manager", async ({ page }) => {
  await loginAndSave(page, "bob@acme.example.com", "password123", `${AUTH_DIR}/manager.json`);
});

test("re-auth member", async ({ page }) => {
  await loginAndSave(page, "dave@acme.example.com", "password123", `${AUTH_DIR}/member.json`);
});
