import type { DomphyElement } from "@domphy/core";
import type { Root } from "mdast";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import { splitFrontmatter } from "./frontmatter.js";
import { walkMdast } from "./mdast.js";
import { createUniqueSlugger, defaultSlugify } from "./slug.js";
import type {
  AnchorSlugify,
  CreateMarkdownOptions,
  Highlight,
  MarkdownInstance,
  ParseOptions,
  ParseResult,
  RemarkPlugin,
  TocEntry,
} from "./types.js";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let proc = remark().use(remarkGfm as any);
  for (const plugin of options.plugins ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
 * import { createMarkdown } from "@domphy/markdown"
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
  let opts = { ...options };

  if (options.math) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const remarkMath = require("remark-math");
      const mathPlugin = (remarkMath.default ?? remarkMath) as RemarkPlugin;
      opts = { ...opts, plugins: [mathPlugin, ...(opts.plugins ?? [])] };
    } catch {
      throw new Error(
        "[@domphy/markdown] math:true requires remark-math. Run: pnpm add remark-math",
      );
    }
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
