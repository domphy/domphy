import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
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

  // Real buildSite under monorepo-wide parallel CI can exceed vitest's 5s default.
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
  }, 30_000);
});

describe("buildSite deploy artifacts", () => {
  let srcDir: string;
  let outDir: string;

  afterEach(() => {
    rmSync(srcDir, { recursive: true, force: true });
    rmSync(outDir, { recursive: true, force: true });
  });

  function makeConfig(): SiteConfig {
    return defineConfig({
      title: "Test Site",
      description: "",
      hostname: "https://example.com",
      srcDir,
      outDir,
    });
  }

  it("emits a themed 404.html", async () => {
    srcDir = mkdtempSync(join(tmpdir(), "press-404-src-"));
    outDir = mkdtempSync(join(tmpdir(), "press-404-out-"));
    writeFileSync(join(srcDir, "index.md"), "# Home\n");
    await buildSite({ config: makeConfig(), srcDir, outDir });
    const notFound = readFileSync(join(outDir, "404.html"), "utf8");
    expect(notFound).toContain("404");
    expect(notFound).toContain("domphy-app");
  }, 30_000);

  it("escapes XML-special characters in sitemap URLs", async () => {
    srcDir = mkdtempSync(join(tmpdir(), "press-sitemap-src-"));
    outDir = mkdtempSync(join(tmpdir(), "press-sitemap-out-"));
    writeFileSync(join(srcDir, "index.md"), "# Home\n");
    writeFileSync(join(srcDir, "a&b.md"), "# Ampersand page\n");
    await buildSite({ config: makeConfig(), srcDir, outDir });
    const sitemap = readFileSync(join(outDir, "sitemap.xml"), "utf8");
    expect(sitemap).toContain("https://example.com/a&amp;b/");
    expect(sitemap).not.toContain("/a&b/");
  }, 30_000);

  it("emits a content-hashed islands bundle and references it from pages", async () => {
    srcDir = mkdtempSync(join(tmpdir(), "press-islands-src-"));
    outDir = mkdtempSync(join(tmpdir(), "press-islands-out-"));
    writeFileSync(join(srcDir, "index.md"), "# Home\n");
    await buildSite({ config: makeConfig(), srcDir, outDir });
    const assets = readdirSync(join(outDir, "assets"));
    const bundle = assets.find(
      (file) => file.startsWith("press-islands-") && file.endsWith(".js"),
    );
    expect(bundle, "no hashed press-islands bundle emitted").toBeDefined();
    // The whole point: NOT the stable, cache-poisoning name.
    expect(assets).not.toContain("press-islands.js");
    const html = readFileSync(join(outDir, "index.html"), "utf8");
    expect(html).toContain(`assets/${bundle}`);
    // The temporary entry file must not leak into the output.
    expect(readdirSync(outDir)).not.toContain("_press_islands_entry.js");
  }, 30_000);

  it("passes the site base to the islands search bootstrap", async () => {
    srcDir = mkdtempSync(join(tmpdir(), "press-base-src-"));
    outDir = mkdtempSync(join(tmpdir(), "press-base-out-"));
    writeFileSync(join(srcDir, "index.md"), "# Home\n");
    await buildSite({
      config: { ...makeConfig(), base: "/docs/" },
      srcDir,
      outDir,
    });
    const assets = readdirSync(join(outDir, "assets"));
    const bundle = assets.find((file) => file.startsWith("press-islands-"))!;
    const code = readFileSync(join(outDir, "assets", bundle), "utf8");
    expect(code).toContain("/docs/search-index.json");
    expect(code).toContain("/docs");
    const html = readFileSync(join(outDir, "index.html"), "utf8");
    expect(html).toContain(`/docs/assets/${bundle}`);
  }, 30_000);
});

describe("buildSite incremental staleness", () => {
  let srcDir: string;
  let outDir: string;

  afterEach(() => {
    rmSync(srcDir, { recursive: true, force: true });
    rmSync(outDir, { recursive: true, force: true });
  });

  function makeConfig(): SiteConfig {
    return defineConfig({
      title: "Test Site",
      description: "",
      hostname: "https://example.com",
      srcDir,
      outDir,
    });
  }

  it("removes output for deleted pages and newly-drafted pages", async () => {
    srcDir = mkdtempSync(join(tmpdir(), "press-stale-src-"));
    outDir = mkdtempSync(join(tmpdir(), "press-stale-out-"));
    writeFileSync(join(srcDir, "index.md"), "# Home\n");
    writeFileSync(join(srcDir, "deleted.md"), "# Gone soon\n");
    writeFileSync(join(srcDir, "drafted.md"), "# Draft soon\n");
    const config = makeConfig();
    const options = { config, srcDir, outDir, incremental: true };

    await buildSite(options);
    const deletedOut = join(outDir, "deleted", "index.html");
    const draftedOut = join(outDir, "drafted", "index.html");
    expect(existsSync(deletedOut)).toBe(true);
    expect(existsSync(draftedOut)).toBe(true);

    rmSync(join(srcDir, "deleted.md"));
    writeFileSync(
      join(srcDir, "drafted.md"),
      "---\ndraft: true\n---\n# Draft now\n",
    );
    await buildSite(options);

    expect(existsSync(deletedOut)).toBe(false);
    expect(existsSync(draftedOut)).toBe(false);
    expect(existsSync(join(outDir, "index.html"))).toBe(true);
    // The removed pages also disappear from the sitemap and search index.
    const sitemap = readFileSync(join(outDir, "sitemap.xml"), "utf8");
    expect(sitemap).not.toContain("/deleted/");
    expect(sitemap).not.toContain("/drafted/");
  }, 60_000);
});

describe("buildSite base prefixing (non-root deployment)", () => {
  let srcDir: string;
  let outDir: string;

  afterEach(() => {
    rmSync(srcDir, { recursive: true, force: true });
    rmSync(outDir, { recursive: true, force: true });
  });

  it("prefixes internal hrefs, canonical, og:url and sitemap with base — and keeps SSR aria-current", async () => {
    srcDir = mkdtempSync(join(tmpdir(), "press-basefx-src-"));
    outDir = mkdtempSync(join(tmpdir(), "press-basefx-out-"));
    writeFileSync(join(srcDir, "index.md"), "# Home\n");
    mkdirSync(join(srcDir, "guide"));
    writeFileSync(join(srcDir, "guide", "index.md"), "# Guide\n");
    writeFileSync(join(srcDir, "guide", "intro.md"), "# Intro\n");

    const config = defineConfig({
      title: "Test Site",
      description: "",
      hostname: "https://example.com",
      base: "/docs/",
      srcDir,
      outDir,
      themeConfig: {
        nav: [{ text: "Guide", link: "/guide/intro" }],
        sidebar: { "/guide/": [{ text: "Intro", link: "/guide/intro" }] },
      },
    });
    await buildSite({ config, srcDir, outDir });

    const html = readFileSync(
      join(outDir, "guide", "intro", "index.html"),
      "utf8",
    );
    // Nav + sidebar hrefs are base-prefixed…
    expect(html).toContain('href="/docs/guide/intro"');
    // …but the SSR active-state matching stayed base-less, so the current
    // sidebar link still gets aria-current="page".
    expect(html).toContain('aria-current="page"');
    // SEO URLs include the base.
    expect(html).toContain(
      '<link rel="canonical" href="https://example.com/docs/guide/intro/"',
    );
    expect(html).toContain("/docs/guide/intro/");
    const sitemap = readFileSync(join(outDir, "sitemap.xml"), "utf8");
    expect(sitemap).toContain("https://example.com/docs/guide/intro/");
    expect(sitemap).toContain("https://example.com/docs/");
    // Index routes already end in "/" — canonical/sitemap must not gain a
    // double slash (regression: "https://…/docs//").
    const homeHtml = readFileSync(join(outDir, "index.html"), "utf8");
    expect(homeHtml).toContain(
      '<link rel="canonical" href="https://example.com/docs/"',
    );
    const guideHtml = readFileSync(join(outDir, "guide", "index.html"), "utf8");
    expect(guideHtml).toContain(
      '<link rel="canonical" href="https://example.com/docs/guide/"',
    );
    expect(guideHtml).not.toContain("/docs//");
    expect(sitemap).not.toContain("/docs//");
  }, 60_000);
});

describe("buildSite locale discovery", () => {
  let srcDir: string;
  let outDir: string;

  afterEach(() => {
    rmSync(srcDir, { recursive: true, force: true });
    rmSync(outDir, { recursive: true, force: true });
  });

  it("does not rediscover locale-dir files as default-locale routes", async () => {
    srcDir = mkdtempSync(join(tmpdir(), "press-locale-src-"));
    outDir = mkdtempSync(join(tmpdir(), "press-locale-out-"));
    mkdirSync(join(srcDir, "guide"));
    writeFileSync(join(srcDir, "index.md"), "# Home EN\n");
    writeFileSync(join(srcDir, "guide", "index.md"), "# Guide EN\n");
    mkdirSync(join(srcDir, "vi", "guide"), { recursive: true });
    writeFileSync(join(srcDir, "vi", "index.md"), "# Trang chủ\n");
    writeFileSync(join(srcDir, "vi", "guide", "index.md"), "# Hướng dẫn\n");

    await buildSite({
      config: defineConfig({
        title: "EN Site",
        description: "",
        hostname: "https://example.com",
        srcDir,
        outDir,
        locales: {
          "/": { label: "English", lang: "en", title: "EN Site" },
          "/vi/": { label: "Tiếng Việt", lang: "vi", title: "VI Site" },
        },
      }),
      srcDir,
      outDir,
    });

    const viGuide = readFileSync(join(outDir, "vi", "guide", "index.html"), "utf8");
    expect(viGuide).toMatch(/<html lang="vi"/);
    expect(viGuide).toContain("VI Site");
    expect(viGuide).not.toMatch(/<html lang="en"/);

    const enGuide = readFileSync(join(outDir, "guide", "index.html"), "utf8");
    expect(enGuide).toMatch(/<html lang="en"/);
    expect(enGuide).toContain("EN Site");

    const sitemap = readFileSync(join(outDir, "sitemap.xml"), "utf8");
    const locs = [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
    expect(locs.filter((url) => url === "https://example.com/vi/guide/")).toHaveLength(
      1,
    );
    expect(locs.filter((url) => url === "https://example.com/guide/")).toHaveLength(1);

    const index = JSON.parse(
      readFileSync(join(outDir, "search-index.json"), "utf8"),
    ) as { entries: Array<{ route: string; isPage: boolean }> };
    expect(
      index.entries.filter((e) => e.route === "/vi/guide/" && e.isPage),
    ).toHaveLength(1);
  }, 60_000);
});

describe("buildSite html dir", () => {
  let srcDir: string;
  let outDir: string;

  afterEach(() => {
    rmSync(srcDir, { recursive: true, force: true });
    rmSync(outDir, { recursive: true, force: true });
  });

  it("emits dir=rtl on <html> for RTL langs and dir=ltr otherwise", async () => {
    srcDir = mkdtempSync(join(tmpdir(), "press-rtl-src-"));
    outDir = mkdtempSync(join(tmpdir(), "press-rtl-out-"));
    writeFileSync(join(srcDir, "index.md"), "# Home\n");
    mkdirSync(join(srcDir, "ar"));
    writeFileSync(join(srcDir, "ar", "index.md"), "# الرئيسية\n");
    mkdirSync(join(srcDir, "he"));
    writeFileSync(join(srcDir, "he", "index.md"), "# בית\n");

    await buildSite({
      config: defineConfig({
        title: "Docs",
        description: "",
        hostname: "https://example.com",
        srcDir,
        outDir,
        locales: {
          "/": { label: "English", lang: "en" },
          "/ar/": { label: "العربية", lang: "ar" },
          "/he/": { label: "עברית", lang: "he-IL" },
        },
      }),
      srcDir,
      outDir,
    });

    const en = readFileSync(join(outDir, "index.html"), "utf8");
    expect(en).toMatch(/<html lang="en" dir="ltr"/);
    const ar = readFileSync(join(outDir, "ar", "index.html"), "utf8");
    expect(ar).toMatch(/<html lang="ar" dir="rtl"/);
    const he = readFileSync(join(outDir, "he", "index.html"), "utf8");
    expect(he).toMatch(/<html lang="he-IL" dir="rtl"/);
  }, 60_000);
});

describe("buildSite cspNonce", () => {
  let srcDir: string;
  let outDir: string;

  afterEach(() => {
    rmSync(srcDir, { recursive: true, force: true });
    rmSync(outDir, { recursive: true, force: true });
  });

  it("stamps the nonce on every inline script/style and the islands bundle tag", async () => {
    srcDir = mkdtempSync(join(tmpdir(), "press-nonce-src-"));
    outDir = mkdtempSync(join(tmpdir(), "press-nonce-out-"));
    writeFileSync(join(srcDir, "index.md"), "# Home\n");
    const config = defineConfig({
      title: "Test Site",
      description: "",
      hostname: "https://example.com",
      srcDir,
      outDir,
      cspNonce: "auditnonce123",
    });
    await buildSite({ config, srcDir, outDir });

    const html = readFileSync(join(outDir, "index.html"), "utf8");
    expect(html).toContain('<script nonce="auditnonce123">');
    expect(html).toContain('<style nonce="auditnonce123">');
    expect(html).toContain('<style id="domphy-style" nonce="auditnonce123">');
    const assets = readdirSync(join(outDir, "assets"));
    const bundle = assets.find((file) => file.startsWith("press-islands-"))!;
    expect(html).toContain(`src="/assets/${bundle}" nonce="auditnonce123"`);

    // A follow-up build WITHOUT a nonce must not inherit the previous one
    // (configure() is global state).
    const outDir2 = mkdtempSync(join(tmpdir(), "press-nonce-out2-"));
    try {
      await buildSite({
        config: defineConfig({
          title: "Test Site",
          description: "",
          hostname: "https://example.com",
          srcDir,
          outDir: outDir2,
        }),
        srcDir,
        outDir: outDir2,
      });
      const clean = readFileSync(join(outDir2, "index.html"), "utf8");
      expect(clean).not.toContain("auditnonce123");
    } finally {
      rmSync(outDir2, { recursive: true, force: true });
    }
  }, 60_000);
});
