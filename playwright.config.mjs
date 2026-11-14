import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.mjs",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:4173/personal-website/",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  // Builds and serves dist/ so the tests never run against a stale build.
  webServer: {
    command: "npm run build && node scripts/serve.mjs",
    url: "http://127.0.0.1:4173/personal-website/",
    reuseExistingServer: false,
  },
});
