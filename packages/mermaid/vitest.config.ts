import { defineConfig } from "vitest/config";

// renderMermaidToSvg spawns Puppeteer/chrome-headless-shell. Running multiple
// workers under monorepo `pnpm -r test` OOM-kills the fork pool ("Worker exited
// unexpectedly"). Force a single fork so headless chrome is sequential.
export default defineConfig({
  test: {
    fileParallelism: false,
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
