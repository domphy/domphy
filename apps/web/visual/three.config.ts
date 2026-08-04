import { defineConfig } from "@playwright/test";

/**
 * Real-browser checks for @domphy/three against the STANDALONE visual
 * catalog (visual/serve-standalone.mjs), solo-mounted per demo via
 * `?catalog=three&only=<name>`.
 *
 *   pnpm visual:three
 *
 * VISUAL_UI_BASE_URL overrides default http://127.0.0.1:4183
 */
export default defineConfig({
  testDir: ".",
  testMatch: "three.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 120_000,
  use: {
    baseURL: process.env.VISUAL_UI_BASE_URL ?? "http://127.0.0.1:4183",
    screenshot: "off",
    colorScheme: "light",
  },
  webServer: process.env.VISUAL_NO_SERVER
    ? undefined
    : {
        command: "node visual/serve-standalone.mjs --port 4183",
        url: "http://127.0.0.1:4183/",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        cwd: "..",
      },
});
