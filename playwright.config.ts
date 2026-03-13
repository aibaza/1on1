import { defineConfig, devices } from "@playwright/test";

// On Linux the Playwright-bundled Chrome needs system NSS/NSPR libs
// that may not be on the default LD_LIBRARY_PATH in snap environments.
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
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:4301",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
      use: {
        launchOptions: sharedLaunchOptions,
      },
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/admin.json",
        launchOptions: sharedLaunchOptions,
      },
      dependencies: ["setup"],
    },
    {
      name: "chromium-manager",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/manager.json",
        launchOptions: sharedLaunchOptions,
      },
      dependencies: ["setup"],
    },
    {
      name: "chromium-member",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/member.json",
        launchOptions: sharedLaunchOptions,
      },
      dependencies: ["setup"],
    },
    {
      // Standalone project targeting Docker UAT on port 4300 directly.
      // No webServer dependency — requires Docker UAT to be running.
      name: "debug-uat",
      testMatch: /debug-.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:4300",
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
