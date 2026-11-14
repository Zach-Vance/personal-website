import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.mjs",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:4173/personal-website/",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  // Serves the built dist/ (run `npm run build` first).
  webServer: {
    command: "node scripts/serve.mjs",
    url: "http://127.0.0.1:4173/personal-website/",
    reuseExistingServer: !process.env.CI,
  },
});
