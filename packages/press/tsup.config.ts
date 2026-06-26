import { defineConfig } from "tsup";

export default defineConfig([
  {
    // Main Node.js API — ESM only (import.meta.url, top-level await)
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    outDir: "dist",
    minify: true,
    target: "node18",
    external: ["esbuild"],
  },
  {
    // CLI binary
    entry: { cli: "src/cli.ts" },
    format: ["esm"],
    dts: false,
    sourcemap: false,
    clean: false,
    outDir: "dist",
    minify: false,
    target: "node18",
    external: ["esbuild"],
    banner: { js: "#!/usr/bin/env node" },
  },
  {
    // Islands client: Node-resolvable ESM (esbuild re-bundles this for browser)
    entry: { islands: "src/islands.ts" },
    format: ["esm"],
    dts: false,
    sourcemap: false,
    clean: false,
    outDir: "dist",
    minify: true,
    target: "es2020",
  },
]);
