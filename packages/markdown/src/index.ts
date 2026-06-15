import type { DomphyElement } from "@domphy/core";
import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import { splitFrontmatter } from "./frontmatter.js";
import { createUniqueSlugger, defaultSlugify } from "./slug.js";
import type { ParseOptions, ParseResult, TocEntry } from "./types.js";
import { walkTokens } from "./walker.js";

export type {
  AnchorSlugify,
  Highlight,
  ParseOptions,
  ParseResult,
  TocEntry,
} from "./types.js";

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
