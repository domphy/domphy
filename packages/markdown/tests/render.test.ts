import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ElementNode } from "@domphy/core";
import { describe, expect, it } from "vitest";
import { parseMarkdown } from "../src/index";

const here = dirname(fileURLToPath(import.meta.url));

describe("@domphy/markdown end-to-end with @domphy/core", () => {
  it("produces a body that @domphy/core can render to HTML", () => {
    const md = [
      "# Title",
      "",
      "A paragraph with **bold**, _italic_, and a [link](https://example.com).",
      "",
      "- one",
      "- two",
      "",
      "```ts",
      "const value = 42;",
      "```",
      "",
      "| A | B |",
      "| - | - |",
      "| 1 | 2 |",
    ].join("\n");

    const { body } = parseMarkdown(md);
    const html = new ElementNode({ div: body }).generateHTML();

    // @domphy/core stamps a generated class on every element, so assert on the
    // opening tag prefix and inner text rather than bare `<tag>` forms.
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain("<h1");
    expect(html).toContain(">Title<");
    expect(html).toContain(">bold</strong>");
    expect(html).toContain(">italic</em>");
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain("<ul");
    expect(html).toContain("<li");
    expect(html).toContain("<pre");
    expect(html).toContain("<code");
    expect(html).toContain('data-language="ts"');
    expect(html).toContain("<table");
    expect(html).toContain("<th");
    expect(html).toContain("<td");
  });

  it("renders the heading id so anchors work in the generated HTML", () => {
    const { body } = parseMarkdown("## My Section");
    const html = new ElementNode({ div: body }).generateHTML();
    expect(html).toContain('id="my-section"');
  });

  it("does not double-escape special characters in fenced code blocks", () => {
    const md = "```ts\nconst x: Array<string> = [];\nif (a < b) {}\n```";
    const { body } = parseMarkdown(md);
    const html = new ElementNode({ div: body }).generateHTML();
    // @domphy/core's TextNode escapes plain text once on render; markdown must
    // pass the raw code through rather than pre-escaping it itself.
    expect(html).toContain("const x: Array&lt;string&gt; = [];");
    expect(html).toContain("if (a &lt; b) {}");
    expect(html).not.toContain("&amp;lt;");
    expect(html).not.toContain("&amp;gt;");
  });

  it("parses a real docs markdown file without throwing and yields many elements", () => {
    const docPath = resolve(here, "../../../apps/web/docs/index.md");
    const source = readFileSync(docPath, "utf8");

    let result: ReturnType<typeof parseMarkdown> | undefined;
    expect(() => {
      result = parseMarkdown(source);
    }).not.toThrow();

    expect(result).toBeDefined();
    const { body } = result as ReturnType<typeof parseMarkdown>;
    expect(body.length).toBeGreaterThan(3);

    // The whole tree must be renderable by core without throwing.
    let html = "";
    expect(() => {
      html = new ElementNode({ div: body }).generateHTML();
    }).not.toThrow();
    expect(html.length).toBeGreaterThan(0);
  });
});
