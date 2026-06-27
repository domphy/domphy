import { describe, expect, it } from "vitest";
import { markdownToDomphy } from "../src/index";

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
  it("passes block HTML through as a raw string (no wrapper)", () => {
    const body = markdownToDomphy('<div class="raw">hi</div>');
    expect(typeof body[0]).toBe("string");
    expect(body[0] as string).toContain("raw");
  });
});

describe("line breaks", () => {
  it("normalises soft newlines inside paragraphs to spaces", () => {
    const body = markdownToDomphy("line one\nline two");
    const children = asRecord(body[0]).p as unknown[];
    // With remark, the two words appear in a single text value; soft newlines
    // in MDAST text values are normalised to spaces by the walker.
    const joined = children.join("");
    expect(joined).toContain("line one");
    expect(joined).toContain("line two");
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
