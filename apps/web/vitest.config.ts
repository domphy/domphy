import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");

const requireFromMarkdownPkg = createRequire(
  resolve(repoRoot, "packages/markdown/src/index.ts"),
);
const requireFromWeb = createRequire(resolve(here, "package.json"));

const markdownItPkg = requireFromMarkdownPkg.resolve(
  "markdown-it/package.json",
);
// markdown-it 15 ships dist/markdown-it.mjs as its ESM entry (the old
// package-root index.mjs no longer exists).
const markdownItEsm = resolve(dirname(markdownItPkg), "dist/markdown-it.mjs");

export default {
  root: here,
  test: {
    include: [
      "tests/html.test.ts",
      "tests/pipeline.test.ts",
      "tests/search.test.ts",
      "tests/routes.test.ts",
      "tests/theme-builder.test.ts",
      "tests/transformCode.test.ts",
      "tests/playground-layout.test.ts",
      "tests/mermaid-islands.test.ts",
    ],
    environment: "node",
    // theme-builder.test.ts re-imports the whole demo module graph per test
    // (vi.resetModules + dynamic import in mountFresh) — on a busy or
    // AV-scanned machine that transform alone can exceed the 5s default.
    testTimeout: 20000,
  },
  resolve: {
    alias: [
      {
        find: "@domphy/press/browser",
        replacement: resolve(repoRoot, "packages/press/src/browser.ts"),
      },
      {
        find: "@domphy/press",
        replacement: resolve(repoRoot, "packages/press/src/index.ts"),
      },
      {
        find: "@domphy/markdown",
        replacement: resolve(repoRoot, "packages/markdown/src/index.ts"),
      },
      {
        find: "@domphy/core",
        replacement: resolve(repoRoot, "packages/core/src/index.ts"),
      },
      {
        find: "@domphy/theme",
        replacement: resolve(repoRoot, "packages/theme/src/index.ts"),
      },
      {
        find: "@domphy/ui",
        replacement: resolve(repoRoot, "packages/ui/src/index.ts"),
      },
      {
        find: "@domphy/app",
        replacement: resolve(repoRoot, "packages/app/src/index.ts"),
      },
      {
        find: "@domphy/floating",
        replacement: resolve(repoRoot, "packages/floating/src/index.ts"),
      },
      {
        find: "@floating-ui/utils/dom",
        replacement: resolve(repoRoot, "packages/floating/src/utils/dom.ts"),
      },
      {
        find: "@floating-ui/utils",
        replacement: resolve(repoRoot, "packages/floating/src/utils/index.ts"),
      },
      {
        find: "@floating-ui/core",
        replacement: resolve(repoRoot, "packages/floating/src/core/index.ts"),
      },
      { find: /^markdown-it$/, replacement: markdownItEsm },
      { find: /^shiki$/, replacement: requireFromWeb.resolve("shiki") },
    ],
  },
  server: {
    fs: { allow: [repoRoot] },
  },
};
