// Page shell: header, sidebar, content, TOC aside, prev/next, footer.
// Features: social links, edit link, last updated, sidebar collapsible,
// announcement bar, reading time, page badges. Takes SiteConfig as param.

import { navLink } from "@domphy/app"
import type { DomphyElement } from "@domphy/core"
import { toolbar, toolbarSpacer } from "@domphy/ui"
import { prevNextForRoute, sidebarForRoute } from "./routes.js"
import type { SidebarItem, SiteConfig, SocialLink, TocEntry } from "./types.js"

export interface LayoutContext {
  route: string
  title: string
  body: DomphyElement[]
  toc: TocEntry[]
  frontmatter: Record<string, unknown>
  config: SiteConfig
  /** ISO date string from git log, if lastUpdated:true and git available. */
  lastUpdated?: string
  /** Estimated reading time in minutes. */
  readingTime?: number
  /** Relative path from srcDir (e.g. "guide/index.md"), used for editLink. */
  filePath?: string
}

// --- Social icons -------------------------------------------------------

const SOCIAL_LABELS: Record<string, string> = {
  github: "GitHub", twitter: "Twitter", discord: "Discord",
  youtube: "YouTube", linkedin: "LinkedIn", mastodon: "Mastodon",
  npm: "npm", bluesky: "Bluesky",
}

function socialLinkEl(social: SocialLink): DomphyElement {
  const name = social.icon.toLowerCase()
  const isUrl = social.icon.startsWith("http") || social.icon.startsWith("/")
  const innerEl: DomphyElement = isUrl
    ? { img: null, src: social.icon, alt: social.ariaLabel ?? name, width: "18", height: "18" } as DomphyElement
    : { span: "", class: `dp-social-icon dp-icon-${name}`, ariaHidden: "true" } as DomphyElement
  return {
    a: [innerEl],
    href: social.link,
    class: `dp-social-link dp-social-${name}`,
    ariaLabel: social.ariaLabel ?? SOCIAL_LABELS[name] ?? social.icon,
    target: "_blank",
    rel: "noopener noreferrer",
  } as DomphyElement
}

// --- Page link helper -------------------------------------------------------

function pageLink(text: string, href: string, className?: string): DomphyElement {
  return { a: text, href, class: className, $: [navLink({ href })] } as DomphyElement
}

// --- Nav dropdown ----------------------------------------------------------

function navDropdown(item: { text: string; items: { text: string; link: string }[] }): DomphyElement {
  return {
    div: [
      { span: item.text, class: "dp-nav-dropdown-label" },
      { div: item.items.map(child => pageLink(child.text, child.link)), class: "dp-nav-dropdown-menu" },
    ],
    class: "dp-nav-dropdown",
  }
}

// --- Announcement bar -------------------------------------------------------

function announcementBar(config: SiteConfig): DomphyElement | null {
  const bar = config.themeConfig.announcementBar
  if (!bar) return null
  const idAttr = bar.id ? bar.id : ""
  const children: DomphyElement[] = [
    { span: bar.text, class: "dp-announcement-text" } as DomphyElement,
  ]
  if (bar.dismissible !== false) {
    children.push({ button: "✕", type: "button", class: "dp-announcement-close", dataDismissAnnouncement: "", ariaLabel: "Dismiss" } as DomphyElement)
  }
  return {
    div: children,
    class: "dp-announcement",
    ...(idAttr ? { dataId: idAttr } : {}),
  } as DomphyElement
}

// --- Header -----------------------------------------------------------------

function header(config: SiteConfig): DomphyElement {
  const searchEnabled = config.themeConfig.search !== false
  const logoEl: DomphyElement = config.themeConfig.logo
    ? { a: [{ img: null, src: config.themeConfig.logo, alt: config.title, class: "dp-logo-img" }], href: config.base, class: "dp-logo" } as DomphyElement
    : { a: config.title, href: config.base, class: "dp-logo" } as DomphyElement

  const socialEls: DomphyElement[] = (config.themeConfig.socialLinks ?? []).map(socialLinkEl)

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
          ...socialEls,
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

// --- Sidebar ----------------------------------------------------------------

function sidebarBadge(badge: NonNullable<SidebarItem["badge"]>): DomphyElement {
  return { span: badge.text, class: `dp-badge dp-badge-${badge.type ?? "tip"}` } as DomphyElement
}

function pageLinkWithBadge(text: string, href: string, badge?: SidebarItem["badge"]): DomphyElement {
  if (!badge) return pageLink(text, href)
  return {
    a: [{ span: text }, sidebarBadge(badge)],
    href, $: [navLink({ href })],
    class: "dp-sidebar-link-with-badge",
  } as DomphyElement
}

function sidebarGroup(group: SidebarItem): DomphyElement {
  const children: DomphyElement[] = []
  const isCollapsible = group.items && group.items.length > 0

  if (group.link) {
    children.push(pageLinkWithBadge(group.text, group.link, group.badge))
  } else {
    const titleChildren: DomphyElement[] = [
      { span: group.text } as DomphyElement,
    ]
    if (group.badge) titleChildren.push(sidebarBadge(group.badge))
    if (isCollapsible) {
      titleChildren.push({
        button: group.collapsed ? "›" : "‹",
        type: "button",
        class: "dp-sidebar-toggle",
        ariaLabel: group.collapsed ? "Expand" : "Collapse",
        dataSidebarToggle: "",
      } as DomphyElement)
    }
    children.push({ div: titleChildren, class: "dp-sidebar-title" } as DomphyElement)
  }

  if (group.items) {
    const itemsEl: DomphyElement[] = []
    for (const item of group.items) {
      if (item.items) {
        itemsEl.push({ div: item.text, class: "dp-sidebar-subtitle" } as DomphyElement)
        for (const leaf of item.items) {
          if (leaf.link) itemsEl.push(pageLinkWithBadge(leaf.text, leaf.link, leaf.badge))
        }
      } else if (item.link) {
        itemsEl.push(pageLinkWithBadge(item.text, item.link, item.badge))
      }
    }
    children.push({ div: itemsEl, class: "dp-sidebar-items" } as DomphyElement)
  }

  const groupClass = ["dp-sidebar-group", isCollapsible && group.collapsed ? "collapsed" : ""].filter(Boolean).join(" ")
  return { div: children, class: groupClass } as DomphyElement
}

function sidebar(ctx: LayoutContext): DomphyElement {
  const groups = sidebarForRoute(ctx.route, ctx.config)
  return { nav: groups.map(sidebarGroup), class: "dp-sidebar", ariaLabel: "Documentation" }
}

// --- TOC aside --------------------------------------------------------------

function tocAside(ctx: LayoutContext): DomphyElement | null {
  if (ctx.frontmatter.aside === false) return null
  const [minLevel, maxLevel] = ctx.config.themeConfig.outline?.level ?? [2, 3]
  const entries = ctx.toc.filter(e => e.level >= minLevel && e.level <= maxLevel)
  if (entries.length === 0) return null
  return {
    aside: [
      { div: "On this page", class: "dp-aside-title" },
      { nav: entries.map(e => ({ a: e.text, href: `#${e.slug}`, class: `dp-toc-${e.level}` })), class: "dp-toc" },
    ],
    class: "dp-aside",
  }
}

// --- Prev/next ---------------------------------------------------------------

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

// --- Edit link + last updated -----------------------------------------------

function docFooter(ctx: LayoutContext): DomphyElement | null {
  const { editLink } = ctx.config.themeConfig
  const showLastUpdated = ctx.config.lastUpdated
  const hasEdit = editLink && ctx.filePath
  const hasDate = showLastUpdated && ctx.lastUpdated
  if (!hasEdit && !hasDate && !ctx.readingTime) return null

  const children: DomphyElement[] = []

  if (hasDate) {
    const date = new Date(ctx.lastUpdated!)
    const formatted = date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    children.push({ span: [`Last updated: `, { time: formatted, dateTime: ctx.lastUpdated, class: "dp-last-updated-date" }], class: "dp-last-updated" } as DomphyElement)
  }
  if (ctx.readingTime) {
    children.push({ span: `${ctx.readingTime} min read`, class: "dp-reading-time" } as DomphyElement)
  }
  if (hasEdit) {
    const pattern = editLink!.pattern
    const href = pattern.replace(/:path/g, ctx.filePath!)
    children.push({ a: editLink!.text ?? "Edit this page", href, class: "dp-edit-link", target: "_blank", rel: "noopener noreferrer" } as DomphyElement)
  }
  return { div: children, class: "dp-doc-footer" }
}

// --- Page badge (Starlight-style) from frontmatter --------------------------

function pageBadge(frontmatter: Record<string, unknown>): DomphyElement | null {
  const badge = frontmatter.badge as { text?: string; type?: string } | string | undefined
  if (!badge) return null
  const text = typeof badge === "string" ? badge : badge.text ?? ""
  const type = typeof badge === "object" ? badge.type ?? "tip" : "tip"
  if (!text) return null
  return { span: text, class: `dp-badge dp-badge-${type} dp-page-badge` } as DomphyElement
}

// --- Shells -----------------------------------------------------------------

export function pageShell(ctx: LayoutContext): DomphyElement {
  const main: DomphyElement[] = []
  const badge = pageBadge(ctx.frontmatter)
  if (badge) main.push({ div: [badge], class: "dp-page-badge-row" })
  main.push({ div: ctx.body, class: "dp-content" })
  const pn = prevNext(ctx)
  if (pn) main.push(pn)
  const footer = docFooter(ctx)
  if (footer) main.push(footer)
  const shellChildren: DomphyElement[] = [sidebar(ctx), { main, class: "dp-main" }]
  const aside = tocAside(ctx)
  if (aside) shellChildren.push(aside)
  const bar = announcementBar(ctx.config)
  return {
    div: [
      ...(bar ? [bar] : []),
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
  icon?: string
  link?: string
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
    div: features.map(f => {
      const inner: DomphyElement[] = []
      if (f.icon) inner.push({ div: f.icon, class: "dp-feature-icon" })
      inner.push({ div: f.title, class: "dp-feature-title" })
      inner.push({ p: f.details, class: "dp-feature-details" })
      const el: DomphyElement = { div: inner, class: "dp-feature" }
      return f.link ? ({ a: [el], href: f.link, class: "dp-feature-link" } as DomphyElement) : el
    }),
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
  const bar = announcementBar(ctx.config)
  return {
    div: [
      ...(bar ? [bar] : []),
      header(ctx.config),
      { main, class: "dp-main dp-main-home" },
      { footer: ctx.config.themeConfig.footerMessage ?? "", class: "dp-footer" },
    ],
  }
}
