// Page shell: header, sidebar, content, TOC aside, prev/next, footer.
// Takes SiteConfig as parameter — no hardcoded site data.

import { navLink } from "@domphy/app"
import type { DomphyElement } from "@domphy/core"
import { toolbar, toolbarSpacer } from "@domphy/ui"
import { prevNextForRoute, sidebarForRoute } from "./routes.js"
import type { SidebarItem, SiteConfig, TocEntry } from "./types.js"

export interface LayoutContext {
  route: string
  title: string
  body: DomphyElement[]
  toc: TocEntry[]
  frontmatter: Record<string, unknown>
  config: SiteConfig
}

function pageLink(text: string, href: string, className?: string): DomphyElement {
  return { a: text, href, class: className, $: [navLink({ href })] } as DomphyElement
}

function navDropdown(item: { text: string; items: { text: string; link: string }[] }): DomphyElement {
  return {
    div: [
      { span: item.text, class: "dp-nav-dropdown-label" },
      { div: item.items.map(child => pageLink(child.text, child.link)), class: "dp-nav-dropdown-menu" },
    ],
    class: "dp-nav-dropdown",
  }
}

function header(config: SiteConfig): DomphyElement {
  const searchEnabled = config.themeConfig.search !== false
  const logoEl: DomphyElement = config.themeConfig.logo
    ? { a: [{ img: null, src: config.themeConfig.logo, alt: config.title, class: "dp-logo-img" }], href: config.base, class: "dp-logo" } as DomphyElement
    : { a: config.title, href: config.base, class: "dp-logo" } as DomphyElement

  return {
    header: [
      logoEl,
      toolbarSpacer(),
      {
        nav: config.themeConfig.nav.map(item =>
          item.items ? navDropdown(item as { text: string; items: { text: string; link: string }[] }) : pageLink(item.text, item.link!),
        ),
        $: [toolbar({ gap: 4 })],
        class: "dp-nav",
        ariaLabel: "Primary",
      },
      {
        div: [
          ...(searchEnabled ? [{
            div: [{
              input: null, type: "search",
              placeholder: (typeof config.themeConfig.search === "object" && config.themeConfig.search.placeholder) || "Search...",
              class: "dp-search-static", ariaLabel: "Search documentation",
            }],
            dataIsland: "search",
            class: "dp-search-slot",
          } as DomphyElement] : []),
          { button: "◐", type: "button", class: "dp-theme-toggle", ariaLabel: "Toggle dark mode", dataThemeToggle: "" },
          { button: "☰", type: "button", class: "dp-menu-toggle", ariaLabel: "Toggle menu", dataMenuToggle: "" },
        ],
        $: [toolbar({ gap: 2 })],
        class: "dp-header-actions",
      },
    ],
    $: [toolbar({ gap: 4 })],
    style: {
      position: "sticky", top: 0, zIndex: 30,
      height: "var(--dp-header-h)", padding: "0 24px",
      background: "color-mix(in srgb, var(--dp-bg) 86%, transparent)",
      backdropFilter: "blur(8px)",
      borderBottom: "1px solid var(--dp-border)",
    },
    class: "dp-header",
  }
}

function sidebarGroup(group: SidebarItem): DomphyElement {
  const children: DomphyElement[] = []
  if (group.link) {
    children.push(pageLink(group.text, group.link))
  } else {
    children.push({ div: group.text, class: "dp-sidebar-title" })
  }
  if (group.items) {
    for (const item of group.items) {
      if (item.items) {
        children.push({ div: item.text, class: "dp-sidebar-title" })
        for (const leaf of item.items) {
          if (leaf.link) children.push(pageLink(leaf.text, leaf.link))
        }
      } else if (item.link) {
        children.push(pageLink(item.text, item.link))
      }
    }
  }
  return { div: children, class: "dp-sidebar-group" }
}

function sidebar(ctx: LayoutContext): DomphyElement {
  const groups = sidebarForRoute(ctx.route, ctx.config)
  return { nav: groups.map(sidebarGroup), class: "dp-sidebar", ariaLabel: "Documentation" }
}

function tocAside(ctx: LayoutContext): DomphyElement | null {
  if (ctx.frontmatter.aside === false) return null
  const entries = ctx.toc.filter(e => e.level >= 2 && e.level <= 3)
  if (entries.length === 0) return null
  return {
    aside: [
      { div: "On this page", class: "dp-aside-title" },
      { nav: entries.map(e => ({ a: e.text, href: `#${e.slug}`, class: `dp-toc-${e.level}` })), class: "dp-toc" },
    ],
    class: "dp-aside",
  }
}

function prevNext(ctx: LayoutContext): DomphyElement | null {
  const { prev, next } = prevNextForRoute(ctx.route, ctx.config)
  if (!prev && !next) return null
  return {
    nav: [
      prev ? { a: [{ small: "Previous" }, { span: prev.text }], href: prev.link, class: "prev" } : { span: "" },
      next ? { a: [{ small: "Next" }, { span: next.text }], href: next.link, class: "next" } : { span: "" },
    ],
    class: "dp-prevnext", ariaLabel: "Page navigation",
  }
}

export function pageShell(ctx: LayoutContext): DomphyElement {
  const main: DomphyElement[] = [{ div: ctx.body, class: "dp-content" }]
  const pn = prevNext(ctx)
  if (pn) main.push(pn)
  const shellChildren: DomphyElement[] = [sidebar(ctx), { main, class: "dp-main" }]
  const aside = tocAside(ctx)
  if (aside) shellChildren.push(aside)
  return {
    div: [
      header(ctx.config),
      { div: shellChildren, class: "dp-shell" },
      { footer: ctx.config.themeConfig.footerMessage ?? "", class: "dp-footer" },
    ],
  }
}

interface HeroConfig {
  name?: string
  text?: string
  tagline?: string
  actions?: Array<{ theme?: string; text: string; link: string }>
}

interface FeatureConfig {
  title: string
  details: string
}

function heroSection(hero: HeroConfig): DomphyElement {
  const children: DomphyElement[] = []
  if (hero.name) children.push({ div: hero.name, class: "dp-hero-name" })
  if (hero.text) children.push({ h1: hero.text, class: "dp-hero-text" })
  if (hero.tagline) children.push({ p: hero.tagline, class: "dp-hero-tagline" })
  if (hero.actions?.length) {
    children.push({ div: hero.actions.map(a => ({ a: a.text, href: a.link, class: `dp-hero-action ${a.theme ?? "brand"}` })), class: "dp-hero-actions" })
  }
  return { section: children, class: "dp-hero" }
}

function featuresSection(features: FeatureConfig[]): DomphyElement {
  return {
    div: features.map(f => ({
      div: [{ div: f.title, class: "dp-feature-title" }, { p: f.details, class: "dp-feature-details" }],
      class: "dp-feature",
    })),
    class: "dp-features",
  }
}

export function homeShell(ctx: LayoutContext): DomphyElement {
  const main: DomphyElement[] = []
  const hero = ctx.frontmatter.hero as HeroConfig | undefined
  const features = ctx.frontmatter.features as FeatureConfig[] | undefined
  if (hero) main.push(heroSection(hero))
  if (features?.length) main.push(featuresSection(features))
  main.push({ div: ctx.body, class: "dp-content dp-home" })
  return {
    div: [
      header(ctx.config),
      { main, class: "dp-main dp-main-home" },
      { footer: ctx.config.themeConfig.footerMessage ?? "", class: "dp-footer" },
    ],
  }
}
