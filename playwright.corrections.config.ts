/**
 * Playwright config for running corrections.spec.ts against the localhost dev server.
 * Assumes auth files in e2e/.auth/ are already valid (no setup required).
 * Uses the existing saved auth state.
 *
 * Run: node node_modules/.bin/playwright test --config=playwright.corrections.config.ts
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
  testMatch: /(?<!uat-)corrections\.spec\.ts/,
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "playwright-report-corrections", open: "never" }]],
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:4301",
    trace: "on-first-retry",
    screenshot: "on",
    video: "off",
  },
  projects: [
    {
      name: "chromium-admin",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/admin.json",
        launchOptions: sharedLaunchOptions,
      },
    },
    {
      name: "chromium-manager",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/manager.json",
        launchOptions: sharedLaunchOptions,
      },
    },
    {
      name: "chromium-member",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/member.json",
        launchOptions: sharedLaunchOptions,
      },
    },
  ],
  webServer: {
    command: "bun run dev --port 4301",
    url: "http://localhost:4301",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
