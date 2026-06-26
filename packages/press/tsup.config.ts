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
    // Browser-safe entrypoint: layout + theme only, no Node.js built-ins.
    // Import from "@domphy/press/browser" in Vite/browser bundles.
    entry: { browser: "src/browser.ts" },
    format: ["esm"],
    dts: true,
    sourcemap: false,
    clean: false,
    outDir: "dist",
    minify: true,
    target: "es2020",
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
