import type { DomphyElement } from "@domphy/core";
import type { TocEntry } from "@domphy/markdown";
export type { DomphyElement };

export type { TocEntry };

export interface NavItem {
  text: string;
  link?: string;
  items?: { text: string; link: string }[];
}

export interface SidebarItem {
  text: string;
  link?: string;
  items?: SidebarItem[];
  collapsed?: boolean;
  badge?: { text: string; type?: "tip" | "info" | "warning" | "danger" };
}

export interface SocialLink {
  /** Built-in names: "github" | "twitter" | "discord" | "youtube" | "linkedin" | "mastodon" | "npm" | "bluesky".
   *  Or an absolute URL to a custom SVG/image. */
  icon: string;
  link: string;
  ariaLabel?: string;
}

export interface EditLink {
  /** Pattern with :path placeholder, e.g. "https://github.com/org/repo/edit/main/docs/:path" */
  pattern: string;
  text?: string;
}

/** Override built-in layout slots. Each function receives the full LayoutContext
 *  and must return a DomphyElement (or null to omit the slot entirely). */
export interface LayoutSlots {
  /** Replace the entire header bar. */
  header?: (ctx: unknown) => DomphyElement | null;
  /** Replace the sidebar navigation. */
  sidebar?: (ctx: unknown) => DomphyElement | null;
  /** Replace the TOC aside panel. */
  aside?: (ctx: unknown) => DomphyElement | null;
  /** Replace the prev/next pagination row. */
  prevNext?: (ctx: unknown) => DomphyElement | null;
  /** Replace the doc footer (edit link + last updated). */
  docFooter?: (ctx: unknown) => DomphyElement | null;
  /** Replace the page footer bar. */
  footer?: (ctx: unknown) => DomphyElement | null;
}

export interface ThemeConfig {
  nav: NavItem[];
  /** Keys are route prefixes (e.g. "/guide/"). Longest match wins. */
  sidebar: Record<string, SidebarItem[]>;
  /** Single URL or separate light/dark variants. */
  logo?: string | { light: string; dark: string };
  search?: false | { placeholder?: string; limit?: number };
  footerMessage?: string;
  socialLinks?: SocialLink[];
  editLink?: EditLink;
  /** TOC heading level range. Default [2, 3]. */
  outline?: { level: [number, number] };
  /** TOC section heading text. Default "On this page". */
  tocTitle?: string;
  /** Enable mermaid diagrams. Pass { cdn } to override CDN URL. */
  mermaid?: boolean | { cdn?: string };
  /** Dismissible announcement bar shown above the page. */
  announcementBar?: { id?: string; text: string; dismissible?: boolean };
  /** Override individual layout slots with custom components. */
  slots?: LayoutSlots;
}

export interface LocaleConfig {
  label: string;
  lang: string;
  title?: string;
  description?: string;
  themeConfig?: Partial<ThemeConfig>;
}

export interface SiteConfig {
  title: string;
  description: string;
  base: string;
  hostname: string;
  srcDir: string;
  outDir: string;
  head: string[];
  themeConfig: ThemeConfig;
  locales?: Record<string, LocaleConfig>;
  /** Show last-updated date sourced from git. Default false. */
  lastUpdated?: boolean;
  /** Reserved for future markdown configuration. */
  markdown?: Record<string, never>;
}

export interface IslandRef {
  id: string;
  kind: "search";
}

export interface RenderedDoc {
  frontmatter: Record<string, unknown>;
  body: DomphyElement[];
  toc: TocEntry[];
  islands: IslandRef[];
  title: string;
}

export interface RenderDocOptions {
  filePath: string;
  docsDir: string;
  repoRoot: string;
  highlight: (code: string, lang: string) => string;
}

export interface SearchDocument {
  route: string;
  title: string;
  text: string;
  toc: TocEntry[];
}

export interface PageEntry {
  route: string;
  outFile: string;
  filePath: string;
}
