import { resolve } from "node:path";

// The search engine is exercised against the workspace package SOURCES rather
// than their built `dist/` output so the test does not depend on a prior build
// step. Aliasing the bare specifiers (instead of just the test's own imports)
// also keeps the singletons consistent — @domphy/ui's internal `@domphy/core`
// import resolves to the same source module the test uses.
//
// A plain config object is exported (rather than `defineConfig` from
// `vitest/config`) so the config loads regardless of which package's hoisted
// vitest binary runs it.
const repoRoot = resolve(__dirname, "../../..");

export default {
  resolve: {
    alias: {
      "@domphy/core": resolve(repoRoot, "packages/core/src/index.ts"),
      "@domphy/theme": resolve(repoRoot, "packages/theme/src/index.ts"),
      "@domphy/ui": resolve(repoRoot, "packages/ui/src/index.ts"),
      // @domphy/ui imports @domphy/floating internally, so it too must resolve
      // to source for the aliased ui source to load. @domphy/floating in turn
      // vendors @floating-ui under its own src, mirrored here.
      "@domphy/floating": resolve(repoRoot, "packages/floating/src/index.ts"),
      "@floating-ui/utils/dom": resolve(repoRoot, "packages/floating/src/utils/dom.ts"),
      "@floating-ui/utils": resolve(repoRoot, "packages/floating/src/utils/index.ts"),
      "@floating-ui/core": resolve(repoRoot, "packages/floating/src/core/index.ts"),
    },
  },
  // Root is this directory so the test file resolves regardless of which
  // package's hoisted vitest binary launches the run.
  root: __dirname,
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
  },
};
