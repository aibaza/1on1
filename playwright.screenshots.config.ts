import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/screenshot-tour.spec.ts",
  outputDir: "screenshots/artifacts",
  timeout: 90_000,
  retries: 0,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://localhost:4300",
    screenshot: "on",
    video: "off",
    trace: "off",
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    },
  },
  reporter: [
    ["list"],
    [
      "html",
      { outputFolder: "screenshots/playwright-report", open: "never" },
    ],
  ],
});
