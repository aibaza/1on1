import { defineConfig } from "@playwright/test";

const linuxLibPath = "/usr/lib/x86_64-linux-gnu";
const ldLibraryPath = process.env.LD_LIBRARY_PATH
  ? `${process.env.LD_LIBRARY_PATH}:${linuxLibPath}`
  : linuxLibPath;

export default defineConfig({
  testDir: "./",
  testMatch: /role-to-level-smoke\.spec\.ts/,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  timeout: 120_000,
  use: {
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
      env: { LD_LIBRARY_PATH: ldLibraryPath },
    },
  },
});
