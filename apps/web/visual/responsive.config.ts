import { defineConfig } from "@playwright/test";

/**
 * Responsive smoke checks against the BUILT site (apps/web/.vitepress/dist),
 * served by serve.press.ts — not the standalone catalog.
 *
 *   pnpm build            # must exist first
 *   pnpm visual:responsive
 *
 * VISUAL_BASE_URL overrides default http://127.0.0.1:4178
 */
export default defineConfig({
  testDir: ".",
  testMatch: "responsive.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 120_000,
  use: {
    baseURL: process.env.VISUAL_BASE_URL ?? "http://127.0.0.1:4178",
    screenshot: "off",
    reducedMotion: "reduce",
    colorScheme: "light",
  },
  webServer: process.env.VISUAL_NO_SERVER
    ? undefined
    : {
        command: "tsx serve.press.ts 4178",
        url: "http://127.0.0.1:4178/",
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
        cwd: "..",
      },
});
