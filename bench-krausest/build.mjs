// Build script for bench-krausest. Zero-dependency: reuses the esbuild
// installed for apps/web via createRequire (this dir is intentionally not
// part of the pnpm workspace).
//
// Outputs:
//   dist/main.js         - minified production bundle (@domphy/core from packages/core/dist)
//   dist/main.profile.js - unminified bundle from packages/core/src with keepNames,
//                          used only for CPU profiling so hot functions are attributable.
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dir, "..");
const require = createRequire(
  path.join(repoRoot, "apps", "web", "package.json"),
);
const esbuild = require("esbuild");

const common = {
  entryPoints: [path.join(dir, "src", "main.ts")],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "chrome120",
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
};

await esbuild.build({
  ...common,
  outfile: path.join(dir, "dist", "main.js"),
  minify: true,
  alias: {
    "@domphy/core": path.join(repoRoot, "packages", "core", "dist", "index.js"),
  },
});

// Vanilla control (no @domphy/core import).
await esbuild.build({
  ...common,
  entryPoints: [path.join(dir, "src", "vanilla.ts")],
  outfile: path.join(dir, "dist", "vanilla.js"),
  minify: true,
});

await esbuild.build({
  ...common,
  outfile: path.join(dir, "dist", "main.profile.js"),
  minify: false,
  keepNames: true,
  sourcemap: false,
  alias: {
    "@domphy/core": path.join(repoRoot, "packages", "core", "src", "index.ts"),
  },
});

console.log(
  "built dist/main.js (minified) and dist/main.profile.js (profiling)",
);
