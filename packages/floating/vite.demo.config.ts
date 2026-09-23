import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Same aliasing vitest.config.ts needs and for the same reason: tsconfig.json's
// `compilerOptions.paths` maps the internal `@floating-ui/core`/
// `@floating-ui/utils` names to this package's own vendored src files (no
// such npm package is installed — see UPSTREAM.md), and Vite does not read
// tsconfig `paths` on its own.
const alias = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  root: ".",
  resolve: {
    alias: {
      "@floating-ui/utils/dom": alias("./src/utils/dom.ts"),
      "@floating-ui/utils": alias("./src/utils/index.ts"),
      "@floating-ui/core": alias("./src/core/index.ts"),
    },
  },
  server: {
    port: 5861,
  },
});
