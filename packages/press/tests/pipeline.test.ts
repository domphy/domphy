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

  it("code-group: inputs and blocks are direct children, no extra wrapper divs", async () => {
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
    const cg = body.find(
      (el) =>
        typeof el === "object" &&
        el !== null &&
        "div" in el &&
        (el as any).class === "code-group",
    ) as Record<string, unknown> | undefined;
    expect(cg, "code-group div not found").toBeDefined();
    const children = cg!.div as unknown[];
    // Children must be strings (raw HTML) — NOT objects with a .div key
    for (const child of children) {
      expect(typeof child).toBe("string");
    }
    const allHtml = children.join("");
    expect(allHtml).toContain('<input type="radio"');
    expect(allHtml).toContain('class="tabs"');
    expect(allHtml).toContain('class="blocks"');
  });
});
