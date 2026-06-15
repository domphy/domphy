import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, "..");
const repoRoot = resolve(here, "../../..");

// A plain config object (no `vitest/config` import) so the config file itself
// has no third-party imports to resolve — only Node built-ins.
//
// In this worktree the workspace packages publish from `dist` (not built), and
// `markdown-it` is a hoisted transitive dependency not listed directly by
// `apps/web`, so Vite's resolver cannot find some of these from the source tree.
// We therefore resolve every third-party module the pipeline imports to an
// absolute path up front and alias them explicitly. `markdown-it` is resolved
// against the `@domphy/markdown` package, which declares it as a dependency.
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
    include: ["domphypress/pipeline.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: [
      {
        find: "@domphy/markdown",
        replacement: resolve(repoRoot, "packages/markdown/src/index.ts"),
      },
      {
        find: "@domphy/core",
        replacement: resolve(repoRoot, "packages/core/src/index.ts"),
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
