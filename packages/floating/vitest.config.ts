import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Vite (unlike tsup/esbuild) does not read tsconfig.json's `compilerOptions.
// paths` on its own — the internal `@floating-ui/core`/`@floating-ui/utils`
// names tsconfig.json aliases to this package's own vendored src files
// (there is no such npm package installed; see UPSTREAM.md) need the same
// mapping repeated here as `resolve.alias`, or Vitest's transform fails to
// resolve them entirely.
const alias = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@floating-ui/utils/dom": alias("./src/utils/dom.ts"),
      "@floating-ui/utils": alias("./src/utils/index.ts"),
      "@floating-ui/core": alias("./src/core/index.ts"),
    },
  },
  test: {
    // Playwright specs live in e2e/*.spec.ts — keep them out of `pnpm test`
    // / `pnpm -r test` so Chromium (and the demo dev server) never starts
    // next to the jsdom suite. Same pattern as packages/blocks.
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
  },
});
