import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, "..");
const repoRoot = resolve(here, "../../..");

// A plain config object (no `vitest/config` import) so the config file itself
// has no third-party imports to resolve — only Node built-ins — and loads
// regardless of which package's hoisted vitest binary runs it.
//
// The engine tests run against the workspace package SOURCES (not built `dist/`)
// so they need no prior build, and aliasing bare specifiers keeps singletons
// consistent (e.g. @domphy/ui's internal @domphy/core resolves to the same
// source module the tests use). `markdown-it` is a hoisted transitive dep not
// listed by apps/web directly, so it is resolved up front against the
// @domphy/markdown package which declares it.
const requireFromMarkdownPkg = createRequire(
  resolve(repoRoot, "packages/markdown/src/index.ts"),
);
const requireFromWeb = createRequire(resolve(webRoot, "package.json"));

const markdownItMain = requireFromMarkdownPkg.resolve("markdown-it");
// Prefer the ESM entry next to the CJS one so Vite/Node load it cleanly.
const markdownItEsm = resolve(dirname(markdownItMain), "../index.mjs");

export default {
  root: webRoot,
  test: {
    include: [
      "domphypress/pipeline.test.ts",
      "domphypress/search.test.ts",
    ],
    // Default to node; search.test.ts opts into jsdom via a per-file docblock.
    environment: "node",
  },
  resolve: {
    // Array form preserves order — more specific finds first, and regex finds
    // for the markdown-it family so `markdown-it` does not shadow
    // `markdown-it-container` / `markdown-it-include`.
    alias: [
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
      // @domphy/ui imports @domphy/floating internally, which in turn vendors
      // @floating-ui under its own src — mirror both so ui source loads.
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
      {
        find: /^markdown-it-container$/,
        replacement: requireFromWeb.resolve("markdown-it-container"),
      },
      {
        find: /^markdown-it-include$/,
        replacement: requireFromWeb.resolve("markdown-it-include"),
      },
      { find: /^shiki$/, replacement: requireFromWeb.resolve("shiki") },
    ],
  },
  server: {
    fs: {
      // Allow reaching into packages/ for the aliased sources and `<<<` imports.
      allow: [repoRoot],
    },
  },
};
