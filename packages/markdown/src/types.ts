import type MarkdownIt from "markdown-it";
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

/**
 * A markdown-it plugin function. Receives the markdown-it instance and
 * configures it (adds rules, enables features, etc.).
 */
export type MarkdownPlugin = (md: MarkdownIt) => void;

/**
 * Options for {@link createMarkdown}. Extends {@link ParseOptions} with
 * factory-level configuration: plugins, math, and task list support.
 */
export interface CreateMarkdownOptions extends ParseOptions {
  /**
   * Additional markdown-it plugins to apply to the internal instance.
   * Each entry is a function that receives the markdown-it instance and
   * installs rules or configuration on it (e.g. `md.use(container, "tip")`).
   *
   * @example
   * ```ts
   * import container from "markdown-it-container"
   * const parser = createMarkdown({
   *   plugins: [(md) => md.use(container, "tip")],
   * })
   * ```
   */
  plugins?: MarkdownPlugin[];
  /**
   * Enable built-in LaTeX math support.
   *
   * When `true`, `$...$` produces inline math elements and `$$...$$` blocks
   * produce display math elements. The raw LaTeX is preserved in the element's
   * content with `class="math math-inline"` / `class="math math-display"` so a
   * CDN-loaded KaTeX auto-render extension or MathJax can process it.
   *
   * @example
   * ```ts
   * const parser = createMarkdown({ math: true })
   * ```
   * Then in the page `<head>`:
   * ```html
   * <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex/dist/katex.min.css">
   * <script defer src="https://cdn.jsdelivr.net/npm/katex/dist/katex.min.js"></script>
   * <script defer
   *   src="https://cdn.jsdelivr.net/npm/katex/dist/contrib/auto-render.min.js"
   *   onload="renderMathInElement(document.body)"></script>
   * ```
   * @default false
   */
  math?: boolean;
  /**
   * Enable GFM-style task list items.
   *
   * When `true`, list items that begin with `[ ]` or `[x]` are rendered as
   * a disabled checkbox followed by the item text:
   *
   * ```markdown
   * - [x] Done
   * - [ ] Todo
   * ```
   *
   * Produces `li > [{ input(checkbox, checked, disabled) }, "Done"]` etc.
   * @default false
   */
  tasklists?: boolean;
}

/**
 * A reusable markdown parser returned by {@link createMarkdown}.
 * Holds a pre-configured markdown-it instance; safe to call repeatedly.
 */
export interface MarkdownInstance {
  /**
   * Parse a markdown string. Returns frontmatter, body element array, and
   * collected table of contents — same shape as {@link ParseResult}.
   */
  parse(markdown: string): ParseResult;
  /**
   * Convenience method: parse and return only the body element array.
   * Equivalent to `.parse(markdown).body`.
   */
  toDomphy(markdown: string): DomphyElement[];
}
