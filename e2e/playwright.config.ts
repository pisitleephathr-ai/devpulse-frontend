import { defineConfig, devices } from "@playwright/test";

/**
 * DevPulse E2E config. Point it at any running instance via env vars:
 *   E2E_BASE_URL   e.g. https://pms.trrappstore.com  (default http://localhost:3000)
 *   E2E_EMAIL      a MANAGER/ADMIN account (so board status moves aren't role-gated)
 *   E2E_PASSWORD
 *   E2E_TESTER_NAME (optional) display-name substring of a teammate to use as the
 *                   handoff tester in the board test; falls back to the first option.
 *
 * A shared login means data races if run in parallel, so this runs serially.
 */
export default defineConfig({
  testDir: "./tests",
  timeout: 90_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "th-TH",
    timezoneId: "Asia/Bangkok",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
