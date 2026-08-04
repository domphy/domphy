import { defineConfig } from "@playwright/test";

/**
 * Responsive smoke checks for @domphy/blocks demos against the STANDALONE
 * visual catalog (visual/serve-standalone.mjs), solo-mounted per block via
 * `?catalog=blocks&only=<name>&fit=1`.
 *
 *   pnpm visual:blocks-responsive
 *
 * VISUAL_BLOCKS_BASE_URL overrides default http://127.0.0.1:4179
 */
export default defineConfig({
  testDir: ".",
  testMatch: "blocks-responsive.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 120_000,
  use: {
    baseURL: process.env.VISUAL_BLOCKS_BASE_URL ?? "http://127.0.0.1:4179",
    screenshot: "off",
    reducedMotion: "reduce",
    colorScheme: "light",
  },
  webServer: process.env.VISUAL_NO_SERVER
    ? undefined
    : {
        command: "node visual/serve-standalone.mjs --port 4179",
        url: "http://127.0.0.1:4179/",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        cwd: "..",
      },
});
