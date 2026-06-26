// Shared contracts between press modules. Single source of truth for the data
// shapes each module produces and consumes.

import type { DomphyElement } from "@domphy/core"
import type { TocEntry } from "@domphy/markdown"

export type { TocEntry }

// --- Site config -------------------------------------------------------------

export interface NavItem {
  text: string
  link?: string
  items?: { text: string; link: string }[]
}

export interface SidebarItem {
  text: string
  link?: string
  items?: SidebarItem[]
}

export interface ThemeConfig {
  nav: NavItem[]
  /** Keys are route prefixes (e.g. "/guide/"). Longest match wins per VitePress. */
  sidebar: Record<string, SidebarItem[]>
  /** Site logo: path to image or inline SVG string. */
  logo?: string
  /** Local search options. Enabled by default. */
  search?: false | { placeholder?: string; limit?: number }
  /** Footer text. */
  footerMessage?: string
}

export interface LocaleConfig {
  label: string
  lang: string
  title?: string
  description?: string
  themeConfig?: Partial<ThemeConfig>
}

export interface SiteConfig {
  title: string
  description: string
  /** Deploy base path. Default "/". */
  base: string
  /** Canonical hostname for sitemap/og meta. */
  hostname: string
  /** Directory containing markdown pages. Relative to config file. Default ".". */
  srcDir: string
  /** Output directory. Default "dist". */
  outDir: string
  /** Raw <head> strings injected verbatim into every page. */
  head: string[]
  themeConfig: ThemeConfig
  /** VitePress-style i18n: root locale + additional locales by URL prefix. */
  locales?: Record<string, LocaleConfig>
}

// --- Pipeline: markdown -> Domphy elements ----------------------------------

export interface IslandRef {
  id: string
  kind: "search"
}

export interface RenderedDoc {
  frontmatter: Record<string, unknown>
  body: DomphyElement[]
  toc: TocEntry[]
  islands: IslandRef[]
  title: string
}

export interface RenderDocOptions {
  filePath: string
  docsDir: string
  repoRoot: string
  highlight: (code: string, language: string) => string
}

// --- Search ------------------------------------------------------------------

export interface SearchDocument {
  route: string
  title: string
  text: string
  toc: TocEntry[]
}

// --- Build -------------------------------------------------------------------

export interface PageEntry {
  route: string
  outFile: string
  filePath: string
}
