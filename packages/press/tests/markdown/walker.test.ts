import { isRawHTML, type RawHTML } from "@domphy/core";
import { describe, expect, it } from "vitest";
import {
  createUniqueSlugger,
  defaultSlugify,
  markdownToDomphy,
} from "../../src/index";

/** Narrows an unknown element to a record for assertion ergonomics. */
function asRecord(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

describe("aligned GFM tables (remark-gfm)", () => {
  it("sets style.textAlign on aligned columns", () => {
    const md = "| L | C | R |\n|:--|:-:|--:|\n| 1 | 2 | 3 |";
    const body = markdownToDomphy(md);
    const table = asRecord(body[0]);
    const tableChildren = table.table as Record<string, unknown>[];
    const thead = asRecord(tableChildren.find((c) => "thead" in c));
    const headerRow = asRecord((thead.thead as unknown[])[0]);
    const cells = headerRow.tr as Record<string, unknown>[];

    expect(cells).toHaveLength(3);
    expect(cells[0].style).toEqual({ textAlign: "left" });
    expect(cells[1].style).toEqual({ textAlign: "center" });
    expect(cells[2].style).toEqual({ textAlign: "right" });
  });

  it("leaves cells without explicit alignment unstyled", () => {
    const md = "| A | B |\n| - | - |\n| 1 | 2 |";
    const body = markdownToDomphy(md);
    const table = asRecord(body[0]);
    const tableChildren = table.table as Record<string, unknown>[];
    const thead = asRecord(tableChildren.find((c) => "thead" in c));
    const headerRow = asRecord((thead.thead as unknown[])[0]);
    const cells = headerRow.tr as Record<string, unknown>[];
    expect(cells[0].style).toBeUndefined();
    expect(cells[1].style).toBeUndefined();
  });
});

describe("raw HTML passthrough", () => {
  it("passes block HTML through as a rawHtml child (no wrapper)", () => {
    const body = markdownToDomphy('<div class="raw">hi</div>');
    expect(isRawHTML(body[0])).toBe(true);
    expect((body[0] as RawHTML).html).toContain("raw");
  });
});

describe("line breaks", () => {
  it("normalises soft newlines inside paragraphs to spaces", () => {
    const body = markdownToDomphy("line one\nline two");
    // remark keeps the soft break as a literal \\n in one text node; the
    // walker replaces it in-place so the paragraph is a single string.
    expect(asRecord(body[0]).p).toEqual(["line one line two"]);
  });

  it("renders a hardbreak (two trailing spaces) as a void br element", () => {
    const body = markdownToDomphy("line one  \nline two");
    const children = asRecord(body[0]).p as unknown[];
    const hasBr = children.some(
      (c) =>
        typeof c === "object" &&
        c !== null &&
        "br" in (c as Record<string, unknown>),
    );
    expect(hasBr).toBe(true);
  });
});

describe("createUniqueSlugger", () => {
  it("guarantees document-wide unique slugs, even across suffix collisions", () => {
    const slug = createUniqueSlugger(defaultSlugify);
    expect(slug("Intro")).toBe("intro");
    expect(slug("Intro 1")).toBe("intro-1");
    // A second "Intro" must not reuse "intro-1", which "Intro 1" already claimed.
    expect(slug("Intro")).toBe("intro-2");
  });
});

describe("GFM task lists (remark-gfm)", () => {
  it("renders [x] items with a checked disabled checkbox", () => {
    const body = markdownToDomphy("- [x] Done");
    const ul = asRecord(body[0]);
    const item = asRecord((ul.ul as Record<string, unknown>[])[0]);
    const liChildren = item.li as unknown[];
    const checkbox = asRecord(liChildren[0]);
    expect(checkbox.input).toBeNull();
    expect(checkbox.type).toBe("checkbox");
    expect(checkbox.disabled).toBe(true);
    expect(checkbox.checked).toBe(true);
  });

  it("renders [ ] items with an unchecked disabled checkbox", () => {
    const body = markdownToDomphy("- [ ] Todo");
    const ul = asRecord(body[0]);
    const item = asRecord((ul.ul as Record<string, unknown>[])[0]);
    const liChildren = item.li as unknown[];
    const checkbox = asRecord(liChildren[0]);
    expect(checkbox.checked).toBeUndefined();
  });
});

describe("reference-style links and images", () => {
  it("resolves a full link reference to the same shape as an inline link", () => {
    const body = markdownToDomphy(
      '[Domphy][home]\n\n[home]: https://domphy.dev "Homepage"',
    );
    expect(body).toHaveLength(1);
    const link = asRecord((asRecord(body[0]).p as unknown[])[0]);
    expect(link.a).toEqual(["Domphy"]);
    expect(link.href).toBe("https://domphy.dev");
    expect(link.title).toBe("Homepage");
    expect(link.target).toBe("_blank");
    expect(link.rel).toBe("noopener noreferrer");
  });

  it("resolves shortcut and collapsed link references", () => {
    const body = markdownToDomphy(
      "[foo] and [bar][]\n\n[foo]: /foo\n[bar]: /bar",
    );
    const children = asRecord(body[0]).p as unknown[];
    const first = asRecord(children[0]);
    const second = asRecord(children[2]);
    expect(first.a).toEqual(["foo"]);
    expect(first.href).toBe("/foo");
    expect(first.target).toBeUndefined();
    expect(second.a).toEqual(["bar"]);
    expect(second.href).toBe("/bar");
  });

  it("matches reference identifiers case-insensitively", () => {
    const body = markdownToDomphy("[X][FOO]\n\n[foo]: https://example.com");
    const link = asRecord((asRecord(body[0]).p as unknown[])[0]);
    expect(link.href).toBe("https://example.com");
  });

  it("resolves an image reference to the same shape as an inline image", () => {
    const body = markdownToDomphy(
      '![A diagram][pic]\n\n[pic]: /img/diagram.png "Figure 1"',
    );
    const img = asRecord((asRecord(body[0]).p as unknown[])[0]);
    expect(img.img).toBeNull();
    expect(img.src).toBe("/img/diagram.png");
    expect(img.alt).toBe("A diagram");
    expect(img.title).toBe("Figure 1");
    expect(img.loading).toBe("lazy");
  });

  it("does not emit definition nodes into the body", () => {
    const body = markdownToDomphy("hello\n\n[unused]: https://example.com");
    expect(body).toHaveLength(1);
    expect(asRecord(body[0]).p).toEqual(["hello"]);
  });

  it("neutralizes script-capable URL schemes on resolved references", () => {
    const body = markdownToDomphy("[x][bad]\n\n[bad]: javascript:alert(1)");
    const link = asRecord((asRecord(body[0]).p as unknown[])[0]);
    expect(link.href).toBe("#");
  });
});

describe("GFM footnotes", () => {
  it("renders a footnote reference as a numbered superscript link", () => {
    const body = markdownToDomphy("See note.[^1]\n\n[^1]: The note.");
    const children = asRecord(body[0]).p as unknown[];
    expect(children[0]).toBe("See note.");
    const sup = asRecord(children[1]);
    const link = asRecord((sup.sup as unknown[])[0]);
    expect(link.a).toBe("1");
    expect(link.href).toBe("#user-content-fn-1");
    expect(link.id).toBe("user-content-fnref-1");
    expect(link.dataFootnoteRef).toBe(true);
    expect(link["aria-describedby"]).toBe("footnote-label");
  });

  it("reuses the same number when a footnote is referenced twice", () => {
    const body = markdownToDomphy(
      "First.[^1] Again.[^1]\n\n[^1]: Shared.",
    );
    const children = asRecord(body[0]).p as unknown[];
    const first = asRecord((asRecord(children[1]).sup as unknown[])[0]);
    const second = asRecord((asRecord(children[3]).sup as unknown[])[0]);
    expect(first.a).toBe("1");
    expect(second.a).toBe("1");
    expect(first.id).toBe("user-content-fnref-1");
    expect(second.id).toBe("user-content-fnref-1-2");
  });

  it("numbers footnotes by first-reference order, not definition order", () => {
    const body = markdownToDomphy(
      "A.[^note] B.[^1]\n\n[^1]: First defined.\n\n[^note]: Second defined.",
    );
    const children = asRecord(body[0]).p as unknown[];
    const first = asRecord((asRecord(children[1]).sup as unknown[])[0]);
    const second = asRecord((asRecord(children[3]).sup as unknown[])[0]);
    expect(first.a).toBe("1");
    expect(first.href).toBe("#user-content-fn-note");
    expect(second.a).toBe("2");
    expect(second.href).toBe("#user-content-fn-1");
  });

  it("appends a footnotes section and does not leak definitions into the body", () => {
    const body = markdownToDomphy(
      "See note.[^1]\n\n[^1]: First footnote with **bold**.",
    );
    expect(body).toHaveLength(2);
    expect(asRecord(body[0]).p).toBeDefined();

    const section = asRecord(body[1]);
    expect(section.class).toBe("footnotes");
    expect(section.dataFootnotes).toBe(true);
    const sectionChildren = section.section as unknown[];

    const heading = asRecord(sectionChildren[0]);
    expect(heading.h2).toBe("Footnotes");
    expect(heading.id).toBe("footnote-label");
    expect(heading.class).toBe("sr-only");

    const list = asRecord(sectionChildren[1]);
    const item = asRecord((list.ol as unknown[])[0]);
    expect(item.id).toBe("user-content-fn-1");
    const itemChildren = item.li as unknown[];
    const paragraph = asRecord(itemChildren[0]);
    const pChildren = paragraph.p as unknown[];
    expect(pChildren[0]).toBe("First footnote with ");
    expect(asRecord(pChildren[1]).strong).toEqual(["bold"]);
    expect(pChildren[2]).toBe(".");
    expect(pChildren[3]).toBe(" ");
    const backref = asRecord(pChildren[4]);
    expect(backref.a).toBe("↩");
    expect(backref.href).toBe("#user-content-fnref-1");
    expect(backref.dataFootnoteBackref).toBe(true);
    expect(backref.class).toBe("data-footnote-backref");
    expect(backref.ariaLabel).toBe("Back to reference 1");
  });

  it("adds a numbered backref for each additional reference of the same note", () => {
    const body = markdownToDomphy("A.[^1] B.[^1]\n\n[^1]: Shared.");
    const section = asRecord(body[1]);
    const item = asRecord(
      (asRecord((section.section as unknown[])[1]).ol as unknown[])[0],
    );
    const pChildren = asRecord((item.li as unknown[])[0]).p as unknown[];
    const firstBack = asRecord(pChildren[pChildren.length - 3]);
    const secondBack = asRecord(pChildren[pChildren.length - 1]);
    expect(firstBack.href).toBe("#user-content-fnref-1");
    expect(firstBack.a).toBe("↩");
    expect(secondBack.href).toBe("#user-content-fnref-1-2");
    expect(secondBack.a).toEqual(["↩", { sup: "2" }]);
    expect(secondBack.ariaLabel).toBe("Back to reference 1-2");
  });

  it("omits unused footnote definitions and emits no footer without refs", () => {
    const body = markdownToDomphy("No refs.\n\n[^orphan]: Unused.");
    expect(body).toHaveLength(1);
    expect(asRecord(body[0]).p).toEqual(["No refs."]);
  });
});

describe("heading anchors", () => {
  it("appends a header-anchor child matching the heading slug", () => {
    const body = markdownToDomphy("# Level 1");
    const heading = asRecord(body[0]);
    expect(heading.id).toBe("level-1");
    expect(heading.h1).toEqual([
      "Level 1",
      {
        a: "#",
        href: "#level-1",
        class: "header-anchor",
        ariaHidden: "true",
        tabIndex: -1,
      },
    ]);
  });
});
