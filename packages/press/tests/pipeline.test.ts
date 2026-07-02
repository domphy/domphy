import { tmpdir } from "node:os";
import { join } from "node:path";
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
      "A label <Badge type=\"tip\" text=\"New\" /> in prose.\n\n" +
      "Warning badge: <Badge type=\"warning\" text=\"Beta\" />\n\n" +
      "Default type: <Badge text=\"v1\" />\n";
    const { body } = await renderDoc(source, opts);
    const allHtml = JSON.stringify(body);
    expect(allHtml).toContain('dp-badge dp-badge-tip');
    expect(allHtml).toContain('dp-badge dp-badge-warning');
    expect(allHtml).toContain('dp-badge dp-badge-tip');
    expect(allHtml).toContain('>New<');
    expect(allHtml).toContain('>Beta<');
    expect(allHtml).toContain('>v1<');
    // Must NOT contain raw <Badge tags
    expect(allHtml).not.toContain('<Badge');
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
    // single MDAST html node — walkMdast emits that as one raw string, not
    // a structured DomphyElement (there is nothing left for Domphy's own
    // ElementNode wrapper to add — the CSS-in-JS scoping/lifecycle it would
    // provide isn't needed for a plain-CSS radio/label tab switcher).
    const cg = body.find(
      (el) => typeof el === "string" && el.includes('class="code-group"'),
    ) as string | undefined;
    expect(cg, "code-group html block not found").toBeDefined();
    expect(cg).toContain('<input type="radio"');
    expect(cg).toContain('class="tabs"');
    expect(cg).toContain('class="blocks"');
  });
});
