import { test, expect } from "@playwright/test";
import { execSync } from "child_process";

/**
 * Docker blue-green deployment verification test.
 *
 * This test verifies the Docker build and deployment works:
 * 1. Docker image builds from current codebase
 * 2. The verify-docker.sh script exists and is executable
 *
 * Note: Full stack verification (docker compose up, HTTP check, DB check)
 * is handled by scripts/verify-docker.sh which can be run independently
 * or in CI. This Playwright test validates the build step only, since
 * running docker compose in parallel with the dev server would conflict
 * on port 4300.
 */

test.describe("Docker Deployment", () => {
  test.setTimeout(120_000);

  test("docker image builds successfully", async () => {
    // Verify docker compose build succeeds
    const result = execSync("docker compose build app --quiet 2>&1", {
      cwd: process.cwd(),
      encoding: "utf-8",
      timeout: 120_000,
    });
    // If we get here without throwing, the build succeeded
    expect(true).toBe(true);
  });

  test("verify-docker.sh script exists and is executable", async () => {
    const result = execSync("test -x scripts/verify-docker.sh && echo OK", {
      cwd: process.cwd(),
      encoding: "utf-8",
    });
    expect(result.trim()).toBe("OK");
  });
});
