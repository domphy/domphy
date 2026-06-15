import type { DomphyElement } from "@domphy/core";

/** Options accepted by the underlying markdown-it constructor. */
type MarkdownItOptions = import("markdown-it").Options;

/**
 * A highlighter for fenced code blocks. Receives the raw code and the language
 * (empty string when no language is given on the fence). It may return either:
 *  - a string: treated as the inner HTML of the `<code>` element (so a
 *    highlighter that emits `<span class="...">` tokens works directly), or
 *  - a DomphyElement: used as the single child of the `<code>` element.
 * Returning a falsy value falls back to plain escaped text.
 */
export type Highlight = (
  code: string,
  language: string,
) => string | DomphyElement | null | undefined;

/** Turns heading text into a URL-safe slug used for the heading `id`. */
export type AnchorSlugify = (text: string) => string;

export interface ParseOptions {
  /** Optional highlighter for fenced code blocks. */
  highlight?: Highlight;
  /** Custom slug function for heading anchors and the table of contents. */
  anchorSlugify?: AnchorSlugify;
  /** Options forwarded to the underlying markdown-it instance. */
  mdOptions?: MarkdownItOptions;
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
