import path from "node:path";
import { tanstackViteConfig } from "@tanstack/vite-config";
import type { ViteUserConfig } from "vitest/config";
import { defineConfig, mergeConfig } from "vitest/config";
import minifyScriptPlugin from "./vite-minify-plugin";

const config = defineConfig({
  plugins: [minifyScriptPlugin()] as ViteUserConfig["plugins"],
  test: {
    name: "@domphy/router",
    dir: "./tests",
    watch: false,
    environment: "jsdom",
    alias: {
      // For tests only, resolve to development.ts which returns undefined
      // so that router.isServer fallback is used
      "@domphy/router/isServer": path.resolve(
        __dirname,
        "src/isServer/development.ts",
      ),
    },
  },
});

export default mergeConfig(
  config,
  tanstackViteConfig({
    entry: [
      "./src/index.ts",
      "./src/ssr/client.ts",
      "./src/ssr/server.ts",
      "./src/scroll-restoration-script/client.ts",
      "./src/scroll-restoration-script/server.ts",
      "./src/isServer/server.ts",
      "./src/isServer/client.ts",
      "./src/isServer/development.ts",
    ],
    srcDir: "./src",
    externalDeps: ["@domphy/router/isServer"],
    tsconfigPath: "./tsconfig.build.json",
  }),
);
