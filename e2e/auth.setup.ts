import { test as setup, type Page } from "@playwright/test";
import * as fs from "fs";

const AUTH_DIR = "e2e/.auth";

// Ensure the auth directory exists before writing state files
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

async function loginAndSave(
  page: Page,
  email: string,
  password: string,
  file: string,
) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/(overview|dashboard)/i, { timeout: 20_000 });
  await page.context().storageState({ path: file });
}

setup("authenticate as admin (alice)", async ({ page }) => {
  await loginAndSave(
    page,
    "alice@acme.example.com",
    "password123",
    `${AUTH_DIR}/admin.json`,
  );
});

setup("authenticate as manager (bob)", async ({ page }) => {
  await loginAndSave(
    page,
    "bob@acme.example.com",
    "password123",
    `${AUTH_DIR}/manager.json`,
  );
});

setup("authenticate as member (dave)", async ({ page }) => {
  await loginAndSave(
    page,
    "dave@acme.example.com",
    "password123",
    `${AUTH_DIR}/member.json`,
  );
});
