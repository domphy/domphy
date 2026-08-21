import { defineConfig } from "vitest/config";

// 173 jsdom test files each import full block trees; with vitest's default
// unbounded forks pool, worker spawn intermittently times out
// (Timeout waiting for worker) on 8-core machines and CI. Cap concurrency
// so the suite stays reliable — same pattern as packages/chart.
export default defineConfig({
  test: {
    pool: "forks",
    maxWorkers: 4,
    // Playwright specs live in e2e/*.spec.ts — keep them out of `pnpm test`
    // / `pnpm -r test` so Chromium never starts next to the jsdom suite.
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
  },
});
