import { resolve } from "node:path";
import { defineConfig } from "tsup";

const alias = {
  "@floating-ui/utils/dom": resolve("src/utils/dom.ts"),
  "@floating-ui/utils": resolve("src/utils/index.ts"),
  "@floating-ui/core": resolve("src/core/index.ts"),
};

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
    esbuildOptions(options) {
      options.alias = alias;
    },
  },
  {
    entry: { floating: "src/global.ts" },
    format: ["iife"],
    globalName: "Domphy",
    sourcemap: true,
    dts: false,
    clean: false,
    outDir: "dist",
    minify: true,
    target: "es6",
    esbuildOptions(options) {
      options.alias = alias;
    },
  },
]);
