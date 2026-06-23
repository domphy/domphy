import type { DomphyElement } from "@domphy/core";
import MarkdownIt from "markdown-it";
import { describe, expect, it } from "vitest";
import {
  createUniqueSlugger,
  defaultSlugify,
  type MarkdownItToken,
  markdownToDomphy,
  tokensToDomphy,
  walkTokens,
} from "../src/index";

/** Narrows an unknown element to a record for assertion ergonomics. */
function asRecord(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

/** Returns the first cell element of the first body row of a parsed table. */
function tableCells(table: Record<string, unknown>): Record<string, unknown>[] {
  const tableChildren = table.table as Record<string, unknown>[];
  const thead = asRecord(tableChildren.find((child) => "thead" in child));
  const headerRow = asRecord((thead.thead as unknown[])[0]);
  return headerRow.tr as Record<string, unknown>[];
}

describe("aligned GFM tables", () => {
  it('parses `style="text-align:..."` into a Domphy style object', () => {
    // markdown-it emits a STRING style attribute on aligned cells; the walker
    // must convert it into an object so column alignment survives.
    const md = "| L | C | R |\n|:--|:-:|--:|\n| 1 | 2 | 3 |";
    const body = markdownToDomphy(md);
    const cells = tableCells(asRecord(body[0]));

    expect(cells).toHaveLength(3);
    expect(cells[0].style).toEqual({ textAlign: "left" });
    expect(cells[1].style).toEqual({ textAlign: "center" });
    expect(cells[2].style).toEqual({ textAlign: "right" });
  });

  it("leaves cells without explicit alignment unstyled", () => {
    const md = "| A | B |\n| - | - |\n| 1 | 2 |";
    const body = markdownToDomphy(md);
    const cells = tableCells(asRecord(body[0]));
    expect(cells[0].style).toBeUndefined();
    expect(cells[1].style).toBeUndefined();
  });
});

describe("html_inline (current per-fragment behavior)", () => {
  it("wraps each raw inline HTML fragment in its own span", () => {
    // markdown-it streams inline HTML as separate open/close fragment tokens.
    // The walker wraps EACH fragment in a span rather than reconstructing the
    // nested element. This test documents that current limitation so a future
    // change to the matcher is caught.
    const body = markdownToDomphy("text <strong>bold</strong> end");
    const children = asRecord(body[0]).p as unknown[];

    expect(children[0]).toBe("text ");
    expect(asRecord(children[1]).span).toBe("<strong>");
    expect(children[2]).toBe("bold");
    expect(asRecord(children[3]).span).toBe("</strong>");
    expect(children[4]).toBe(" end");
  });
});

describe("line breaks", () => {
  it("renders a softbreak as a single space", () => {
    const body = markdownToDomphy("line one\nline two");
    const children = asRecord(body[0]).p as unknown[];
    expect(children).toEqual(["line one", " ", "line two"]);
  });

  it("renders a hardbreak (two trailing spaces) as a void br element", () => {
    const body = markdownToDomphy("line one  \nline two");
    const children = asRecord(body[0]).p as unknown[];
    expect(children[0]).toBe("line one");
    expect(asRecord(children[1]).br).toBeNull();
    expect(children[2]).toBe("line two");
  });
});

describe("code blocks", () => {
  it("renders an indented (4-space) code block with no language", () => {
    const body = markdownToDomphy("    const x = 1;\n    const y = 2;");
    const pre = asRecord(body[0]);
    expect(pre.pre).toBeDefined();
    const code = asRecord((pre.pre as unknown[])[0]);
    // Indented blocks carry no info string, so no language metadata is set.
    expect(code.dataLanguage).toBeUndefined();
    expect(code.class).toBeUndefined();
    expect(code.code as string).toContain("const x = 1;");
    expect(code.code as string).toContain("const y = 2;");
  });

  it("renders a fenced code block with language metadata", () => {
    const body = markdownToDomphy("```ts\nconst x = 1;\n```");
    const code = asRecord((asRecord(body[0]).pre as unknown[])[0]);
    expect(code.dataLanguage).toBe("ts");
    expect(code.class).toBe("language-ts");
  });
});

describe("tokensToDomphy / walkTokens (bring-your-own markdown-it)", () => {
  it("converts a caller-parsed token stream via tokensToDomphy", () => {
    const md = new MarkdownIt();
    const tokens = md.parse("# Title\n\nA paragraph.", {}) as MarkdownItToken[];

    const { body, toc } = tokensToDomphy(tokens);

    const heading = asRecord(body[0]);
    expect(heading.h1).toEqual(["Title"]);
    expect(heading.id).toBe("title");
    expect(asRecord(body[1]).p).toEqual(["A paragraph."]);
    expect(toc).toEqual([{ level: 1, text: "Title", slug: "title" }]);
  });

  it("converts a token stream directly via walkTokens", () => {
    const md = new MarkdownIt();
    const tokens = md.parse("## Section", {}) as MarkdownItToken[];
    const slug = createUniqueSlugger(defaultSlugify);
    const toc: { level: number; text: string; slug: string }[] = [];

    const body = walkTokens(tokens as never, { slug, toc }) as DomphyElement[];

    const heading = asRecord(body[0]);
    expect(heading.h2).toEqual(["Section"]);
    expect(heading.id).toBe("section");
    expect(toc).toEqual([{ level: 2, text: "Section", slug: "section" }]);
  });
});

describe("slug helpers", () => {
  it("falls back to `section` for empty slugs", () => {
    const slug = createUniqueSlugger(defaultSlugify);
    expect(slug("")).toBe("section");
    // A second empty slug must still be unique.
    expect(slug("!!!")).toBe("section-1");
  });

  it("appends a numeric suffix to duplicate slugs", () => {
    const slug = createUniqueSlugger(defaultSlugify);
    expect(slug("Intro")).toBe("intro");
    expect(slug("Intro")).toBe("intro-1");
    expect(slug("Intro")).toBe("intro-2");
  });

  it("keeps unicode word characters in the slug", () => {
    // The default slugify retains letters/numbers from any script and only
    // strips punctuation, so accented and CJK text is preserved.
    expect(defaultSlugify("Café Münchën")).toBe("café-münchën");
    expect(defaultSlugify("日本語 ドキュメント")).toBe("日本語-ドキュメント");
  });
});
