import type { DomphyElement } from "@domphy/core";
import { describe, expect, it } from "vitest";
import { markdownToDomphy, parseMarkdown } from "../src/index";

/** Narrows an unknown element to a record for assertion ergonomics. */
function asRecord(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

describe("@domphy/markdown parseMarkdown", () => {
  it("converts ATX headings to h1..h6 with a slug id and collects the toc", () => {
    const { body, toc } = parseMarkdown("# Hello World\n\n## A Section");

    const h1 = asRecord(body[0]);
    expect(h1.h1).toBeDefined();
    expect(h1.id).toBe("hello-world");

    const h2 = asRecord(body[1]);
    expect(h2.h2).toBeDefined();
    expect(h2.id).toBe("a-section");

    expect(toc).toEqual([
      { level: 1, text: "Hello World", slug: "hello-world" },
      { level: 2, text: "A Section", slug: "a-section" },
    ]);
  });

  it("de-duplicates repeated heading slugs", () => {
    const { toc } = parseMarkdown("# Intro\n\n# Intro");
    expect(toc.map((entry) => entry.slug)).toEqual(["intro", "intro-1"]);
  });

  it("wraps paragraph text in a p element", () => {
    const body = markdownToDomphy("Just a paragraph.");
    const p = asRecord(body[0]);
    expect(p.p).toEqual(["Just a paragraph."]);
  });

  it("renders bold, italic, strikethrough and inline code", () => {
    const body = markdownToDomphy("**bold** _italic_ ~~struck~~ `code`");
    const p = asRecord(body[0]);
    const children = p.p as unknown[];

    const tags = children
      .filter(
        (c): c is Record<string, unknown> =>
          typeof c === "object" && c !== null,
      )
      .flatMap((c) => Object.keys(c));

    expect(tags).toContain("strong");
    expect(tags).toContain("em");
    expect(tags).toContain("s");
    expect(tags).toContain("code");
  });

  it("renders links with href", () => {
    const body = markdownToDomphy("[Domphy](https://domphy.dev)");
    const p = asRecord(body[0]);
    const link = asRecord((p.p as unknown[])[0]);
    expect(link.a).toEqual(["Domphy"]);
    expect(link.href).toBe("https://domphy.dev");
  });

  it("renders images with src and alt", () => {
    const body = markdownToDomphy("![logo](/logo.png)");
    const p = asRecord(body[0]);
    const img = asRecord((p.p as unknown[])[0]);
    expect(img.img).toBeNull();
    expect(img.src).toBe("/logo.png");
    expect(img.alt).toBe("logo");
  });

  it("renders unordered lists as ul > li with a _key on each item", () => {
    const body = markdownToDomphy("- one\n- two\n- three");
    const ul = asRecord(body[0]);
    const items = ul.ul as Record<string, unknown>[];
    expect(items).toHaveLength(3);
    for (const item of items) {
      expect(item.li).toBeDefined();
      expect(item._key).toBeTypeOf("number");
    }
    expect(items.map((item) => item._key)).toEqual([0, 1, 2]);
  });

  it("renders ordered lists as ol > li", () => {
    const body = markdownToDomphy("1. first\n2. second");
    const ol = asRecord(body[0]);
    expect(ol.ol).toBeDefined();
    const items = ol.ol as Record<string, unknown>[];
    expect(items).toHaveLength(2);
    expect(items[0].li).toBeDefined();
  });

  it("renders nested lists", () => {
    const body = markdownToDomphy("- parent\n  - child");
    const ul = asRecord(body[0]);
    const items = ul.ul as Record<string, unknown>[];
    const firstItem = asRecord(items[0]);
    const liChildren = firstItem.li as unknown[];
    // The nested list lives among the list item's children.
    const hasNestedUl = liChildren.some(
      (c) => typeof c === "object" && c !== null && "ul" in (c as object),
    );
    expect(hasNestedUl).toBe(true);
  });

  it("renders fenced code blocks as pre > code with data-language", () => {
    const body = markdownToDomphy("```ts\nconst x = 1;\n```");
    const pre = asRecord(body[0]);
    expect(pre.pre).toBeDefined();
    const code = asRecord((pre.pre as unknown[])[0]);
    expect(code.dataLanguage).toBe("ts");
    expect(code.class).toBe("language-ts");
    expect(typeof code.code).toBe("string");
    expect(code.code as string).toContain("const x = 1;");
  });

  it("supports a string highlighter for fenced code", () => {
    const body = markdownToDomphy("```js\nfoo()\n```", {
      highlight: (code, lang) => `<span class="hl-${lang}">${code}</span>`,
    });
    const pre = asRecord(body[0]);
    const code = asRecord((pre.pre as unknown[])[0]);
    expect(code.code).toContain('class="hl-js"');
  });

  it("supports an element-returning highlighter for fenced code", () => {
    const body = markdownToDomphy("```js\nfoo()\n```", {
      highlight: (code) => ({ span: code }) as DomphyElement,
    });
    const pre = asRecord(body[0]);
    const code = asRecord((pre.pre as unknown[])[0]);
    expect(Array.isArray(code.code)).toBe(true);
    const inner = asRecord((code.code as unknown[])[0]);
    expect(inner.span).toBe("foo()\n");
  });

  it("renders blockquotes", () => {
    const body = markdownToDomphy("> quoted text");
    const bq = asRecord(body[0]);
    expect(bq.blockquote).toBeDefined();
  });

  it("renders horizontal rules as a void hr", () => {
    const body = markdownToDomphy("text\n\n---\n\nmore");
    const hr = body.find((el) => "hr" in asRecord(el));
    expect(hr).toBeDefined();
    expect(asRecord(hr).hr).toBeNull();
  });

  it("renders GFM tables into a table tree", () => {
    const md = "| A | B |\n| - | - |\n| 1 | 2 |";
    const body = markdownToDomphy(md);
    const table = asRecord(body[0]);
    expect(table.table).toBeDefined();

    const tableChildren = table.table as Record<string, unknown>[];
    const tags = tableChildren.flatMap((c) => Object.keys(c));
    expect(tags).toContain("thead");
    expect(tags).toContain("tbody");

    const thead = asRecord(tableChildren.find((c) => "thead" in c));
    const headerRow = asRecord((thead.thead as unknown[])[0]);
    const headerCells = headerRow.tr as Record<string, unknown>[];
    expect(headerCells.every((cell) => "th" in cell)).toBe(true);
  });

  it("passes raw html_block through as a direct string child (no wrapper div)", () => {
    const body = markdownToDomphy('<div class="raw">hi</div>');
    expect(typeof body[0]).toBe("string");
    expect(body[0] as string).toContain("raw");
  });

  it("parses YAML frontmatter and strips it from the body", () => {
    const md = "---\ntitle: My Doc\ntags:\n  - a\n  - b\n---\n# Body";
    const { frontmatter, body } = parseMarkdown(md);
    expect(frontmatter.title).toBe("My Doc");
    expect(frontmatter.tags).toEqual(["a", "b"]);
    // The body must start at the heading, not the frontmatter.
    expect(asRecord(body[0]).h1).toBeDefined();
  });

  it("returns empty frontmatter when none is present", () => {
    const { frontmatter } = parseMarkdown("# No Frontmatter");
    expect(frontmatter).toEqual({});
  });

  it("uses a custom slugify function when provided", () => {
    const { toc } = parseMarkdown("# Hello World", {
      anchorSlugify: (text) => text.replace(/\s+/g, "_").toUpperCase(),
    });
    expect(toc[0].slug).toBe("HELLO_WORLD");
  });
});
