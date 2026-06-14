import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts", tools: "src/tools.ts" },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  target: "node18",
  platform: "node",
});
