import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { DomphyElement } from "@domphy/core";
import { beforeAll, describe, expect, it } from "vitest";
import { createHighlighter } from "./highlight.js";
import { renderDoc } from "./pipeline.js";
import type { RenderDocOptions } from "./types.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const docsDir = resolve(repoRoot, "apps/web/docs");

// A loose view of a Domphy element object for traversal in tests. Element objects
// store the tag as the first key whose value is the content; every other key is
// an attribute (`class`, `id`, `dataIsland`, ...).
type AnyElement = Record<string, unknown>;

const KNOWN_TAGS = new Set([
  "div",
  "p",
  "span",
  "pre",
  "code",
  "details",
  "summary",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
  "strong",
  "em",
  "s",
  "br",
  "hr",
  "blockquote",
  "input",
  "label",
  "button",
  "section",
  "header",
]);

/** Returns the tag name (first known-tag key) of an element object, or null. */
function tagOf(element: AnyElement): string | null {
  for (const key of Object.keys(element)) {
    if (KNOWN_TAGS.has(key)) return key;
  }
  return null;
}

/** Returns the content value of an element (the value under its tag key). */
function contentOf(element: AnyElement): unknown {
  const tag = tagOf(element);
  return tag ? element[tag] : undefined;
}

function isElement(value: unknown): value is AnyElement {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Depth-first walk over every element object in a Domphy tree. */
function* walk(nodes: DomphyElement[] | unknown): Generator<AnyElement> {
  const list = Array.isArray(nodes) ? nodes : [nodes];
  for (const node of list) {
    if (!isElement(node)) continue;
    yield node as AnyElement;
    const content = contentOf(node as AnyElement);
    if (Array.isArray(content)) {
      yield* walk(content);
    } else if (isElement(content)) {
      yield* walk([content]);
    }
  }
}

/** Finds the first element matching a predicate, depth-first. */
function find(
  nodes: DomphyElement[],
  predicate: (element: AnyElement) => boolean,
): AnyElement | undefined {
  for (const element of walk(nodes)) {
    if (predicate(element)) return element;
  }
  return undefined;
}

/** Collects all elements matching a predicate. */
function findAll(
  nodes: DomphyElement[],
  predicate: (element: AnyElement) => boolean,
): AnyElement[] {
  const out: AnyElement[] = [];
  for (const element of walk(nodes)) {
    if (predicate(element)) out.push(element);
  }
  return out;
}

/** Recursively flattens an element subtree to plain text + embedded HTML. */
function textOf(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(textOf).join("");
  if (isElement(value)) return textOf(contentOf(value as AnyElement));
  return "";
}

/**
 * Flattens a subtree and strips any embedded HTML tags + decodes the few HTML
 * entities shiki emits, so assertions can match source text that the highlighter
 * has split across `<span>` tokens.
 */
function codeText(value: unknown): string {
  return textOf(value)
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x26;/g, "&")
    .replace(/&amp;/g, "&");
}

const hasClass = (element: AnyElement, name: string): boolean =>
  typeof element.class === "string" &&
  element.class.split(/\s+/).includes(name);

let options: RenderDocOptions;

beforeAll(async () => {
  const highlight = await createHighlighter();
  options = {
    filePath: "", // set per page
    docsDir,
    repoRoot,
    highlight,
  };
});

function optionsFor(filePath: string): RenderDocOptions {
  return { ...options, filePath };
}

describe("renderDoc — button.md", () => {
  const filePath = resolve(docsDir, "ui/patches/button.md");
  const source = readFileSync(filePath, "utf8");

  it("records an editor island resolving to the Button.ts demo", async () => {
    const doc = await renderDoc(source, optionsFor(filePath));
    const editor = doc.islands.find((island) => island.kind === "editor");
    expect(editor).toBeDefined();
    expect(editor?.source).toContain("demos");
    expect(editor?.source.replace(/\\/g, "/")).toMatch(
      /demos\/patches\/Button\.ts$/,
    );
    // The placeholder div must be present in the body with the island id.
    const placeholder = find(
      doc.body,
      (element) => element.dataIsland === editor?.id,
    );
    expect(placeholder).toBeDefined();
  });

  it("turns ::: details into a <details> element", async () => {
    const doc = await renderDoc(source, optionsFor(filePath));
    const details = findAll(
      doc.body,
      (element) => tagOf(element) === "details",
    );
    expect(details.length).toBeGreaterThanOrEqual(1);
    // It should carry a <summary> child.
    const summary = find(doc.body, (element) => tagOf(element) === "summary");
    expect(summary).toBeDefined();
    expect(textOf(contentOf(summary as AnyElement))).toContain("Customization");
  });

  it("inlines the !!!include!!! snippet content", async () => {
    const doc = await renderDoc(source, optionsFor(filePath));
    const text = textOf(doc.body);
    // A distinctive phrase from snippets/customization.md.
    expect(text).toContain("four levels of customization");
  });

  it("expands <<< into a code block with the real button.ts source", async () => {
    const doc = await renderDoc(source, optionsFor(filePath));
    const buttonSource = readFileSync(
      resolve(repoRoot, "packages/ui/src/patches/button.ts"),
      "utf8",
    );
    // Pull a stable identifier from the real source.
    expect(buttonSource).toContain("function button");
    const codeBlocks = findAll(doc.body, (element) => tagOf(element) === "pre");
    const allCode = codeBlocks
      .map((pre) => codeText(contentOf(pre)))
      .join("\n");
    expect(allCode).toContain("function button");
    expect(allCode).toContain("PartialElement");
  });
});

describe("renderDoc — index.md", () => {
  const filePath = resolve(docsDir, "index.md");
  const source = readFileSync(filePath, "utf8");

  it("records a preview island for Counting (default export)", async () => {
    const doc = await renderDoc(source, optionsFor(filePath));
    const preview = doc.islands.find((island) => island.kind === "preview");
    expect(preview).toBeDefined();
    expect(preview?.exportName).toBe("default");
    expect(preview?.source.replace(/\\/g, "/")).toMatch(
      /demos\/core\/counting\.(js|ts)$/,
    );
    const placeholder = find(
      doc.body,
      (element) => element.dataIsland === preview?.id,
    );
    expect(placeholder).toBeDefined();
  });

  it("renders ::: code-group with NPM/CDN tabs", async () => {
    const doc = await renderDoc(source, optionsFor(filePath));
    const group = find(doc.body, (element) => hasClass(element, "code-group"));
    expect(group).toBeDefined();
    const groupText = codeText(contentOf(group as AnyElement));
    // Tab labels come from the fence `[NPM]` / `[CDN]` markers.
    expect(groupText).toContain("NPM");
    expect(groupText).toContain("CDN");
    // The install commands survive into the code panels.
    expect(groupText).toContain("npm install @domphy/ui");
  });

  it("expands the @/ rooted <<< import (counting.ts source)", async () => {
    const doc = await renderDoc(source, optionsFor(filePath));
    const allCode = findAll(doc.body, (element) => tagOf(element) === "pre")
      .map((pre) => codeText(contentOf(pre)))
      .join("\n");
    expect(allCode).toContain("export default App");
  });
});

describe("renderDoc — headings / toc", () => {
  const filePath = resolve(docsDir, "core/syntax.md");
  const source = readFileSync(filePath, "utf8");

  it("collects a non-empty table of contents", async () => {
    const doc = await renderDoc(source, optionsFor(filePath));
    expect(doc.toc.length).toBeGreaterThan(0);
    expect(doc.toc.some((entry) => entry.text === "Syntax")).toBe(true);
    expect(doc.title).toBe("Syntax");
    // Each toc entry has a slug used as the heading id.
    for (const entry of doc.toc) {
      expect(entry.slug.length).toBeGreaterThan(0);
    }
  });
});

describe("renderDoc — containers & frontmatter & mermaid", () => {
  const baseOptions = (): RenderDocOptions => ({
    filePath: resolve(docsDir, "scratch.md"),
    docsDir,
    repoRoot,
    highlight: options.highlight,
  });

  it("renders tip/warning admonitions with titles", async () => {
    const source = [
      "::: tip",
      "Default tip.",
      ":::",
      "",
      "::: warning Heads Up",
      "Custom warning title.",
      ":::",
    ].join("\n");
    const doc = await renderDoc(source, baseOptions());

    const tip = find(doc.body, (element) => hasClass(element, "tip"));
    expect(tip).toBeDefined();
    expect(hasClass(tip as AnyElement, "custom-block")).toBe(true);
    const tipTitle = find(doc.body, (element) =>
      hasClass(element, "custom-block-title"),
    );
    expect(textOf(contentOf(tipTitle as AnyElement))).toBe("TIP");

    const warning = find(doc.body, (element) => hasClass(element, "warning"));
    expect(warning).toBeDefined();
    expect(textOf(contentOf(warning as AnyElement))).toContain("Heads Up");
  });

  it("exposes parsed frontmatter and resolves the title from it", async () => {
    const source = [
      "---",
      "title: Custom Page",
      "layout: home",
      "---",
      "",
      "# Body H1",
      "",
      "Text.",
    ].join("\n");
    const doc = await renderDoc(source, baseOptions());
    expect(doc.frontmatter.title).toBe("Custom Page");
    expect(doc.frontmatter.layout).toBe("home");
    // Frontmatter title wins over the first H1.
    expect(doc.title).toBe("Custom Page");
  });

  it("runs the optional mermaid pass over the produced body", async () => {
    const source = ["```mermaid", "graph TD; A-->B;", "```"].join("\n");
    let received = false;
    const doc = await renderDoc(source, {
      ...baseOptions(),
      renderMermaid: async (body) => {
        received = true;
        return [...body, { div: "MERMAID_REPLACED" } as DomphyElement];
      },
    });
    expect(received).toBe(true);
    expect(textOf(doc.body)).toContain("MERMAID_REPLACED");
  });

  it("leaves ```mermaid as a code block when no renderer is given", async () => {
    const source = ["```mermaid", "graph TD; A-->B;", "```"].join("\n");
    const doc = await renderDoc(source, baseOptions());
    const pre = find(doc.body, (element) => tagOf(element) === "pre");
    expect(pre).toBeDefined();
    expect(codeText(contentOf(pre as AnyElement))).toContain("graph TD");
  });
});

describe("highlight — shiki", () => {
  it("emits <span> markup for a ts fence", async () => {
    const highlight = await createHighlighter();
    const source = ["```ts", "const value: number = 1", "```"].join("\n");
    const doc = await renderDoc(source, {
      filePath: resolve(docsDir, "scratch.md"),
      docsDir,
      repoRoot,
      highlight,
    });
    const pre = find(doc.body, (element) => tagOf(element) === "pre");
    expect(pre).toBeDefined();
    const code = (contentOf(pre as AnyElement) as AnyElement[])[0];
    const inner = contentOf(code);
    expect(typeof inner).toBe("string");
    expect(inner as string).toContain("<span");
  });

  it("falls back to escaped plain text for unknown languages", async () => {
    const highlight = await createHighlighter();
    const out = highlight("a < b && c > d", "made-up-lang");
    expect(out).toContain("&lt;");
    expect(out).toContain("&amp;&amp;");
    expect(out).not.toContain("<span");
  });
});
