import { test as base, type Page } from "@playwright/test";
import * as path from "path";

const AUTH_DIR = path.join(__dirname, ".auth");

type Fixtures = {
  adminPage: Page;
  managerPage: Page;
  memberPage: Page;
};

/**
 * Extended Playwright test with per-role pre-authenticated page contexts.
 *
 * Usage:
 *   import { test, expect } from "./fixtures";
 *
 *   test("manager can see X", async ({ managerPage }) => {
 *     await managerPage.goto("/overview");
 *   });
 *
 * Each fixture creates a fresh browser context from the stored auth state
 * and closes it after the test. Specs that need to test multiple roles in
 * the same test can request multiple fixtures simultaneously.
 */
export const test = base.extend<Fixtures>({
  adminPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      storageState: path.join(AUTH_DIR, "admin.json"),
    });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
  managerPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      storageState: path.join(AUTH_DIR, "manager.json"),
    });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
  memberPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      storageState: path.join(AUTH_DIR, "member.json"),
    });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
});

export { expect } from "@playwright/test";
