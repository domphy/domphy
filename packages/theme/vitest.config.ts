import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Playwright specs live in e2e/*.spec.ts — keep them out of `pnpm test`
    // / `pnpm -r test` so Chromium (and the demo dev server) never starts
    // next to the jsdom suite. Same pattern as packages/dnd, packages/floating.
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
  },
});
