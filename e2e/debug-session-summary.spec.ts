/**
 * Debug spec: diagnose the [object ErrorEvent] crash on session summary page.
 *
 * Hypothesis 1: Neon serverless WebSocket (neon/serverless) tries to open ws:// in the browser
 *   — look for ws:// in network errors or console errors
 * Hypothesis 2: Client component hydration error during SSR → client reconciliation
 *   — look for "Hydration failed" or "Expected server HTML" in console errors
 *
 * Runs against dev server (port 4301) where the local oneonone_dev DB is used.
 * Run: PLAYWRIGHT_BROWSERS_PATH=~/.cache/ms-playwright node node_modules/.bin/playwright test e2e/debug-session-summary.spec.ts --project=chromium --reporter=line
 */
import { test, expect } from "./fixtures";
import * as fs from "fs";
import * as path from "path";

const SESSION_IDS = [
  "99999999-0001-4000-9000-000000000001",
  "99999999-0002-4000-9000-000000000002",
];

const REPORT_DIR = "e2e/reports";
const REPORT_FILE = path.join(REPORT_DIR, "session-summary-debug-dev.json");

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

test.describe("Session Summary Crash Diagnosis (dev server port 4301)", () => {
  test.setTimeout(60_000);

  test("session detail page /sessions/:id loads without server errors", async ({ adminPage }) => {
    const SESSION_ID = SESSION_IDS[0];
    const errors: Record<string, unknown>[] = [];

    adminPage.on("console", msg => {
      if (msg.type() === "error") {
        errors.push({ type: "console_error", message: msg.text(), url: msg.location()?.url, timestamp: Date.now() });
      }
    });
    adminPage.on("pageerror", err => {
      errors.push({ type: "page_error", message: err.message, stack: err.stack, timestamp: Date.now() });
    });
    adminPage.on("websocket", ws => {
      errors.push({ type: "websocket_open", url: ws.url(), timestamp: Date.now() });
      ws.on("socketerror", err => {
        errors.push({ type: "websocket_error", url: ws.url(), error: String(err), timestamp: Date.now() });
      });
    });

    const response = await adminPage.goto(`/sessions/${SESSION_ID}`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await adminPage.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
    await adminPage.waitForTimeout(1_000);

    const httpStatus = response?.status();
    const isErrorPage = await adminPage.locator("text=/application error|server-side exception|digest/i").isVisible().catch(() => false);

    console.log(`Session detail: HTTP ${httpStatus}, error page: ${isErrorPage}`);
    errors.forEach(e => console.log(JSON.stringify(e)));

    expect(isErrorPage, "Session detail shows application error").toBe(false);
    expect(httpStatus).toBe(200);
  });

  test("session summary page /sessions/:id/summary — capture full error trace", async ({ adminPage }) => {
    const SESSION_ID = SESSION_IDS[0];

    const report: {
      sessionId: string;
      httpStatus: number | undefined;
      finalUrl: string;
      isErrorPage: boolean;
      errorPageContent: string;
      consoleErrors: unknown[];
      pageErrors: unknown[];
      networkErrors: unknown[];
      websocketEvents: unknown[];
      capturedAt: string;
      hypotheses: Record<string, unknown>;
    } = {
      sessionId: SESSION_ID,
      httpStatus: undefined,
      finalUrl: "",
      isErrorPage: false,
      errorPageContent: "",
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
      websocketEvents: [],
      capturedAt: new Date().toISOString(),
      hypotheses: {
        neon_websocket: false,
        hydration_error: false,
        error_event_object: false,
      },
    };

    adminPage.on("console", msg => {
      if (msg.type() === "error") {
        const text = msg.text();
        report.consoleErrors.push({ message: text, url: msg.location()?.url, timestamp: Date.now() });
        if (text.includes("ErrorEvent") || text.includes("[object ErrorEvent]")) {
          (report.hypotheses as Record<string, unknown>).error_event_object = text;
        }
        if (text.includes("Hydration") || text.includes("Expected server HTML")) {
          (report.hypotheses as Record<string, unknown>).hydration_error = text;
        }
      }
    });
    adminPage.on("pageerror", err => {
      report.pageErrors.push({ message: err.message, stack: err.stack, timestamp: Date.now() });
      if (err.message.includes("ErrorEvent") || err.message.includes("[object ErrorEvent]")) {
        (report.hypotheses as Record<string, unknown>).error_event_object = err.message;
      }
    });
    adminPage.on("response", res => {
      if (res.status() >= 400) {
        report.networkErrors.push({ method: res.request().method(), url: res.url(), status: res.status(), timestamp: Date.now() });
      }
    });
    adminPage.on("websocket", ws => {
      report.websocketEvents.push({ type: "open", url: ws.url(), timestamp: Date.now() });
      if (ws.url().includes("neon") || ws.url().startsWith("ws://")) {
        (report.hypotheses as Record<string, unknown>).neon_websocket = ws.url();
      }
      ws.on("socketerror", err => {
        report.websocketEvents.push({ type: "error", url: ws.url(), error: String(err), timestamp: Date.now() });
      });
      ws.on("close", () => {
        report.websocketEvents.push({ type: "close", url: ws.url(), timestamp: Date.now() });
      });
    });

    const response = await adminPage.goto(`/sessions/${SESSION_ID}/summary`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await adminPage.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
    await adminPage.waitForTimeout(2_000); // Extra settle for client-side hydration errors

    report.httpStatus = response?.status();
    report.finalUrl = adminPage.url();
    report.isErrorPage = await adminPage.locator("text=/application error|server-side exception|digest/i").isVisible().catch(() => false);

    if (report.isErrorPage) {
      report.errorPageContent = (await adminPage.content()).slice(0, 5000);
    }

    // Write report
    ensureDir(REPORT_DIR);
    fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
    console.log(`\nDebug report written to: ${REPORT_FILE}`);
    console.log(`HTTP status: ${report.httpStatus}`);
    console.log(`Error page: ${report.isErrorPage}`);
    console.log(`Console errors: ${report.consoleErrors.length}`);
    console.log(`Page errors: ${report.pageErrors.length}`);
    console.log(`Network errors: ${report.networkErrors.length}`);
    console.log(`WebSocket events: ${report.websocketEvents.length}`);
    console.log(`Hypotheses:`, JSON.stringify(report.hypotheses, null, 2));

    // Fail with helpful message if crash is detected
    expect(
      report.isErrorPage,
      `Session summary shows application error. Full report at: ${REPORT_FILE}\nFirst console error: ${report.consoleErrors[0]}`
    ).toBe(false);
    expect(report.httpStatus).toBe(200);
  });
});
