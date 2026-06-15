import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm"],
  dts: false,
  sourcemap: false,
  clean: true,
  outDir: "dist",
  minify: false,
  target: "node18",
  // Keep the shebang so the built file is directly executable.
  banner: { js: "#!/usr/bin/env node" },
});
