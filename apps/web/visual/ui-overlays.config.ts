import { defineConfig } from "@playwright/test";

/**
 * Interaction + responsive checks for @domphy/ui overlay & form patches
 * against the STANDALONE visual catalog (visual/serve-standalone.mjs),
 * solo-mounted per patch via `?catalog=uioverlays&only=<name>`.
 *
 *   pnpm visual:ui-overlays
 *
 * VISUAL_UI_BASE_URL overrides default http://127.0.0.1:4180
 */
export default defineConfig({
  testDir: ".",
  testMatch: "ui-overlays.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 120_000,
  use: {
    baseURL: process.env.VISUAL_UI_BASE_URL ?? "http://127.0.0.1:4180",
    screenshot: "off",
    colorScheme: "light",
  },
  webServer: process.env.VISUAL_NO_SERVER
    ? undefined
    : {
        command: "node visual/serve-standalone.mjs --port 4180",
        url: "http://127.0.0.1:4180/",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        cwd: "..",
      },
});
