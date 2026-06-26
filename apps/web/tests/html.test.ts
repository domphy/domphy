import { describe, expect, it } from "vitest";
import { htmlDocument, RUNTIME_SCRIPT } from "../html-template.ts";

const emptyResult = { html: "<p>Hello</p>", css: "", head: "", status: 200 };

describe("htmlDocument", () => {
  it("includes data-theme=light on the html element", () => {
    const html = htmlDocument(emptyResult, "", [], []);
    expect(html).toContain('<html lang="en" data-theme="light">');
  });

  it("includes the runtime script that restores theme from localStorage", () => {
    const html = htmlDocument(emptyResult, "", [], []);
    expect(html).toContain("localStorage.getItem('dp-theme')");
    expect(html).toContain("data-theme");
  });

  it("embeds generated CSS in a style tag", () => {
    const html = htmlDocument(emptyResult, ".foo{color:red}", [], []);
    expect(html).toContain("<style>.foo{color:red}</style>");
  });

  it("serializes island specs as JSON with < escaped to avoid script injection", () => {
    const specs = [
      { kind: "search" as const, id: "search", source: "<script>" },
    ];
    const html = htmlDocument(emptyResult, "", specs, []);
    expect(html).toContain("__DP_PAGE_ISLANDS__");
    // Raw < would allow "</script>" inside JSON to close the script tag prematurely
    const match = html.match(/window\.__DP_PAGE_ISLANDS__=(.+?);/);
    expect(match).not.toBeNull();
    expect(match![1]).not.toContain("<");
    expect(() => JSON.parse(match![1])).not.toThrow();
  });

  it("includes extra head entries", () => {
    const html = htmlDocument(
      emptyResult,
      "",
      [],
      [
        '<link rel="canonical" href="https://domphy.com/">',
        '<meta name="og:title" content="Domphy">',
      ],
    );
    expect(html).toContain('rel="canonical"');
    expect(html).toContain("og:title");
  });

  it("embeds page HTML in #domphy-app", () => {
    const html = htmlDocument(
      { ...emptyResult, html: "<h1>Title</h1>" },
      "",
      [],
      [],
    );
    expect(html).toContain('<div id="domphy-app"><h1>Title</h1></div>');
  });
});

describe("RUNTIME_SCRIPT", () => {
  it("is non-empty", () => {
    expect(RUNTIME_SCRIPT.trim().length).toBeGreaterThan(0);
  });

  it("contains the theme toggle logic", () => {
    expect(RUNTIME_SCRIPT).toContain("data-theme-toggle");
    expect(RUNTIME_SCRIPT).toContain("data-theme");
  });
});
