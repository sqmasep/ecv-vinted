import { defineConfig, devices } from "@playwright/test";

const WEB_URL = "http://localhost:3000";
const API_URL = "http://localhost:3001/";

// E2E suite for the ÉCRIN buyer tunnel. Boots the Elysia API (Bun) and the Next
// web app, reseeding the database once before the run via globalSetup.
export default defineConfig({
  testDir: "./tests/e2e",
  // Tests mutate shared state (purchases consume listed articles) → serial.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: WEB_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "bun run src/index.ts",
      cwd: "../api",
      url: API_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: "ignore",
      stderr: "pipe",
    },
    {
      command: "bun run dev",
      url: WEB_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "ignore",
      stderr: "pipe",
    },
  ],
});
