import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@floating-ui/utils/dom": resolve(__dirname, "src/utils/dom.ts"),
      "@floating-ui/utils": resolve(__dirname, "src/utils/index.ts"),
      "@floating-ui/core": resolve(__dirname, "src/core/index.ts"),
    },
  },
});
