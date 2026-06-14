import { describe, expect, it } from "vitest";
import type { LoaderContext } from "../src/index";
import {
  metadataToHeadTags,
  renderHeadTags,
  resolveMetadata,
} from "../src/index";

const context: LoaderContext = {
  pathname: "/blog/hello",
  url: "/blog/hello",
  params: { slug: "hello" },
  searchParams: new URLSearchParams(),
};

describe("resolveMetadata", () => {
  it("merges segments from root to leaf", async () => {
    const resolved = await resolveMetadata(
      [
        { title: "Site", description: "Root description" },
        { description: "Page description", keywords: ["a"] },
      ],
      context,
    );
    expect(resolved.title).toBe("Site");
    expect(resolved.description).toBe("Page description");
    expect(resolved.keywords).toEqual(["a"]);
  });

  it("applies parent title templates to child titles", async () => {
    const resolved = await resolveMetadata(
      [
        { title: { default: "Site", template: "%s | Site" } },
        { title: "Blog" },
      ],
      context,
    );
    expect(resolved.title).toBe("Blog | Site");
  });

  it("uses the default title when children set none", async () => {
    const resolved = await resolveMetadata(
      [
        { title: { default: "Site", template: "%s | Site" } },
        { description: "x" },
      ],
      context,
    );
    expect(resolved.title).toBe("Site");
  });

  it("lets absolute titles escape the template", async () => {
    const resolved = await resolveMetadata(
      [
        { title: { default: "Site", template: "%s | Site" } },
        { title: { absolute: "Standalone" } },
      ],
      context,
    );
    expect(resolved.title).toBe("Standalone");
  });

  it("supports metadata functions with route context", async () => {
    const resolved = await resolveMetadata(
      [
        { title: { default: "Site", template: "%s | Site" } },
        async (loaderContext) => ({
          title: `Post ${loaderContext.params.slug}`,
        }),
      ],
      context,
    );
    expect(resolved.title).toBe("Post hello | Site");
  });

  it("replaces openGraph wholesale, not deep merged", async () => {
    const resolved = await resolveMetadata(
      [
        { openGraph: { title: "Root", siteName: "Site" } },
        { openGraph: { title: "Page" } },
      ],
      context,
    );
    expect(resolved.openGraph).toEqual({ title: "Page" });
  });
});

describe("metadataToHeadTags + renderHeadTags", () => {
  it("renders title, meta and link tags", () => {
    const head = renderHeadTags(
      metadataToHeadTags({
        title: "Hello",
        description: "World",
        keywords: ["a", "b"],
        themeColor: "#fff",
        robots: { index: false },
        icons: "/favicon.svg",
        alternates: { canonical: "/blog/hello" },
        metadataBase: "https://example.com",
        openGraph: { images: [{ url: "/og.png", width: 1200, height: 630 }] },
        twitter: { card: "summary_large_image" },
        other: { "custom-tag": "value" },
      }),
    );
    expect(head).toContain("<title>Hello</title>");
    expect(head).toContain('<meta name="description" content="World">');
    expect(head).toContain('<meta name="keywords" content="a, b">');
    expect(head).toContain('<meta name="robots" content="noindex, follow">');
    expect(head).toContain('<link rel="icon" href="/favicon.svg">');
    expect(head).toContain(
      '<link rel="canonical" href="https://example.com/blog/hello">',
    );
    expect(head).toContain(
      '<meta property="og:image" content="https://example.com/og.png">',
    );
    expect(head).toContain('<meta property="og:image:width" content="1200">');
    expect(head).toContain(
      '<meta name="twitter:card" content="summary_large_image">',
    );
    expect(head).toContain('<meta name="custom-tag" content="value">');
    // og:title falls back to the page title.
    expect(head).toContain('<meta property="og:title" content="Hello">');
  });

  it("escapes attribute values and text", () => {
    const head = renderHeadTags(
      metadataToHeadTags({ title: "<b>&", description: 'say "hi"' }),
    );
    expect(head).toContain("<title>&lt;b>&amp;</title>");
    expect(head).toContain('content="say &quot;hi&quot;"');
  });
});
