import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildSite, getLastUpdated, hashConfig } from "../src/build.ts";
import { defineConfig } from "../src/config.ts";
import type { SiteConfig } from "../src/types.ts";

const baseConfig: SiteConfig = {
  title: "Test",
  description: "A test site",
  base: "/",
  hostname: "https://example.com",
  srcDir: ".",
  outDir: "dist",
  head: [],
  themeConfig: { nav: [], sidebar: {} },
};

describe("hashConfig", () => {
  it("changes when description changes", () => {
    expect(hashConfig(baseConfig)).not.toBe(
      hashConfig({ ...baseConfig, description: "A different site" }),
    );
  });

  it("changes when head changes", () => {
    expect(hashConfig(baseConfig)).not.toBe(
      hashConfig({ ...baseConfig, head: ['<meta name="x" content="y">'] }),
    );
  });

  it("changes when lastUpdated toggles", () => {
    expect(hashConfig(baseConfig)).not.toBe(
      hashConfig({ ...baseConfig, lastUpdated: true }),
    );
  });

  it("changes when locales changes", () => {
    expect(hashConfig(baseConfig)).not.toBe(
      hashConfig({
        ...baseConfig,
        locales: { "/fr/": { label: "Français", lang: "fr" } },
      }),
    );
  });

  it("is stable for an unchanged config", () => {
    expect(hashConfig(baseConfig)).toBe(hashConfig({ ...baseConfig }));
  });
});

describe("getLastUpdated", () => {
  it("does not shell-interpret metacharacters embedded in the file path", () => {
    const marker = join(tmpdir(), `press-getlastupdated-pwned-${Date.now()}`);
    const maliciousPath = `nonexistent"; touch "${marker}"; echo "`;
    expect(() => getLastUpdated(maliciousPath)).not.toThrow();
    expect(getLastUpdated(maliciousPath)).toBeUndefined();
    // If execSync's shell string-interpolation bug were still present, the
    // injected `touch` command would have created this file.
    expect(() => readFileSync(marker)).toThrow();
  });
});

describe("buildSite isHome resolution", () => {
  let srcDir: string;
  let outDir: string;

  afterEach(() => {
    rmSync(srcDir, { recursive: true, force: true });
    rmSync(outDir, { recursive: true, force: true });
  });

  it("renders a non-root page with frontmatter layout: home through homeShell, not pageShell", async () => {
    srcDir = mkdtempSync(join(tmpdir(), "press-build-src-"));
    outDir = mkdtempSync(join(tmpdir(), "press-build-out-"));
    writeFileSync(join(srcDir, "index.md"), "# Root\n");
    mkdirSync(join(srcDir, "guide"));
    writeFileSync(
      join(srcDir, "guide", "custom.md"),
      [
        "---",
        "layout: home",
        "hero:",
        "  tagline: Regression Hero Tagline",
        "---",
        "",
        "Body content.",
        "",
      ].join("\n"),
    );
    writeFileSync(
      join(srcDir, "guide", "plain.md"),
      "Just a normal doc page.\n",
    );

    const config = defineConfig({
      title: "Test Site",
      description: "",
      hostname: "https://example.com",
      srcDir,
      outDir,
    });

    await buildSite({ config, srcDir, outDir });

    const customHtml = readFileSync(
      join(outDir, "guide", "custom", "index.html"),
      "utf8",
    );
    expect(customHtml).toContain("Regression Hero Tagline");

    const plainHtml = readFileSync(
      join(outDir, "guide", "plain", "index.html"),
      "utf8",
    );
    expect(plainHtml).not.toContain("Regression Hero Tagline");
  });
});
