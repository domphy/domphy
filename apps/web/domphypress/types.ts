// DomphyPress — shared contracts between the engine modules (pipeline, layout,
// islands, search, build). This file is the single source of truth for the data
// shapes each module produces and consumes; modules are built against it so they
// integrate without coupling to each other's internals.

import type { DomphyElement } from "@domphy/core";
import type { TocEntry } from "@domphy/markdown";

export type { TocEntry };

// --- Site configuration (ported from the VitePress config) -------------------

export interface NavItem {
  text: string;
  /** Leaf link. Omit when the item is a dropdown group. */
  link?: string;
  /** Dropdown children. When present, renders as a hover/click dropdown. */
  items?: { text: string; link: string }[];
}

export interface SidebarItem {
  text: string;
  /** Leaf link, or omitted when the item is a section group with `items`. */
  link?: string;
  /** Nested items for a collapsible section group. */
  items?: SidebarItem[];
}

export interface SiteConfig {
  title: string;
  description: string;
  /** Deploy base path, e.g. "/". */
  base: string;
  /** Canonical hostname for sitemap/og, e.g. "https://www.domphy.com". */
  hostname: string;
  /** Top navigation bar. */
  nav: NavItem[];
  /**
   * Sidebar groups keyed by a route prefix (e.g. "/docs/core/"). The longest
   * matching prefix for the current page wins, mirroring VitePress.
   */
  sidebar: Record<string, SidebarItem[]>;
  /** Raw <head> tags to inject verbatim (analytics, icons). */
  head: string[];
  /** Footer message. */
  footerMessage: string;
}

// --- Pipeline: markdown -> Domphy --------------------------------------------

/**
 * An interactive widget extracted from a page during markdown processing. The
 * pipeline replaces the original Vue component tag with a placeholder element
 * (`<div data-island="...">`) in the body and records the island here so the
 * build can generate a client entry that hydrates it.
 *
 *  - kind "preview": mounts `preview/Container(<demo default export>)`.
 *  - kind "editor":  mounts `editor/Container(<demo raw source string>, ...)`.
 */
export interface IslandRef {
  /** Unique id used to match placeholder DOM to its hydration call. */
  id: string;
  kind: "preview" | "editor";
  /**
   * Module specifier to import the demo from, resolved to an absolute path or a
   * path the client bundler (esbuild) can follow from the engine root.
   */
  source: string;
  /**
   * For "preview": the named export to mount (default export when omitted).
   * For "editor": ignored — the raw module text is loaded via `?raw`-equivalent.
   */
  exportName?: string;
}

export interface RenderedDoc {
  /** Parsed YAML frontmatter (may carry `title`, `aside`, `layout: home`, …). */
  frontmatter: Record<string, unknown>;
  /** Document body as Domphy elements (placeholders in place of islands). */
  body: DomphyElement[];
  /** Heading table of contents for the right-hand aside. */
  toc: TocEntry[];
  /** Interactive widgets to hydrate on the client. */
  islands: IslandRef[];
  /** Resolved page title: frontmatter.title ?? first H1 ?? slug. */
  title: string;
}

export interface RenderDocOptions {
  /** Absolute path of the markdown file (for resolving `<<<` / includes). */
  filePath: string;
  /** Docs root directory (for resolving include/`<<<` relative roots). */
  docsDir: string;
  /** Repo root (for resolving `<<<` paths that reach into packages/). */
  repoRoot: string;
  /**
   * Synchronous fenced-code highlighter (shiki, pre-initialized). Returns inner
   * HTML for the `<code>` element. See `@domphy/markdown` `Highlight`.
   */
  highlight: (code: string, language: string) => string;
  /**
   * Async pass that replaces ```mermaid code blocks with rendered SVG. When
   * omitted, mermaid blocks are left as plain code. Provided by `@domphy/mermaid`.
   */
  renderMermaid?: (body: DomphyElement[]) => Promise<DomphyElement[]>;
}

// --- Search ------------------------------------------------------------------

export interface SearchDocument {
  /** Page route, e.g. "/docs/core/syntax". */
  route: string;
  title: string;
  /** Flattened plain text of the page body, for indexing. */
  text: string;
  /** Headings for sectioned results. */
  toc: TocEntry[];
}

// --- Build -------------------------------------------------------------------

/** One page in the site, after route resolution. */
export interface PageEntry {
  /** Clean route, e.g. "/docs/core/syntax" or "/". */
  route: string;
  /** Output file path relative to the out dir, e.g. "docs/core/syntax.html". */
  outFile: string;
  /** Source markdown absolute path. */
  filePath: string;
}
