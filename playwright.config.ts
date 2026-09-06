import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  fullyParallel: false,
  use: {
    baseURL: process.env.HATIM_TEST_URL ?? "http://127.0.0.1:8000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1100 },
      },
    },
  ],
  reporter: "list",
});
