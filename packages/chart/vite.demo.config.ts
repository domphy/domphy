import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: ".",
  resolve: {
    alias: {
      "@domphy/core": resolve(__dirname, "../core/src/index.ts"),
      "@domphy/theme": resolve(__dirname, "../theme/src/index.ts"),
      "@domphy/floating": resolve(__dirname, "../floating/src/index.ts"),
    },
  },
  optimizeDeps: {
    include: ["@luma.gl/core", "@luma.gl/webgl", "@luma.gl/engine", "@luma.gl/shadertools"],
    force: true,
  },
  server: {
    port: 5599,
  },
});
