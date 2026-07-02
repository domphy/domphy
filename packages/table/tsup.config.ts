import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts", domphy: "src/domphy/index.ts" },
    format: ["esm", "cjs"],
    globalName: "Domphy",
    dts: true,
    sourcemap: true,
    clean: true,
    outDir: "dist",
    minify: true,
    target: "es6",
  },
  {
    entry: { table: "src/global.ts" },
    format: ["iife"],
    globalName: "Domphy",
    sourcemap: true,
    dts: false, //important
    clean: false, //important
    outDir: "dist",
    minify: true,
    target: "es6",
    // no Node `process` global in a plain <script> tag; inline NODE_ENV so esbuild strips the dev-only branches
    define: { "process.env.NODE_ENV": '"production"' },
  },
]);
