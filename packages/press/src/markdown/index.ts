import type { DomphyElement } from "@domphy/core";
import type { Root } from "mdast";
import { remark } from "remark";
import remarkGemoji from "remark-gemoji";
import remarkGfm from "remark-gfm";
import { splitFrontmatter } from "./frontmatter.js";
import { remarkMarkSubSup } from "./mark-sub-sup.js";
import { walkMdast } from "./mdast.js";
import { createUniqueSlugger, defaultSlugify } from "./slug.js";
import type {
  CreateMarkdownOptions,
  MarkdownInstance,
  ParseOptions,
  ParseResult,
  TocEntry,
} from "./types.js";

export { transformOutsideCodeBlocks } from "./code-blocks.js";
export type { FrontmatterSplit } from "./frontmatter.js";
export { splitFrontmatter } from "./frontmatter.js";
export type { MdastWalkOptions, WalkHelper } from "./mdast.js";
export { walkMdast } from "./mdast.js";
export { createUniqueSlugger, defaultSlugify } from "./slug.js";
export type {
  AnchorSlugify,
  CreateMarkdownOptions,
  Highlight,
  MarkdownInstance,
  ParseOptions,
  ParseResult,
  RemarkPlugin,
  TocEntry,
} from "./types.js";

function buildProcessor(options: ParseOptions) {
  // remark-gfm is ESM-only. In the CJS build Node's require(esm) returns the
  // module namespace and esbuild's __toESM wraps it again, so the default
  // import lands on `.default` of the namespace — take it when present.
  // (Without this the published CJS build throws unified's "empty preset"
  // error on every parse — verified against pristine HEAD.)
  const gfm = ((remarkGfm as { default?: unknown }).default ??
    remarkGfm) as typeof remarkGfm;
  const gemoji = ((remarkGemoji as { default?: unknown }).default ??
    remarkGemoji) as typeof remarkGemoji;
  // singleTilde: false — GFM strikethrough is `~~…~~` only, so markdown-it-sub
  // `H~2~O` is left for remarkMarkSubSup (VitePress). GitHub's single-tilde
  // strike would otherwise steal every subscript.
  let proc = remark()
    .use(gfm as any, { singleTilde: false })
    .use(gemoji as any)
    .use(remarkMarkSubSup);
  for (const plugin of options.plugins ?? []) {
    proc = proc.use(plugin as any);
  }
  return proc;
}

/**
 * Parses a markdown string into a Domphy element tree, returning frontmatter,
 * body elements, and table of contents.
 */
export function parseMarkdown(
  markdown: string,
  options: ParseOptions = {},
): ParseResult {
  const { frontmatter, content } = splitFrontmatter(markdown);
  const slugify = options.anchorSlugify ?? defaultSlugify;
  const slug = createUniqueSlugger(slugify);
  const toc: TocEntry[] = [];

  const processor = buildProcessor(options);
  const tree = processor.parse(content) as Root;
  processor.runSync(tree, content);

  const body = walkMdast(tree, {
    highlight: options.highlight,
    slug,
    toc,
    onCustom: options.onCustom,
  });
  return { frontmatter, body, toc };
}

/** Parse markdown and return only the body element array. */
export function markdownToDomphy(
  markdown: string,
  options: ParseOptions = {},
): DomphyElement[] {
  return parseMarkdown(markdown, options).body;
}

/**
 * Creates a reusable markdown parser with a pre-configured remark processor.
 * The processor is built once and reused across calls, so plugins are applied
 * once rather than per document.
 *
 * @example
 * ```ts
 * import { createMarkdown } from "@domphy/press"
 * const parser = createMarkdown({ highlight: (code, info) => myHighlighter(code, info) })
 * const { frontmatter, body, toc } = parser.parse(source)
 * ```
 *
 * @example With remark-math
 * ```ts
 * import remarkMath from "remark-math"
 * const parser = createMarkdown({
 *   plugins: [remarkMath],
 *   onCustom: (node) => {
 *     if (node.type === "math") return { div: node.value, class: "math math-display" }
 *     if (node.type === "inlineMath") return { span: node.value, class: "math math-inline" }
 *     return null
 *   },
 * })
 * ```
 */
export function createMarkdown(
  options: CreateMarkdownOptions = {},
): MarkdownInstance {
  const slugify = options.anchorSlugify ?? defaultSlugify;
  const opts = { ...options };

  // Resolving the optional `remark-math` peer needs Node module resolution,
  // which this browser-safe module deliberately has no access to. The Node
  // entry (`@domphy/press`) overrides createMarkdown to handle it.
  if (options.math) {
    throw new Error(
      "[@domphy/press/browser] math:true cannot resolve remark-math in a browser build. " +
        'Import remark-math yourself and pass it via `plugins`, or use the Node entry "@domphy/press".',
    );
  }

  const processor = buildProcessor(opts);

  function parse(markdown: string): ParseResult {
    const { frontmatter, content } = splitFrontmatter(markdown);
    const slug = createUniqueSlugger(slugify);
    const toc: TocEntry[] = [];
    const tree = processor.parse(content) as Root;
    processor.runSync(tree, content);
    const body = walkMdast(tree, {
      highlight: opts.highlight,
      slug,
      toc,
      onCustom: opts.onCustom,
    });
    return { frontmatter, body, toc };
  }

  return {
    parse,
    toDomphy: (markdown) => parse(markdown).body,
  };
}
