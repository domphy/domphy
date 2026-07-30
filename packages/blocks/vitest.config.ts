import { defineConfig } from "vitest/config";

// 173 jsdom test files each import full block trees; with vitest's default
// unbounded forks pool, worker spawn intermittently times out
// (Timeout waiting for worker) on 8-core machines and CI. Cap concurrency
// so the suite stays reliable — same pattern as packages/chart.
export default defineConfig({
  test: {
    pool: "forks",
    maxWorkers: 4,
  },
});
