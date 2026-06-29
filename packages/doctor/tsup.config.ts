import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
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
    entry: { doctor: "src/global.ts" },
    format: ["iife"],
    globalName: "Domphy",
    sourcemap: true,
    dts: false,
    clean: false,
    outDir: "dist",
    minify: true,
    target: "es6",
  },
  {
    entry: { cli: "src/cli.ts" },
    format: ["esm"],
    banner: { js: "#!/usr/bin/env node" },
    dts: false,
    sourcemap: false,
    clean: false,
    outDir: "dist",
    minify: false,
    target: "node18",
    external: ["tsx", "tsx/esm"],
    noExternal: [],
  },
]);
