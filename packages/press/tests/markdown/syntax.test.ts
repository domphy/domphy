import { ElementNode } from "@domphy/core";
import { describe, expect, it } from "vitest";
import { markdownToDomphy } from "../../src/index";

/** Narrows an unknown element to a record for assertion ergonomics. */
function asRecord(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function htmlOf(md: string): string {
  return new ElementNode({ div: markdownToDomphy(md) }).generateHTML();
}

describe("markdown-it-mark / markdown-it-sub / markdown-it-sup (VitePress)", () => {
  it("renders ==highlighted== as a mark element", () => {
    const html = htmlOf("==highlighted==");
    expect(html).toContain("<mark");
    expect(html).toContain(">highlighted</mark>");
  });

  it("renders H~2~O as subscript (markdown-it-sub)", () => {
    const html = htmlOf("H~2~O");
    expect(html).toContain("<sub");
    expect(html).toContain(">2</sub>");
    expect(html).toContain("H");
    expect(html).toContain("O");
  });

  it("renders E=mc^2^ as superscript (markdown-it-sup)", () => {
    const html = htmlOf("E=mc^2^");
    expect(html).toContain("<sup");
    expect(html).toContain(">2</sup>");
    expect(html).toContain("E=mc");
  });

  it("wraps nested markdown inside ==…== (markdown-it-mark delimiter pairing)", () => {
    const body = markdownToDomphy("==**bold**==");
    const children = asRecord(body[0]).p as unknown[];
    const mark = asRecord(children[0]);
    expect(mark.mark).toBeDefined();
    const inner = mark.mark as unknown[];
    expect(asRecord(inner[0]).strong).toEqual(["bold"]);
  });

  it("does not treat ~~strikethrough~~ as subscript (GFM delete wins)", () => {
    const body = markdownToDomphy("~~struck~~");
    const children = asRecord(body[0]).p as unknown[];
    expect(asRecord(children[0]).s).toEqual(["struck"]);
  });

  it("leaves ==…== and ~sub~ inside inline code as literal text", () => {
    const body = markdownToDomphy("use `==x==` and `H~2~O`");
    const children = asRecord(body[0]).p as unknown[];
    const codes = children
      .filter(
        (child): child is Record<string, unknown> =>
          typeof child === "object" && child !== null && "code" in child,
      )
      .map((child) => child.code);
    expect(codes).toContain("==x==");
    expect(codes).toContain("H~2~O");
  });
});

describe("GitHub gemoji shortcodes (remark-gemoji)", () => {
  it("renders :tada: :smile: :rocket: as emoji", () => {
    const html = htmlOf(":tada: :smile: :rocket:");
    expect(html).toContain("🎉");
    expect(html).toContain("😄");
    expect(html).toContain("🚀");
    expect(html).not.toContain(":tada:");
  });

  it("leaves unknown :not_an_emoji: shortcodes as literal text", () => {
    const html = htmlOf(":not_an_emoji:");
    expect(html).toContain(":not_an_emoji:");
  });

  it("does not expand :tada: inside a fenced code block", () => {
    const html = htmlOf("```\n:tada:\n```");
    expect(html).toContain(":tada:");
    expect(html).not.toContain("🎉");
  });
});
