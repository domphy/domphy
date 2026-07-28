import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts", domphy: "src/domphy/index.ts" },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  minify: true,
  target: "es2018",
  external: ["@domphy/core", "@domphy/theme", "@domphy/floating"],
});
