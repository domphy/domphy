import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isRawHTML } from "@domphy/core";
import { describe, expect, it } from "vitest";
import { renderDoc } from "../src/pipeline.ts";
import type { RenderDocOptions } from "../src/types.ts";

const opts: RenderDocOptions = {
  filePath: join(tmpdir(), "test.md"),
  docsDir: tmpdir(),
  repoRoot: tmpdir(),
  highlight: (code) => code,
};

describe("renderDoc", () => {
  it("renders basic markdown into a body array", async () => {
    const { body } = await renderDoc("# Hello\n\nParagraph.", opts);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  it("extracts title from frontmatter when present", async () => {
    const source = "---\ntitle: My Title\n---\n# Other Heading\n";
    const { title } = await renderDoc(source, opts);
    expect(title).toBe("My Title");
  });

  it("extracts title from the first H1 when no frontmatter title", async () => {
    const { title } = await renderDoc("# Hello World\n\nContent.", opts);
    expect(title).toBe("Hello World");
  });

  it("generates TOC entries from headings", async () => {
    const source = "## Section One\n\n### Sub\n\n## Section Two\n";
    const { toc } = await renderDoc(source, opts);
    expect(toc.map((e) => e.text)).toEqual([
      "Section One",
      "Sub",
      "Section Two",
    ]);
  });

  it("parses frontmatter fields", async () => {
    const source = "---\ndescription: A test page\ntag: docs\n---\nContent.";
    const { frontmatter } = await renderDoc(source, opts);
    expect(frontmatter.description).toBe("A test page");
    expect(frontmatter.tag).toBe("docs");
  });

  it("returns empty islands array", async () => {
    const { islands } = await renderDoc("Simple content.", opts);
    expect(islands).toEqual([]);
  });

  it("injects anchor slugs on headings", async () => {
    const { body } = await renderDoc("## Hello World\n", opts);
    const heading = body.find(
      (el) => typeof el === "object" && el !== null && "h2" in el,
    ) as Record<string, unknown> | undefined;
    expect(heading).toBeDefined();
    expect((heading as any).id).toBeDefined();
  });

  it("transforms <Badge> inline component to dp-badge span", async () => {
    const source =
      'A label <Badge type="tip" text="New" /> in prose.\n\n' +
      'Warning badge: <Badge type="warning" text="Beta" />\n\n' +
      'Default type: <Badge text="v1" />\n';
    const { body } = await renderDoc(source, opts);
    const allHtml = JSON.stringify(body);
    expect(allHtml).toContain("dp-badge dp-badge-tip");
    expect(allHtml).toContain("dp-badge dp-badge-warning");
    expect(allHtml).toContain("dp-badge dp-badge-tip");
    expect(allHtml).toContain(">New<");
    expect(allHtml).toContain(">Beta<");
    expect(allHtml).toContain(">v1<");
    // Must NOT contain raw <Badge tags
    expect(allHtml).not.toContain("<Badge");
  });

  it("code-group: renders as one self-contained html block, no extra wrapper divs", async () => {
    const md = [
      "::: code-group",
      "",
      "```ts [TS]",
      "const x = 1",
      "```",
      "",
      "```js [JS]",
      "const x = 1",
      "```",
      "",
      ":::",
    ].join("\n");
    const { body } = await renderDoc(md, opts);
    // pressCodeGroupPlugin replaces the whole containerDirective with a
    // single MDAST html node — walkMdast emits that as one rawHtml() child,
    // not a structured DomphyElement (there is nothing left for Domphy's own
    // ElementNode wrapper to add — the CSS-in-JS scoping/lifecycle it would
    // provide isn't needed for a plain-CSS radio/label tab switcher).
    const cg = body
      .map((el) => (isRawHTML(el) ? el.html : el))
      .find(
        (el): el is string =>
          typeof el === "string" && el.includes('class="code-group"'),
      );
    expect(cg, "code-group html block not found").toBeDefined();
    expect(cg).toContain('<input type="radio"');
    expect(cg).toContain('class="tabs"');
    expect(cg).toContain('class="blocks"');
  });
});

describe("fence-aware preprocessing", () => {
  it("preserves <script> tags inside fenced code blocks", async () => {
    const md = [
      "```html",
      "<script>console.log('sample')</script>",
      "```",
    ].join("\n");
    const { body } = await renderDoc(md, opts);
    const allHtml = JSON.stringify(body);
    expect(allHtml).toContain("console.log");
    expect(allHtml).toContain("script");
  });

  it("still strips <script> blocks from prose", async () => {
    const md = "Before.\n\n<script>alert(1)</script>\n\nAfter.\n";
    const { body } = await renderDoc(md, opts);
    const allHtml = JSON.stringify(body);
    expect(allHtml).not.toContain("alert");
    expect(allHtml).toContain("Before");
    expect(allHtml).toContain("After");
  });

  it("does not expand <<< code imports inside fenced code blocks", async () => {
    const md = ["```md", "<<< ./does-not-exist.ts", "```"].join("\n");
    const { body } = await renderDoc(md, opts);
    const allHtml = JSON.stringify(body);
    // Left exactly as written — no import attempt, no error fence splice.
    expect(allHtml).toContain("<<< ./does-not-exist.ts");
    expect(allHtml).not.toContain("Could not import");
  });

  it("still expands <<< code imports outside fences", async () => {
    const dir = mkdtempSync(join(tmpdir(), "press-import-"));
    writeFileSync(join(dir, "snippet.ts"), "export const answer = 42;\n");
    writeFileSync(join(dir, "page.md"), "");
    const { body } = await renderDoc("<<< ./snippet.ts\n", {
      ...opts,
      filePath: join(dir, "page.md"),
      docsDir: dir,
    });
    expect(JSON.stringify(body)).toContain("export const answer = 42");
  });

  it("does not expand !!!include()!!! markers inside fenced code blocks", async () => {
    const dir = mkdtempSync(join(tmpdir(), "press-include-"));
    writeFileSync(join(dir, "partial.md"), "INCLUDED CONTENT\n");
    const md = ["```md", "!!!include(./partial.md)!!!", "```"].join("\n");
    const { body } = await renderDoc(md, { ...opts, docsDir: dir });
    const allHtml = JSON.stringify(body);
    expect(allHtml).toContain("!!!include(./partial.md)!!!");
    expect(allHtml).not.toContain("INCLUDED CONTENT");
  });

  it("still expands !!!include()!!! markers outside fences", async () => {
    const dir = mkdtempSync(join(tmpdir(), "press-include-"));
    writeFileSync(join(dir, "partial.md"), "INCLUDED CONTENT\n");
    const { body } = await renderDoc("!!!include(./partial.md)!!!\n", {
      ...opts,
      docsDir: dir,
    });
    expect(JSON.stringify(body)).toContain("INCLUDED CONTENT");
  });

  it("preserves <Badge> markers inside fenced code blocks", async () => {
    const md = [
      "```md",
      'Available since <Badge type="tip" text="v2.0" />',
      "```",
    ].join("\n");
    const { body } = await renderDoc(md, opts);
    const allHtml = JSON.stringify(body);
    expect(allHtml).toContain("<Badge");
    expect(allHtml).not.toContain("dp-badge");
  });

  it("preserves adjacent code fences when a later fence contains <script>", async () => {
    // The gap between two adjacent fences is a one-character ("\n") segment;
    // a non-local transform that trims leading blank lines would fuse the
    // fences into one unclosed block and swallow the rest of the document.
    const md = [
      "::: code-group",
      "```bash [NPM]",
      "npm install @domphy/ui",
      "```",
      "```html [CDN]",
      '<script src="https://example.com/lib.js"></script>',
      "```",
      ":::",
      "",
      "After the group.",
    ].join("\n");
    const { body } = await renderDoc(md, opts);
    const allHtml = JSON.stringify(body);
    expect(allHtml).toContain("npm install @domphy/ui");
    expect(allHtml).toContain("example.com/lib.js");
    expect(allHtml).toContain("After the group.");
  });

  it("preserves ::: container syntax inside fenced code blocks", async () => {
    const md = ["```md", "::: tip My Title", "content", ":::", "```"].join(
      "\n",
    );
    const { body } = await renderDoc(md, opts);
    const allHtml = JSON.stringify(body);
    expect(allHtml).toContain("::: tip My Title");
    expect(allHtml).not.toContain("custom-block tip");
  });
});
