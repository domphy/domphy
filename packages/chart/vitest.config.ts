import { defineConfig } from "vitest/config";

// Under monorepo-wide `pnpm -r test`, fork-pool workers can fail to spawn
// (Timeout waiting for worker) when many packages load jsdom/WebGL at once.
// Cap concurrency so chart's suite stays reliable in CI.
export default defineConfig({
  test: {
    pool: "forks",
    maxWorkers: 2,
    fileParallelism: false,
    // The renderer tests `vi.doMock("@luma.gl/engine")` and then `await
    // import()` the renderer inside the test body, so transforming and loading
    // the WebGL module tree counts against the per-test budget. Measured: 1.9 s
    // on an idle machine, but the same test timed out at the 5 s default during
    // a full-suite run on a loaded one (that run spent 141 s in `import` and
    // 296 s in `environment` overall). 20 s leaves a 10x margin over the idle
    // cost without hiding a genuinely hung test.
    testTimeout: 20000,
  },
});
