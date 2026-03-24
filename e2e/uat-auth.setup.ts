/**
 * Auth setup for UAT environment (https://1on1.surmont.co).
 * Stores auth state in e2e/.auth-uat/ (separate from localhost auth).
 */
import { test as setup, type Page } from "@playwright/test";
import * as fs from "fs";

const AUTH_DIR = "e2e/.auth-uat";

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

async function loginAndSave(page: Page, email: string, password: string, file: string) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle", { timeout: 20_000 });

  // Use direct CSS selectors to ensure we target the actual inputs
  const emailInput = page.locator('input[name="email"]');
  const passwordInput = page.locator('input[name="password"]');

  await emailInput.waitFor({ state: "visible", timeout: 10_000 });
  await emailInput.click();
  await emailInput.fill(email);
  await passwordInput.click();
  await passwordInput.fill(password);

  // Handle both classic ("Sign in") and editorial ("Autentificare") button text
  const submitButton = page.getByRole("button", { name: /sign in|autentificare/i });
  await submitButton.click();

  await page.waitForURL(/\/(overview|dashboard|sessions)/i, { timeout: 30_000 });
  await page.context().storageState({ path: file });
  console.log(`Saved auth state for ${email} → ${file}`);
}

setup("authenticate admin (alice) on UAT", async ({ page }) => {
  await loginAndSave(page, "alice@acme.example.com", "password123", `${AUTH_DIR}/admin.json`);
});

setup("authenticate manager (bob) on UAT", async ({ page }) => {
  await loginAndSave(page, "bob@acme.example.com", "password123", `${AUTH_DIR}/manager.json`);
});

setup("authenticate member (dave) on UAT", async ({ page }) => {
  await loginAndSave(page, "dave@acme.example.com", "password123", `${AUTH_DIR}/member.json`);
});
