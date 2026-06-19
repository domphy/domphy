// DomphyPress page shell: header (logo + nav + search + theme/menu toggles),
// sidebar, content, right-hand TOC aside, prev/next, footer — built in Domphy.
// Styling lives in theme.css (referenced by class); this file emits structure
// only (no inline typography styles). `navLink` resolves active state during SSR.

import { navLink } from "@domphy/app";
import type { DomphyElement } from "@domphy/core";
import { prevNextForRoute, sidebarForRoute } from "./routes.js";
import type { SidebarItem, SiteConfig, TocEntry } from "./types.js";

export interface LayoutContext {
  route: string;
  title: string;
  /** Rendered markdown body (Domphy elements). */
  body: DomphyElement[];
  toc: TocEntry[];
  frontmatter: Record<string, unknown>;
  config: SiteConfig;
}

/** A header/sidebar link with active-state via navLink. */
function pageLink(
  text: string,
  href: string,
  className?: string,
): DomphyElement {
  return {
    a: text,
    href,
    class: className,
    $: [navLink({ href })],
  } as DomphyElement;
}

function navDropdown(item: { text: string; items: { text: string; link: string }[] }): DomphyElement {
  return {
    div: [
      { span: item.text, class: "dp-nav-dropdown-label" },
      {
        div: item.items.map((child) => pageLink(child.text, child.link)),
        class: "dp-nav-dropdown-menu",
      },
    ],
    class: "dp-nav-dropdown",
  };
}

function header(config: SiteConfig): DomphyElement {
  return {
    header: [
      { a: config.title, href: "/", class: "dp-logo" },
      {
        nav: config.nav.map((item) =>
          item.items ? navDropdown(item as any) : pageLink(item.text, item.link!)
        ),
        class: "dp-nav",
        ariaLabel: "Primary",
      },
      {
        div: [
          // Search island: the bootstrap mounts the Domphy search widget here.
          { div: "", dataIsland: "search", class: "dp-search-slot" },
          {
            button: "◐",
            type: "button",
            class: "dp-theme-toggle",
            ariaLabel: "Toggle dark mode",
            dataThemeToggle: "",
          },
          {
            button: "☰",
            type: "button",
            class: "dp-menu-toggle",
            ariaLabel: "Toggle menu",
            dataMenuToggle: "",
          },
        ],
        class: "dp-header-actions",
      },
    ],
    class: "dp-header",
  };
}

/** Renders one sidebar group (title + links, one level of nesting). */
function sidebarGroup(group: SidebarItem): DomphyElement {
  const children: DomphyElement[] = [];
  if (group.link) {
    children.push(pageLink(group.text, group.link));
  } else {
    children.push({ div: group.text, class: "dp-sidebar-title" });
  }
  if (group.items) {
    for (const item of group.items) {
      if (item.items) {
        children.push({ div: item.text, class: "dp-sidebar-title" });
        for (const leaf of item.items) {
          if (leaf.link) children.push(pageLink(leaf.text, leaf.link));
        }
      } else if (item.link) {
        children.push(pageLink(item.text, item.link));
      }
    }
  }
  return { div: children, class: "dp-sidebar-group" };
}

function sidebar(ctx: LayoutContext): DomphyElement {
  const groups = sidebarForRoute(ctx.route, ctx.config);
  return {
    nav: groups.map(sidebarGroup),
    class: "dp-sidebar",
    ariaLabel: "Documentation",
  };
}

function tocAside(ctx: LayoutContext): DomphyElement | null {
  if (ctx.frontmatter.aside === false) return null;
  const entries = ctx.toc.filter(
    (entry) => entry.level >= 2 && entry.level <= 3,
  );
  if (entries.length === 0) return null;
  return {
    aside: [
      { div: "On this page", class: "dp-aside-title" },
      {
        nav: entries.map((entry) => ({
          a: entry.text,
          href: `#${entry.slug}`,
          class: `dp-toc-${entry.level}`,
        })),
        class: "dp-toc",
      },
    ],
    class: "dp-aside",
  };
}

function prevNext(ctx: LayoutContext): DomphyElement | null {
  const { prev, next } = prevNextForRoute(ctx.route, ctx.config);
  if (!prev && !next) return null;
  const links: DomphyElement[] = [];
  links.push(
    prev
      ? {
          a: [{ small: "Previous" }, { span: prev.text }],
          href: prev.link,
          class: "prev",
        }
      : { span: "" },
  );
  links.push(
    next
      ? {
          a: [{ small: "Next" }, { span: next.text }],
          href: next.link,
          class: "next",
        }
      : { span: "" },
  );
  return { nav: links, class: "dp-prevnext", ariaLabel: "Page navigation" };
}

/** Builds the full page element for a content (non-home) route. */
export function pageShell(ctx: LayoutContext): DomphyElement {
  const main: DomphyElement[] = [{ div: ctx.body, class: "dp-content" }];
  const pn = prevNext(ctx);
  if (pn) main.push(pn);

  const shellChildren: DomphyElement[] = [
    sidebar(ctx),
    { main, class: "dp-main" },
  ];
  const aside = tocAside(ctx);
  if (aside) shellChildren.push(aside);

  return {
    div: [
      header(ctx.config),
      { div: shellChildren, class: "dp-shell" },
      { footer: ctx.config.footerMessage, class: "dp-footer" },
    ],
  };
}

interface HeroAction {
  theme?: string;
  text: string;
  link: string;
}
interface HeroConfig {
  name?: string;
  text?: string;
  tagline?: string;
  actions?: HeroAction[];
}
interface FeatureConfig {
  title: string;
  details: string;
}

/** Renders the VitePress-style `hero` frontmatter block. */
function heroSection(hero: HeroConfig): DomphyElement {
  const children: DomphyElement[] = [];
  if (hero.name) children.push({ div: hero.name, class: "dp-hero-name" });
  if (hero.text) children.push({ h1: hero.text, class: "dp-hero-text" });
  if (hero.tagline)
    children.push({ p: hero.tagline, class: "dp-hero-tagline" });
  if (hero.actions && hero.actions.length > 0) {
    children.push({
      div: hero.actions.map((action) => ({
        a: action.text,
        href: action.link,
        class: `dp-hero-action ${action.theme ?? "brand"}`,
      })),
      class: "dp-hero-actions",
    });
  }
  return { section: children, class: "dp-hero" };
}

/** Renders the VitePress-style `features` frontmatter grid. */
function featuresSection(features: FeatureConfig[]): DomphyElement {
  return {
    div: features.map((feature) => ({
      div: [
        { div: feature.title, class: "dp-feature-title" },
        { p: feature.details, class: "dp-feature-details" },
      ],
      class: "dp-feature",
    })),
    class: "dp-features",
  };
}

/** Full page element for the home route: hero + features (frontmatter) + body. */
export function homeShell(ctx: LayoutContext): DomphyElement {
  const main: DomphyElement[] = [];
  const hero = ctx.frontmatter.hero as HeroConfig | undefined;
  const features = ctx.frontmatter.features as FeatureConfig[] | undefined;
  if (hero) main.push(heroSection(hero));
  if (features && features.length > 0) main.push(featuresSection(features));
  main.push({ div: ctx.body, class: "dp-content dp-home" });

  return {
    div: [
      header(ctx.config),
      { main, class: "dp-main dp-main-home" },
      { footer: ctx.config.footerMessage, class: "dp-footer" },
    ],
  };
}
