/**
 * Playwright config targeting Vercel develop preview.
 * No webServer dependency — requires develop branch to be deployed.
 *
 * Auth state files are stored in e2e/.auth-uat/ (separate from localhost auth).
 *
 * Run:
 *   npx playwright test --config=playwright.uat.config.ts --project=uat-setup --project=uat-chromium
 */
import { defineConfig, devices } from "@playwright/test";

const linuxLibPath = "/usr/lib/x86_64-linux-gnu";
const ldLibraryPath = process.env.LD_LIBRARY_PATH
  ? `${process.env.LD_LIBRARY_PATH}:${linuxLibPath}`
  : linuxLibPath;

const sharedLaunchOptions = {
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  env: { LD_LIBRARY_PATH: ldLibraryPath },
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: false,
  retries: 1,
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "playwright-report-uat", open: "never" }]],
  timeout: 60_000,
  use: {
    baseURL: "https://1on1-git-develop-surcod.vercel.app",
    trace: "on-first-retry",
    screenshot: "on",
    video: "off",
  },
  projects: [
    {
      name: "uat-setup",
      testMatch: /uat-auth\.setup\.ts/,
      use: {
        launchOptions: sharedLaunchOptions,
      },
    },
    {
      name: "uat-chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth-uat/admin.json",
        launchOptions: sharedLaunchOptions,
      },
      dependencies: ["uat-setup"],
    },
    {
      name: "uat-chromium-manager",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth-uat/manager.json",
        launchOptions: sharedLaunchOptions,
      },
      dependencies: ["uat-setup"],
    },
    {
      name: "uat-chromium-member",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth-uat/member.json",
        launchOptions: sharedLaunchOptions,
      },
      dependencies: ["uat-setup"],
    },
  ],
});
