import { defineConfig } from "vitest/config";

// Under monorepo-wide `pnpm -r test`, fork-pool workers can fail to spawn
// (Timeout waiting for worker) when many packages load jsdom/WebGL at once.
// Cap concurrency so chart's suite stays reliable in CI.
export default defineConfig({
  test: {
    pool: "forks",
    maxWorkers: 2,
    fileParallelism: false,
  },
});
