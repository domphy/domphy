import type { DomphyElement } from "@domphy/core";
import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import { splitFrontmatter } from "./frontmatter.js";
import { createUniqueSlugger, defaultSlugify } from "./slug.js";
import type {
  AnchorSlugify,
  Highlight,
  ParseOptions,
  ParseResult,
  TocEntry,
} from "./types.js";
import { walkTokens } from "./walker.js";

export type { FrontmatterSplit } from "./frontmatter.js";
export { splitFrontmatter } from "./frontmatter.js";
export { createUniqueSlugger, defaultSlugify } from "./slug.js";
export type {
  AnchorSlugify,
  Highlight,
  ParseOptions,
  ParseResult,
  TocEntry,
} from "./types.js";
// Lower-level building blocks so an integrator (for example a documentation
// site generator) can run its OWN markdown-it instance — configured with extra
// plugins such as containers, includes, or custom inline rules — and still reuse
// the single canonical token-to-Domphy walker instead of reimplementing it.
export { walkTokens } from "./walker.js";

/**
 * A parsed markdown-it token. Derived from the parser's own `parse` return type
 * so it serializes cleanly in the generated declarations — the
 * `import("markdown-it").Token` namespace-member form does not survive the d.ts
 * rollup when it appears in a public signature.
 */
export type MarkdownItToken = ReturnType<
  InstanceType<typeof MarkdownIt>["parse"]
>[number];

/** Options for {@link tokensToDomphy}. */
export interface TokensToDomphyOptions {
  /** Optional highlighter for fenced code blocks. */
  highlight?: Highlight;
  /** Custom slug function for heading anchors and the table of contents. */
  anchorSlugify?: AnchorSlugify;
}

/**
 * Converts a pre-parsed markdown-it token stream into a Domphy element tree,
 * collecting a table of contents along the way. Use this when you supply your
 * own markdown-it instance (with custom plugins) and only need the canonical
 * token-to-Domphy conversion. The returned `body`/`toc` match `parseMarkdown`.
 */
export function tokensToDomphy(
  tokens: MarkdownItToken[],
  options: TokensToDomphyOptions = {},
): { body: DomphyElement[]; toc: TocEntry[] } {
  const slugify = options.anchorSlugify ?? defaultSlugify;
  const slug = createUniqueSlugger(slugify);
  const toc: TocEntry[] = [];
  const body = walkTokens(tokens, { highlight: options.highlight, slug, toc });
  return { body, toc };
}

/** Creates a markdown-it instance configured for GFM-ish output and anchors. */
function createParser(
  options: ParseOptions,
  slugify: (text: string) => string,
): MarkdownIt {
  const md = new MarkdownIt({
    html: true, // pass raw HTML through so html_block / html_inline survive
    linkify: true, // autolink bare URLs (GFM-ish)
    typographer: false,
    ...options.mdOptions,
  });

  // Enable GFM-style strikethrough (~~text~~) and tables, which markdown-it
  // ships with but are governed by these rule names.
  md.enable(["strikethrough", "table"]);

  // markdown-it-anchor stamps ids on heading tokens during parsing. The walker
  // re-derives the authoritative slug (and the table of contents) from the same
  // base slugify function, so the anchor plugin and the walker agree on slugs.
  // The plugin is given its own unique-slugger instance so its internal
  // de-duplication counter does not interfere with the walker's.
  md.use(anchor, { slugify: createUniqueSlugger(slugify) });

  return md;
}

/**
 * Parses a markdown string into a Domphy element tree, returning the parsed
 * frontmatter, the document body, and a collected table of contents.
 */
export function parseMarkdown(
  markdown: string,
  options: ParseOptions = {},
): ParseResult {
  const { frontmatter, content } = splitFrontmatter(markdown);

  const slugify = options.anchorSlugify ?? defaultSlugify;
  // The walker owns the authoritative slugger so anchors and toc stay aligned.
  const slug = createUniqueSlugger(slugify);
  const md = createParser(options, slugify);

  const tokens = md.parse(content, {});
  const toc: TocEntry[] = [];
  const body = walkTokens(tokens, {
    highlight: options.highlight,
    slug,
    toc,
  });

  return { frontmatter, body, toc };
}

/** Convenience wrapper that returns only the document body element array. */
export function markdownToDomphy(
  markdown: string,
  options: ParseOptions = {},
): DomphyElement[] {
  return parseMarkdown(markdown, options).body;
}
