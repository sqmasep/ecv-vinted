import { defineConfig, devices } from "@playwright/test";

const BO_URL = "http://localhost:3002";
const API_URL = "http://localhost:3001/";

// Suite e2e du back-office ÉCRIN (parcours opérateur d'authentification). Démarre
// l'API Elysia (Bun) et l'app Next du back-office, et réamorce la base une fois
// avant la run via globalSetup. Les specs qui mutent l'état réensemencent
// elles-mêmes en beforeAll (cf. tests/e2e/helpers.ts → reseed).
export default defineConfig({
  testDir: "./tests/e2e",
  // Les tests partagent une base SQLite et mutent l'état → exécution sérielle.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: BO_URL,
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
      url: BO_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "ignore",
      stderr: "pipe",
    },
  ],
});
