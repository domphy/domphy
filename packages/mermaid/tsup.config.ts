import { defineConfig } from "tsup";

export default defineConfig([
  {
    // Main library entry: build-time renderer + cache + tree integration +
    // client patch. Node-only dependencies stay external so they are required
    // lazily at runtime and never bundled.
    entry: { index: "src/index.ts" },
    format: ["esm", "cjs"],
    globalName: "Domphy",
    dts: true,
    sourcemap: true,
    clean: true,
    outDir: "dist",
    minify: true,
    target: "es6",
    external: ["@mermaid-js/mermaid-cli", "mermaid"],
  },
  {
    // Browser IIFE build: only the client-side patch is browser-safe, so the
    // global bundle exposes that path. `mermaid` stays external — the host page
    // loads it (and the patch reaches it via a runtime dynamic import), keeping
    // the bundle tiny. `target: es2020` lets esbuild keep that dynamic import as
    // a real `import()` instead of bundling mermaid in.
    entry: { mermaid: "src/global.ts" },
    format: ["iife"],
    globalName: "Domphy",
    platform: "browser",
    sourcemap: true,
    dts: false, // important
    clean: false, // important
    outDir: "dist",
    minify: true,
    target: "es2020",
    external: ["mermaid"],
  },
]);
