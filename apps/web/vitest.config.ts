import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");

const requireFromMarkdownPkg = createRequire(
  resolve(repoRoot, "packages/markdown/src/index.ts"),
);
const requireFromWeb = createRequire(resolve(here, "package.json"));

const markdownItMain = requireFromMarkdownPkg.resolve("markdown-it");
const markdownItEsm = resolve(dirname(markdownItMain), "../index.mjs");

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
    ],
    environment: "node",
  },
  resolve: {
    alias: [
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
      {
        find: /^markdown-it-container$/,
        replacement: requireFromWeb.resolve("markdown-it-container"),
      },
      {
        find: /^markdown-it-include$/,
        replacement: requireFromWeb.resolve("markdown-it-include"),
      },
      {
        find: /^markdown-it-emoji$/,
        replacement: requireFromWeb.resolve("markdown-it-emoji"),
      },
      { find: /^shiki$/, replacement: requireFromWeb.resolve("shiki") },
    ],
  },
  server: {
    fs: { allow: [repoRoot] },
  },
};
