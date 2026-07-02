import { defineConfig, devices } from "@playwright/test";

// Tests run against a deployed/preview URL. Set BASE_URL, e.g.
//   BASE_URL=https://your-preview.vercel.app npm run test:e2e
export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
