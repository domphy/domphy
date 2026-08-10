import type { DomphyElement } from "@domphy/core";
import type { Nodes } from "mdast";
import type { Plugin } from "unified";

/**
 * A highlighter for fenced code blocks. Receives the raw code and the info
 * string (language + optional metadata, e.g. `"ts :line-numbers {3-5} [title]"`).
 * The language is the first whitespace-delimited token of `info`. Returns either:
 *  - a string: treated as the inner HTML of the `<code>` element
 *  - a DomphyElement: used directly as the block (lets the highlighter add a
 *    title bar, copy button, etc. around `<code>`)
 * Returning null/undefined falls back to escaped plain text.
 */
export type Highlight = (
  code: string,
  info: string,
) => string | DomphyElement | null | undefined;

/** Turns heading text into a URL-safe slug used for the heading `id`. */
export type AnchorSlugify = (text: string) => string;

/** A remark/unified plugin. */
export type RemarkPlugin = Plugin;

export interface ParseOptions {
  /** Optional highlighter for fenced code blocks. */
  highlight?: Highlight;
  /** Custom slug function for heading anchors and the table of contents. */
  anchorSlugify?: AnchorSlugify;
  /** Additional remark plugins to apply to the internal processor. */
  plugins?: RemarkPlugin[];
  /** Handle MDAST nodes the core walker doesn't recognise (e.g. directives).
   *  The second arg provides a `walkChildren` helper to recursively convert
   *  a parent node's children into Domphy children. */
  onCustom?: (
    node: Nodes,
    helper: import("./mdast.js").WalkHelper,
  ) => DomphyElement | string | null;
}

/** One entry in the document table of contents. */
export interface TocEntry {
  /** Heading level, 1 through 6. */
  level: number;
  /** Plain-text heading content (markup stripped). */
  text: string;
  /** Slug used as the heading `id` and anchor target. */
  slug: string;
}

export interface ParseResult {
  /** Parsed YAML frontmatter, or an empty object when none is present. */
  frontmatter: Record<string, unknown>;
  /** The document body as an array of Domphy elements. */
  body: DomphyElement[];
  /** Flat list of headings collected while walking the document. */
  toc: TocEntry[];
}

/**
 * Options for {@link createMarkdown}. Extends {@link ParseOptions} with
 * factory-level configuration.
 */
export interface CreateMarkdownOptions extends ParseOptions {
  /**
   * Enable LaTeX math support. Requires `remark-math` to be installed
   * (`pnpm add remark-math`). Raw LaTeX is preserved so a CDN-loaded KaTeX
   * auto-render extension or MathJax can process it client-side.
   * @default false
   */
  math?: boolean;
}

/**
 * A reusable markdown parser returned by {@link createMarkdown}.
 * Holds a pre-configured remark processor; safe to call repeatedly.
 */
export interface MarkdownInstance {
  parse(markdown: string): ParseResult;
  toDomphy(markdown: string): DomphyElement[];
}
