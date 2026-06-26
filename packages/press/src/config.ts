import type { SiteConfig } from "./types.js";

export type { SiteConfig };

export type UserConfig = Omit<
  SiteConfig,
  "base" | "srcDir" | "outDir" | "head"
> & {
  base?: string;
  srcDir?: string;
  outDir?: string;
  head?: string[];
};

export function defineConfig(config: UserConfig): SiteConfig {
  return {
    base: "/",
    srcDir: ".",
    outDir: "dist",
    head: [],
    ...config,
    themeConfig: Object.assign({ nav: [], sidebar: {} }, config.themeConfig),
  };
}
