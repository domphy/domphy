import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    shadcn: "src/shadcn.ts",
    magicui: "src/magicui.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  minify: true,
  target: "es2020",
});
