// Page shell: header, sidebar, content, TOC aside, prev/next, footer.
// CSS comes entirely from inline style:{} objects so generateCSS() is the
// single source of truth — no hand-written class-targeted CSS strings.

import { navLink } from "@domphy/app";
import type { DomphyElement, StyleObject } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";
import { linkButton, toolbar, toolbarSpacer } from "@domphy/ui";
import { prevNextForRoute, sidebarForRoute } from "./routes-browser.js";
import type {
  LayoutContext,
  SidebarItem,
  SiteConfig,
  SocialLink,
} from "./types.js";

// types.ts is the single source of truth for LayoutContext (LayoutSlots
// members are typed against it there too, so overrides type-check).
export type { LayoutContext } from "./types.js";

// Avoids TypeScript widening string literals to 'string' when style objects
// are defined as standalone variables (not inlined directly on elements).
const style = <T extends StyleObject>(obj: T): T => obj;

// Theme tokens — static CSS var references (no listener needed for SSR CSS)
const tc = (tone: string, color?: string): string =>
  themeColor(null, tone as any, color);
const ts = (n: number): string => themeSpacing(n);

// Press deliberately owns its documentation type scale (VitePress-derived
// pixel values) rather than the theme's 8-step size scale — remapping every
// fontSize onto the nearest token would visibly change every press site.
// Declaring typography through functions is @domphy/doctor's designed marker
// for intentional, non-token typography (inline-typography passes function
// values); the values themselves stay pixel-identical.
const fixed = (value: string) => (): string => value;

// Font hooks — sites inject these vars (e.g. a Google Fonts <link> plus a
// small :root <style> in `head`) to re-skin typography without fighting the
// generated stylesheet: the var() reference lives inside press's own CSS, so
// source order does not matter. Unset vars fall back to the previous stacks.
// --dp-font-sans / --dp-font-mono are consumed in theme.ts; --dp-font-display
// marks the hero headline and content h1/h2 (falls back to the body face).
const fontDisplay = fixed("var(--dp-font-display, inherit)");

/** Skip-to-content link (Front-End Checklist / WCAG 2.4.1 Bypass Blocks). */
function skipToContentLink(): DomphyElement {
  return {
    a: "Skip to content",
    href: "#main-content",
    class: "dp-skip-link",
  } as DomphyElement;
}

const bg = tc("inherit");
const bgSoft = tc("shift-1");
const bgMute = tc("shift-2");
const border = tc("shift-3");
const textSoft = tc("shift-6");
const text = tc("shift-9");
const textStrong = tc("shift-11");
const brand = tc("shift-9", "primary");

const headerH = ts(14);
const sidebarW = ts(62);
const asideW = ts(56);
const contentMax = ts(190);

// --- Social icons -------------------------------------------------------

const SOCIAL_LABELS: Record<string, string> = {
  github: "GitHub",
  twitter: "Twitter",
  discord: "Discord",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  mastodon: "Mastodon",
  npm: "npm",
  bluesky: "Bluesky",
};

function socialLinkEl(social: SocialLink): DomphyElement {
  const name = social.icon.toLowerCase();
  const isUrl = social.icon.startsWith("http") || social.icon.startsWith("/");
  const innerEl: DomphyElement = isUrl
    ? ({
        img: null,
        src: social.icon,
        alt: social.ariaLabel ?? name,
        width: "18",
        height: "18",
      } as DomphyElement)
    : // dp-social-icon dp-icon-* classes drive SVG mask-image in pressCSS
      ({
        span: "",
        class: `dp-social-icon dp-icon-${name}`,
        ariaHidden: "true",
      } as DomphyElement);
  return {
    a: [innerEl],
    href: social.link,
    ariaLabel: social.ariaLabel ?? SOCIAL_LABELS[name] ?? social.icon,
    target: "_blank",
    rel: "noopener noreferrer",
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: ts(8.5),
      height: ts(8.5),
      borderRadius: ts(2),
      color: textSoft,
      background: bgSoft,
      border: `1px solid ${border}`,
      fontSize: fixed("10px"),
      fontWeight: fixed("700"),
      flexShrink: "0",
      "&:hover": {
        color: text,
        borderColor: textSoft,
        textDecoration: fixed("none"),
      },
    },
  } as DomphyElement;
}

// --- Page link helper ---------------------------------------------------

function pageLink(text: string, href: string): DomphyElement {
  return {
    a: text,
    href,
    $: [navLink({ href, exact: true })],
  } as DomphyElement;
}

// --- Nav dropdown -------------------------------------------------------

function navDropdown(item: {
  text: string;
  items: { text: string; link: string }[];
}): DomphyElement {
  const menuStyle = style({
    display: "none",
    position: "absolute",
    top: "100%",
    paddingTop: ts(2),
    right: "0",
    background: bgSoft,
    color: text,
    border: `1px solid ${border}`,
    borderRadius: ts(2),
    padding: ts(1.5),
    minWidth: ts(40),
    zIndex: "100",
    flexDirection: "column" as const,
    gap: ts(0.5),
    boxShadow: "0 4px 16px rgba(0,0,0,.1)",
    "& a": {
      display: "block",
      padding: `${ts(1.25)} ${ts(2.5)}`,
      borderRadius: ts(1.25),
      fontSize: fixed("13px"),
    },
    "& a:hover": { background: bgMute },
    // The reveal-on-hover pattern above doesn't work on touch. When this nav
    // becomes the mobile drawer (see header()'s Primary nav style), show the
    // submenu expanded inline instead of gating it behind hover/focus.
    "@media (max-width: 860px)": {
      display: "flex",
      position: "static",
      boxShadow: "none",
      border: "none",
      background: "none",
      padding: `0 0 0 ${ts(3)}`,
      minWidth: "0",
      width: "100%",
    },
  });
  return {
    div: [
      {
        span: item.text,
        style: {
          color: textSoft,
          fontSize: fixed("14px"),
          fontWeight: fixed("500"),
          cursor: "pointer",
          userSelect: "none",
          "&::after": {
            content: '" ▾"',
            fontSize: fixed("10px"),
            opacity: ".6",
          },
        },
      },
      {
        div: item.items.map((child) => pageLink(child.text, child.link)),
        style: menuStyle,
      },
    ],
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      "&:hover > div:last-child, &:focus-within > div:last-child": {
        display: "flex",
      },
      "@media (max-width: 860px)": {
        flexDirection: "column",
        alignItems: "flex-start",
        width: "100%",
      },
    },
  };
}

// --- Announcement bar ---------------------------------------------------

function announcementBar(config: SiteConfig): DomphyElement | null {
  const bar = config.themeConfig.announcementBar;
  if (!bar) return null;
  const idAttr = bar.id ? bar.id : "";
  const children: DomphyElement[] = [{ span: bar.text } as DomphyElement];
  if (bar.dismissible !== false) {
    children.push({
      button: "✕",
      type: "button",
      dataDismissAnnouncement: "",
      ariaLabel: "Dismiss",
      style: {
        background: "none",
        border: "none",
        color: bg,
        cursor: "pointer",
        fontSize: fixed("14px"),
        opacity: ".7",
        padding: `${ts(0.5)} ${ts(1.5)}`,
        borderRadius: ts(1),
        flexShrink: "0",
        "&:hover": { opacity: "1" },
      },
    } as DomphyElement);
  }
  return {
    div: children,
    class: "dp-announcement", // kept: JS uses querySelector('.dp-announcement')
    ...(idAttr ? { dataId: idAttr } : {}),
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: ts(3),
      padding: `${ts(2.5)} ${ts(6)}`,
      background: brand,
      color: bg,
      fontSize: fixed("14px"),
      fontWeight: fixed("500"),
      textAlign: "center",
      "& a": { color: bg, fontWeight: fixed("700") },
    },
  } as DomphyElement;
}

// --- Locale switcher ----------------------------------------------------

function localeSwitcher(ctx: LayoutContext): DomphyElement | null {
  const { config, route } = ctx;
  if (!config.locales) return null;
  const entries = Object.entries(config.locales);
  if (entries.length <= 1) return null;

  let currentKey = "/";
  let barePath = route;
  for (const [key] of entries) {
    if (key !== "/" && route.startsWith(key.replace(/\/$/, ""))) {
      currentKey = key;
      barePath = route.slice(key.replace(/\/$/, "").length) || "/";
      break;
    }
  }
  const currentLocale = config.locales[currentKey];
  if (!currentLocale) return null;

  const links: DomphyElement[] = entries.map(([key, locale]) => {
    const prefix = key === "/" ? "" : key.replace(/\/$/, "");
    const href = prefix + (barePath === "/" ? "/" : barePath);
    const isActive = key === currentKey;
    return {
      a: locale.label,
      href,
      ...(isActive ? { ariaCurrent: "true" } : {}),
      lang: locale.lang,
      style: {
        display: "block",
        padding: `${ts(1.25)} ${ts(2.5)}`,
        borderRadius: ts(1.25),
        fontSize: fixed("13px"),
        color: textSoft,
        ...(isActive ? { color: brand, fontWeight: fixed("600") } : {}),
        "&:hover": {
          background: bgMute,
          color: text,
          textDecoration: fixed("none"),
        },
      },
    } as DomphyElement;
  });

  const menuStyle = style({
    display: "none",
    position: "absolute",
    top: "100%",
    paddingTop: ts(2),
    right: "0",
    background: bgSoft,
    color: text,
    border: `1px solid ${border}`,
    borderRadius: ts(2),
    padding: ts(1.5),
    minWidth: ts(32),
    zIndex: "200",
    flexDirection: "column" as const,
    gap: ts(0.5),
    boxShadow: "0 4px 16px rgba(0,0,0,.1)",
  });
  return {
    div: [
      {
        span: ["🌐 ", currentLocale.label],
        style: {
          color: textSoft,
          fontSize: fixed("13px"),
          fontWeight: fixed("500"),
          cursor: "pointer",
          userSelect: "none",
          padding: `${ts(1)} ${ts(2)}`,
          border: `1px solid ${border}`,
          borderRadius: ts(1.5),
          background: bgSoft,
          whiteSpace: "nowrap",
          display: "flex",
          alignItems: "center",
          gap: ts(1),
          "&::after": {
            content: '" ▾"',
            fontSize: fixed("10px"),
            opacity: ".6",
          },
        },
      },
      { div: links, style: menuStyle },
    ],
    ariaLabel: "Select language",
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      "&:hover > div:last-child, &:focus-within > div:last-child": {
        display: "flex",
      },
    },
  } as DomphyElement;
}

// --- Header -------------------------------------------------------------

// Single source of truth for whether a route renders the docs sidebar —
// used both to build the sidebar itself (pageShell) and to decide whether
// the Primary nav needs to become the mobile drawer instead (header).
function hasDocSidebar(ctx: LayoutContext): boolean {
  const layout =
    typeof ctx.frontmatter.layout === "string" ? ctx.frontmatter.layout : "doc";
  return layout === "doc" && ctx.frontmatter.sidebar !== false;
}

function header(ctx: LayoutContext): DomphyElement {
  const { config } = ctx;
  const searchEnabled = config.themeConfig.search !== false;
  const logo = config.themeConfig.logo;
  const showSidebar = hasDocSidebar(ctx);
  const logoInner: DomphyElement[] = logo
    ? typeof logo === "string"
      ? [
          {
            img: null,
            src: logo,
            alt: config.title,
            style: { height: ts(7), width: "auto", display: "block" },
          } as DomphyElement,
        ]
      : [
          {
            img: null,
            src: logo.light,
            alt: config.title,
            class: "dp-logo-light",
            style: { height: ts(7), width: "auto", display: "block" },
          } as DomphyElement,
          {
            img: null,
            src: logo.dark,
            alt: config.title,
            class: "dp-logo-dark",
            style: { height: ts(7), width: "auto", display: "block" },
          } as DomphyElement,
        ]
    : [];

  const logoStyle = {
    fontWeight: fixed("700"),
    fontSize: fixed("18px"),
    color: textStrong,
    whiteSpace: "nowrap",
    flexShrink: "0",
    textDecoration: fixed("none"),
    "&:hover": { textDecoration: fixed("none") },
  };
  const logoEl: DomphyElement = logo
    ? ({ a: logoInner, href: config.base, style: logoStyle } as DomphyElement)
    : ({
        a: config.title,
        href: config.base,
        style: logoStyle,
      } as DomphyElement);

  const socialEls: DomphyElement[] = (config.themeConfig.socialLinks ?? []).map(
    socialLinkEl,
  );
  const localeEl = localeSwitcher(ctx);

  return {
    header: [
      logoEl,
      toolbarSpacer(),
      {
        nav: config.themeConfig.nav.map((item) =>
          item.items
            ? navDropdown(
                item as {
                  text: string;
                  items: { text: string; link: string }[];
                },
              )
            : pageLink(item.text, item.link!),
        ),
        $: [toolbar({ gap: 4 })],
        ariaLabel: "Primary",
        style: {
          "& a": {
            color: textSoft,
            fontSize: fixed("14px"),
            fontWeight: fixed("500"),
            whiteSpace: "nowrap",
            lineHeight: fixed("1"),
          },
          "& a:hover, & a[aria-current='page']": {
            color: brand,
            textDecoration: fixed("none"),
          },
          "@media (max-width: 860px)": showSidebar
            ? { display: "none" }
            : {
                // Pages without a docs sidebar (home, playground) have no
                // other mobile nav — reuse the same drawer mechanics as the
                // docs sidebar instead of just hiding this nav outright.
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                position: "fixed",
                top: headerH,
                left: "0",
                bottom: "0",
                width: "80%",
                maxWidth: ts(80),
                background: bg,
                borderRight: `1px solid ${border}`,
                zIndex: "25",
                padding: `${ts(6)} ${ts(3)}`,
                gap: ts(1),
                overflowY: "auto",
                transform: "translateX(-100%)",
                transition: "transform .2s ease",
              },
        },
      },
      {
        div: [
          ...(searchEnabled
            ? [
                {
                  div: [
                    {
                      input: null,
                      type: "search",
                      placeholder:
                        (typeof config.themeConfig.search === "object" &&
                          config.themeConfig.search.placeholder) ||
                        "Search...",
                      ariaLabel: "Search documentation",
                      style: {
                        width: "100%",
                        height: ts(8),
                        padding: `0 ${ts(2.5)}`,
                        border: `1px solid ${border}`,
                        borderRadius: ts(1.5),
                        background: bgSoft,
                        color: textSoft,
                        fontSize: fixed("13px"),
                        fontFamily: fixed("inherit"),
                        outline: "none",
                        cursor: "pointer",
                        "&::placeholder": { color: textSoft },
                      },
                    },
                  ],
                  dataIsland: "search",
                  style: {
                    width: ts(50),
                    "@media (max-width: 860px)": { width: ts(35) },
                  },
                } as DomphyElement,
              ]
            : []),
          ...socialEls,
          ...(localeEl ? [localeEl] : []),
          {
            button: "◐",
            type: "button",
            ariaLabel: "Toggle dark mode",
            dataThemeToggle: "",
            style: {
              border: `1px solid ${border}`,
              background: bgSoft,
              color: text,
              borderRadius: ts(2),
              width: ts(8.5),
              height: ts(8.5),
              cursor: "pointer",
              fontSize: fixed("16px"),
              flexShrink: "0",
            },
          },
          {
            button: "☰",
            type: "button",
            ariaLabel: "Toggle menu",
            dataMenuToggle: "",
            style: {
              border: `1px solid ${border}`,
              background: bgSoft,
              color: text,
              borderRadius: ts(2),
              width: ts(8.5),
              height: ts(8.5),
              cursor: "pointer",
              fontSize: fixed("16px"),
              flexShrink: "0",
              display: "none",
              "@media (max-width: 860px)": { display: "block" },
            },
          },
        ],
        $: [toolbar({ gap: 2 })],
        style: { flexShrink: "0" },
      },
    ],
    $: [toolbar({ gap: 4 })],
    style: {
      position: "sticky",
      top: "0",
      height: headerH,
      background: bg,
      color: text,
      borderBottom: `1px solid ${border}`,
      zIndex: "100",
      padding: `0 ${ts(6)}`,
      "@media (max-width: 860px)": { padding: `0 ${ts(3)}` },
    },
  };
}

// --- Sidebar badges -----------------------------------------------------

function badgeEl(badge: NonNullable<SidebarItem["badge"]>): DomphyElement {
  const colorMap: Record<string, string> = {
    tip: brand,
    info: textSoft,
    warning: tc("shift-9", "warning"),
    danger: tc("shift-9", "danger"),
  };
  const bgMap: Record<string, string> = {
    tip: `color-mix(in srgb,${brand} 12%,${bg})`,
    info: bgMute,
    warning: `color-mix(in srgb,${tc("shift-9", "warning")} 12%,${bg})`,
    danger: `color-mix(in srgb,${tc("shift-9", "danger")} 12%,${bg})`,
  };
  const type = badge.type ?? "tip";
  return {
    span: badge.text,
    style: {
      display: "inline-block",
      padding: `${ts(0.5)} ${ts(1.75)}`,
      borderRadius: ts(2.5),
      fontSize: fixed("11px"),
      fontWeight: fixed("700"),
      lineHeight: fixed("1.4"),
      whiteSpace: "nowrap",
      verticalAlign: "middle",
      background: bgMap[type] ?? bgMute,
      color: colorMap[type] ?? textSoft,
    },
  } as DomphyElement;
}

// --- Sidebar ------------------------------------------------------------

function pageLinkWithBadge(
  text: string,
  href: string,
  badge?: SidebarItem["badge"],
): DomphyElement {
  if (!badge) {
    return {
      a: text,
      href,
      $: [navLink({ href, exact: true })],
    } as DomphyElement;
  }
  return {
    a: [{ span: text }, badgeEl(badge)],
    href,
    $: [navLink({ href, exact: true })],
    style: { display: "flex", alignItems: "center" },
  } as DomphyElement;
}

function sidebarGroup(group: SidebarItem): DomphyElement {
  const children: DomphyElement[] = [];
  const isCollapsible = group.items && group.items.length > 0;

  if (group.link) {
    children.push(pageLinkWithBadge(group.text, group.link, group.badge));
  } else {
    const titleChildren: DomphyElement[] = [
      { span: group.text } as DomphyElement,
    ];
    if (group.badge) titleChildren.push(badgeEl(group.badge));
    if (isCollapsible) {
      titleChildren.push({
        button: group.collapsed ? "›" : "‹",
        type: "button",
        ariaLabel: group.collapsed ? "Expand" : "Collapse",
        dataSidebarToggle: "",
        style: {
          marginLeft: "auto",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: textSoft,
          fontSize: fixed("14px"),
          padding: `0 ${ts(1)}`,
          lineHeight: fixed("1"),
          "&:hover": { color: text },
        },
      } as DomphyElement);
    }
    children.push({
      div: titleChildren,
      style: {
        display: "flex",
        alignItems: "center",
        gap: ts(1.5),
        fontSize: fixed("13px"),
        fontWeight: fixed("700"),
        color: textStrong,
        margin: `${ts(2)} 0 ${ts(1)}`,
      },
    } as DomphyElement);
  }

  if (group.items) {
    const itemsEl: DomphyElement[] = [];
    for (const item of group.items) {
      if (item.items) {
        itemsEl.push({
          div: item.text,
          style: {
            fontSize: fixed("12px"),
            color: textSoft,
            padding: `${ts(1)} ${ts(3)}`,
            fontWeight: fixed("600"),
          },
        } as DomphyElement);
        for (const leaf of item.items) {
          if (leaf.link)
            itemsEl.push(pageLinkWithBadge(leaf.text, leaf.link, leaf.badge));
        }
      } else if (item.link) {
        itemsEl.push(pageLinkWithBadge(item.text, item.link, item.badge));
      }
    }
    // dp-sidebar-items class kept: pressCSS uses it for .dp-sidebar-group.collapsed .dp-sidebar-items
    children.push({
      div: itemsEl,
      class: "dp-sidebar-items",
      style: { display: "flex", flexDirection: "column" },
    } as DomphyElement);
  }

  const groupClass = [
    "dp-sidebar-group",
    isCollapsible && group.collapsed ? "collapsed" : "",
  ]
    .filter(Boolean)
    .join(" ");
  // dp-sidebar-group class kept: JS uses .closest('.dp-sidebar-group') + classList.toggle('collapsed')
  return {
    div: children,
    class: groupClass,
    style: { marginBottom: ts(3.5) },
  } as DomphyElement;
}

function sidebar(ctx: LayoutContext): DomphyElement {
  const groups = sidebarForRoute(ctx.route, ctx.config);
  return {
    nav: groups.map(sidebarGroup),
    ariaLabel: "Documentation", // used as stable selector in pressCSS mobile-open rule
    style: {
      position: "sticky",
      top: headerH,
      maxHeight: `calc(100vh - ${headerH})`,
      overflowY: "auto",
      padding: `${ts(6)} ${ts(3)} ${ts(12)} ${ts(6)}`,
      color: text,
      borderRight: `1px solid ${border}`,
      "& a": {
        display: "flex",
        alignItems: "center",
        gap: ts(1.5),
        padding: `${ts(1.25)} ${ts(3)}`,
        fontSize: fixed("14px"),
        // Body text tone (not muted) — WCAG AA for 14px UI chrome.
        color: text,
        borderRadius: ts(1.5),
        textDecoration: fixed("none"),
      },
      "& a:hover": { color: brand, textDecoration: fixed("none"), background: bgSoft },
      "& a[aria-current='page']": {
        color: brand,
        fontWeight: fixed("600"),
        background: bgSoft,
      },
      "@media (max-width: 860px)": {
        position: "fixed",
        top: headerH,
        left: "0",
        bottom: "0",
        width: "80%",
        maxWidth: ts(80),
        background: bg,
        zIndex: "25",
        transform: "translateX(-100%)",
        transition: "transform .2s ease",
        maxHeight: "none",
      },
    },
  };
}

// --- TOC aside ----------------------------------------------------------

function tocAside(ctx: LayoutContext): DomphyElement | null {
  if (ctx.frontmatter.aside === false) return null;
  const [minLevel, maxLevel] = ctx.config.themeConfig.outline?.level ?? [2, 3];
  const entries = ctx.toc.filter(
    (e) => e.level >= minLevel && e.level <= maxLevel,
  );
  if (entries.length === 0) return null;
  const tocTitle = ctx.config.themeConfig.tocTitle ?? "On this page";

  const indentMap: Record<number, string> = { 2: "0", 3: ts(3), 4: ts(6) };
  return {
    aside: [
      {
        div: tocTitle,
        style: { fontWeight: fixed("700"), marginBottom: ts(2), color: text },
      },
      {
        nav: entries.map((e) => ({
          a: e.text,
          href: `#${e.slug}`,
          style: {
            display: "block",
            padding: `${ts(0.75)} 0`,
            color: textSoft,
            paddingLeft: indentMap[e.level] ?? "0",
            "&:hover": { color: brand, textDecoration: fixed("none") },
          },
        })),
      },
    ],
    style: {
      position: "sticky",
      top: headerH,
      maxHeight: `calc(100vh - ${headerH})`,
      overflowY: "auto",
      padding: `${ts(8)} ${ts(6)}`,
      fontSize: fixed("13px"),
    },
  };
}

// --- Prev/next ----------------------------------------------------------

function prevNext(ctx: LayoutContext): DomphyElement | null {
  let { prev, next } = prevNextForRoute(ctx.route, ctx.config);

  // Frontmatter overrides: false disables, {text,link} replaces
  const fmPrev = ctx.frontmatter.prev;
  const fmNext = ctx.frontmatter.next;
  if (fmPrev === false) prev = undefined;
  else if (fmPrev && typeof fmPrev === "object") {
    const p = fmPrev as { text?: string; link?: string };
    if (p.text && p.link) prev = { text: p.text, link: p.link };
  }
  if (fmNext === false) next = undefined;
  else if (fmNext && typeof fmNext === "object") {
    const n = fmNext as { text?: string; link?: string };
    if (n.text && n.link) next = { text: n.text, link: n.link };
  }
  if (!prev && !next) return null;
  const linkStyle = style({
    display: "block",
    padding: `${ts(3)} ${ts(4)}`,
    border: `1px solid ${border}`,
    borderRadius: ts(2),
    fontWeight: fixed("600"),
    flex: "1",
    "&:hover": { borderColor: brand, textDecoration: fixed("none") },
  });
  return {
    nav: [
      prev
        ? {
            a: [
              {
                small: "Previous",
                style: {
                  display: "block",
                  color: textSoft,
                  fontWeight: fixed("400"),
                  fontSize: fixed("12px"),
                },
              },
              { span: prev.text },
            ],
            href: prev.link,
            style: linkStyle,
          }
        : { span: "" },
      next
        ? {
            a: [
              {
                small: "Next",
                style: {
                  display: "block",
                  color: textSoft,
                  fontWeight: fixed("400"),
                  fontSize: fixed("12px"),
                },
              },
              { span: next.text },
            ],
            href: next.link,
            style: { ...linkStyle, textAlign: "right" },
          }
        : { span: "" },
    ],
    ariaLabel: "Page navigation",
    style: {
      display: "flex",
      justifyContent: "space-between",
      gap: ts(4),
      marginTop: ts(12),
      paddingTop: ts(6),
      borderTop: `1px solid ${border}`,
    },
  };
}

// --- Edit link + last updated -------------------------------------------

function docFooter(ctx: LayoutContext): DomphyElement | null {
  const { editLink } = ctx.config.themeConfig;
  const showLastUpdated = ctx.config.lastUpdated;
  const hasEdit = editLink && ctx.filePath;
  const hasDate = showLastUpdated && ctx.lastUpdated;
  if (!hasEdit && !hasDate && !ctx.readingTime) return null;

  const children: DomphyElement[] = [];
  if (hasDate) {
    const date = new Date(ctx.lastUpdated!);
    const formatted = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    children.push({
      span: [`Last updated: `, { time: formatted, dateTime: ctx.lastUpdated }],
    } as DomphyElement);
  }
  if (ctx.readingTime) {
    children.push({ span: `📖 ${ctx.readingTime} min read` } as DomphyElement);
  }
  if (hasEdit) {
    const pattern = editLink!.pattern;
    const href = pattern.replace(/:path/g, ctx.filePath!);
    children.push({
      a: editLink!.text ?? "Edit this page",
      href,
      target: "_blank",
      rel: "noopener noreferrer",
      style: { fontWeight: fixed("500"), fontSize: fixed("13px") },
    } as DomphyElement);
  }
  return {
    div: children,
    style: {
      display: "flex",
      alignItems: "center",
      gap: ts(4),
      flexWrap: "wrap",
      marginTop: ts(8),
      paddingTop: ts(5),
      borderTop: `1px solid ${border}`,
      fontSize: fixed("13px"),
      color: textSoft,
    },
  };
}

// --- Page badge (from frontmatter) --------------------------------------

function pageBadge(frontmatter: Record<string, unknown>): DomphyElement | null {
  const badge = frontmatter.badge as
    | { text?: string; type?: string }
    | string
    | undefined;
  if (!badge) return null;
  const text2 = typeof badge === "string" ? badge : (badge.text ?? "");
  const type = typeof badge === "object" ? (badge.type ?? "tip") : "tip";
  if (!text2) return null;
  return badgeEl({
    text: text2,
    type: type as "tip" | "info" | "warning" | "danger",
  });
}

// --- Slot resolver ------------------------------------------------------

type SlotFn = (ctx: LayoutContext) => DomphyElement | null;

function resolveSlot(
  ctx: LayoutContext,
  key: keyof import("./types.js").LayoutSlots,
  fallback: SlotFn,
): DomphyElement | null {
  const override = ctx.config.themeConfig.slots?.[key];
  return override ? (override as SlotFn)(ctx) : fallback(ctx);
}

// --- Content div with prose styles -------------------------------------

function contentDiv(body: DomphyElement[], maxWidth?: string): DomphyElement {
  return {
    div: body,
    style: {
      maxWidth: maxWidth ?? contentMax,
      "& h1": {
        fontSize: fixed("30px"),
        fontWeight: fixed("700"),
        lineHeight: fixed("1.25"),
        margin: `0 0 ${ts(6)}`,
        letterSpacing: fixed("-.02em"),
        fontFamily: fontDisplay,
        color: textStrong,
      },
      "& h2": {
        fontSize: fixed("22px"),
        fontWeight: fixed("700"),
        margin: `${ts(11)} 0 ${ts(4)}`,
        paddingTop: ts(5),
        borderTop: `1px solid ${border}`,
        letterSpacing: fixed("-.01em"),
        fontFamily: fontDisplay,
        color: textStrong,
      },
      "& h3": {
        fontSize: fixed("18px"),
        fontWeight: fixed("600"),
        margin: `${ts(7)} 0 ${ts(3)}`,
        color: textStrong,
      },
      "& h4": {
        fontSize: fixed("16px"),
        fontWeight: fixed("600"),
        margin: `${ts(5.5)} 0 ${ts(2)}`,
        color: textStrong,
      },
      "& p": { margin: `${ts(4)} 0` },
      "& ul, & ol": { margin: `${ts(4)} 0`, paddingLeft: ts(5.6) },
      "& li": { margin: `${ts(1.5)} 0` },
      "& a": { fontWeight: fixed("500") },
      "& a[target='_blank']::after": {
        content: '" ↗"',
        fontSize: fixed(".75em"),
        opacity: ".6",
      },
      "& strong": { fontWeight: fixed("600"), color: textStrong },
      "& em": { fontStyle: "italic" },
      "& mark": {
        background: `color-mix(in srgb,${tc("shift-6", "warning")} 40%,${bg})`,
        color: "inherit",
        padding: `${ts(0.25)} ${ts(0.75)}`,
        borderRadius: ts(0.75),
      },
      "& sup": { fontSize: fixed(".75em"), verticalAlign: "super" },
      "& sub": { fontSize: fixed(".75em"), verticalAlign: "sub" },
      "& del": { opacity: ".5" },
      "& blockquote": {
        margin: `${ts(4)} 0`,
        padding: `0 ${ts(4)}`,
        borderLeft: `3px solid ${border}`,
        color: textSoft,
      },
      "& img": { maxWidth: "100%", height: "auto", borderRadius: ts(1.5) },
      "& hr": {
        border: "none",
        borderTop: `1px solid ${border}`,
        margin: `${ts(8)} 0`,
      },
      "& :not(pre)>code": {
        fontFamily: fixed(
          `var(--dp-font-mono, ui-monospace,SFMono-Regular,"SF Mono",Menlo,monospace)`,
        ),
        fontSize: fixed(".85em"),
        background: bgMute,
        padding: `${ts(0.75)} ${ts(1.5)}`,
        borderRadius: ts(1),
      },
      "& pre": {
        margin: `${ts(4)} 0`,
        padding: `${ts(4)} ${ts(5)}`,
        background: bgSoft,
        borderRadius: ts(2),
        overflowX: "auto",
        fontSize: fixed("13.5px"),
        lineHeight: fixed("1.5"),
      },
      "& pre code": {
        fontFamily: fixed(
          `var(--dp-font-mono, ui-monospace,SFMono-Regular,"SF Mono",Menlo,monospace)`,
        ),
        background: "none",
        padding: "0",
      },
      "& .code-block pre": {
        border: "none",
        borderRadius: "0",
        margin: "0",
      },
      "& table": {
        borderCollapse: "collapse",
        margin: `${ts(4)} 0`,
        display: "block",
        overflowX: "auto",
      },
      // th and td are declared separately (not "& th, & td" + a second
      // "& th" block): the selector list would re-emit ".scope th" twice,
      // tripping stylelint's no-duplicate-selectors on the generated CSS.
      "& td": {
        border: `1px solid ${border}`,
        padding: `${ts(2)} ${ts(3.5)}`,
        textAlign: "left",
      },
      "& th": {
        border: `1px solid ${border}`,
        padding: `${ts(2)} ${ts(3.5)}`,
        textAlign: "left",
        background: bgSoft,
        fontWeight: fixed("600"),
      },
    },
  } as DomphyElement;
}

// --- Shells -------------------------------------------------------------

export function pageShell(ctx: LayoutContext): DomphyElement {
  // layout: 'page' = no sidebar, no TOC, full-width content (same as VitePress)
  const layout =
    typeof ctx.frontmatter.layout === "string" ? ctx.frontmatter.layout : "doc";
  const showSidebar = hasDocSidebar(ctx);

  const asideEl =
    layout !== "page" ? resolveSlot(ctx, "aside", tocAside) : null;
  const showAside = asideEl !== null && showSidebar;

  const main: DomphyElement[] = [];
  const badge = pageBadge(ctx.frontmatter);
  if (badge)
    main.push({
      div: [badge],
      style: { marginBottom: ts(-2) },
    } as DomphyElement);
  // With the aside column hidden (frontmatter `aside: false` or no TOC), let
  // the content span the freed-up grid space instead of capping at prose width.
  main.push(
    contentDiv(ctx.body, !showAside && showSidebar ? "none" : undefined),
  );
  const pn = resolveSlot(ctx, "prevNext", prevNext);
  if (pn) main.push(pn);
  const docFooterEl = resolveSlot(ctx, "docFooter", docFooter);
  if (docFooterEl) main.push(docFooterEl);

  const sidebarEl = showSidebar ? resolveSlot(ctx, "sidebar", sidebar) : null;
  const mainStyle = showSidebar
    ? {
        padding: `${ts(8)} ${ts(12)} ${ts(20)}`,
        minWidth: "0",
        "@media (max-width: 860px)": { padding: `${ts(6)} ${ts(5)} ${ts(16)}` },
      }
    : {
        padding: `${ts(8)} ${ts(12)} ${ts(20)}`,
        gridColumn: "1 / -1",
        maxWidth: layout === "page" ? "100%" : contentMax,
        margin: "0 auto",
        "@media (max-width: 860px)": { padding: `${ts(6)} ${ts(5)} ${ts(16)}` },
      };
  const shellChildren: DomphyElement[] = [
    ...(sidebarEl ? [sidebarEl] : []),
    { main, id: "main-content", tabindex: -1, style: mainStyle },
  ];
  if (showAside) shellChildren.push(asideEl!);

  const headerEl = resolveSlot(ctx, "header", header);
  const bar = announcementBar(ctx.config);
  const slots = ctx.config.themeConfig.slots;
  const footerContent = slots?.footer
    ? slots.footer(ctx)
    : ({
        footer: ctx.config.themeConfig.footerMessage ?? "",
        style: {
          padding: `${ts(6)} ${ts(12)}`,
          borderTop: `1px solid ${border}`,
          color: text,
          fontSize: fixed("13px"),
          "& a": { color: brand, textDecoration: fixed("underline") },
        },
      } as DomphyElement);

  // Backdrop: covers screen on mobile when sidebar is open; click closes it
  const backdrop: DomphyElement = {
    div: [],
    class: "dp-sidebar-backdrop",
  } as unknown as DomphyElement;

  return {
    div: [
      skipToContentLink(),
      ...(bar ? [bar] : []),
      ...(headerEl ? [headerEl] : []),
      backdrop,
      {
        div: shellChildren,
        style: {
          display: "grid",
          gridTemplateColumns: showSidebar
            ? showAside
              ? `${sidebarW} minmax(0,1fr) ${asideW}`
              : `${sidebarW} minmax(0,1fr)`
            : "1fr",
          alignItems: "start",
          maxWidth: "1440px",
          margin: "0 auto",
          "@media (max-width: 1200px)": showSidebar
            ? { gridTemplateColumns: `${sidebarW} minmax(0,1fr)` }
            : {},
          "@media (max-width: 860px)": { gridTemplateColumns: "1fr" },
        },
      },
      ...(footerContent ? [footerContent] : []),
    ],
  };
}

interface HeroConfig {
  name?: string;
  text?: string;
  tagline?: string;
  actions?: Array<{ theme?: string; text: string; link: string }>;
  image?: { src: string; alt?: string } | string;
  /** Install one-liner rendered as a monospace pill under the actions. */
  command?: string;
}

export interface FeatureConfig {
  title: string;
  details: string;
  /** Emoji string for text icons, or a DomphyElement for inline SVG icons. */
  icon?: string | DomphyElement;
  link?: string;
}

function heroSection(hero: HeroConfig): DomphyElement {
  const hasImage = Boolean(hero.image);
  const imageSrc =
    typeof hero.image === "string" ? hero.image : hero.image?.src;
  const imageAlt =
    typeof hero.image === "object" ? (hero.image?.alt ?? "") : "";

  const textChildren: DomphyElement[] = [];
  if (hero.name)
    textChildren.push({
      div: hero.name,
      style: {
        fontSize: hasImage ? fixed("56px") : fixed("clamp(56px, 7vw, 82px)"),
        fontWeight: fixed("800"),
        lineHeight: fixed("1.08"),
        letterSpacing: fixed("-.03em"),
        fontFamily: fontDisplay,
        color: textStrong,
      },
    } as DomphyElement);
  if (hero.text)
    textChildren.push({
      h1: hero.text,
      style: {
        fontSize: hasImage ? fixed("30px") : fixed("clamp(26px, 3vw, 38px)"),
        fontWeight: fixed("700"),
        letterSpacing: fixed("-.02em"),
        fontFamily: fontDisplay,
        margin: `${ts(3)} 0 0`,
        color: textStrong,
      },
    } as DomphyElement);
  if (hero.tagline)
    textChildren.push({
      p: hero.tagline,
      style: {
        fontSize: fixed("18px"),
        color: textSoft,
        maxWidth: hasImage ? "none" : ts(160),
        margin: hasImage ? `${ts(5)} 0 0` : `${ts(5)} auto 0`,
      },
    } as DomphyElement);
  if (hero.actions?.length) {
    // Hero CTAs are real links — use `linkButton()` (hostTag <a>), never
    // button()/buttonGhost() which warn and break host-tag contracts when
    // applied to anchors (console: "button must use button tag").
    textChildren.push({
      div: hero.actions.map(
        (a) =>
          ({
            a: a.text,
            href: a.link,
            $: [
              linkButton({
                color:
                  !a.theme || a.theme === "brand" ? "primary" : "neutral",
                // Brand CTAs read as filled primary; secondary stays outline.
                variant:
                  !a.theme || a.theme === "brand" ? "solid" : "outline",
              }),
            ],
            style: {
              textDecoration: fixed("none"),
              "&:hover": { textDecoration: fixed("none") },
            },
          }) as DomphyElement,
      ),
      style: {
        display: "flex",
        gap: ts(3),
        justifyContent: hasImage ? "flex-start" : "center",
        marginTop: ts(7),
        flexWrap: "wrap",
      },
    } as DomphyElement);
  }
  if (hero.command) {
    textChildren.push({
      div: [
        { span: "$", style: { color: brand, userSelect: "none" } },
        { span: hero.command },
      ] as DomphyElement[],
      style: {
        display: "inline-flex",
        gap: ts(2),
        alignSelf: "center",
        marginTop: ts(6),
        padding: `${ts(2)} ${ts(4.5)}`,
        borderRadius: ts(2),
        border: `1px solid ${border}`,
        background: bgSoft,
        color: textSoft,
        fontFamily: fixed("var(--dp-font-mono, ui-monospace, monospace)"),
        fontSize: fixed("13.5px"),
      },
    } as DomphyElement);
  }

  if (!hasImage) {
    return {
      section: textChildren,
      style: {
        display: "flex",
        flexDirection: "column",
        textAlign: "center",
        padding: `${ts(16)} 0 ${ts(10)}`,
      },
    };
  }

  const imageEl: DomphyElement = {
    div: [
      {
        img: null,
        src: imageSrc,
        alt: imageAlt,
        style: {
          maxWidth: "100%",
          height: "auto",
          maxHeight: ts(80),
          objectFit: "contain",
          borderRadius: ts(3),
        },
      } as DomphyElement,
    ],
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
  } as DomphyElement;

  return {
    section: [
      {
        div: [
          {
            div: textChildren,
            style: {
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            },
          } as DomphyElement,
          imageEl,
        ],
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: ts(12),
          alignItems: "center",
          "@media (max-width: 768px)": { gridTemplateColumns: "1fr" },
        },
      } as DomphyElement,
    ],
    style: { padding: `${ts(10)} 0 ${ts(6)}` },
  };
}

function featuresSection(features: FeatureConfig[]): DomphyElement {
  return {
    div: features.map((f) => {
      const inner: DomphyElement[] = [];
      if (f.icon) {
        inner.push(
          typeof f.icon === "string"
            ? ({
                div: f.icon,
                style: { fontSize: fixed("28px"), marginBottom: ts(3) },
              } as DomphyElement)
            : ({
                div: [f.icon],
                style: { marginBottom: ts(3) },
              } as DomphyElement),
        );
      }
      inner.push({
        div: f.title,
        style: {
          fontWeight: fixed("700"),
          fontSize: fixed("17px"),
          marginBottom: ts(2),
          color: textStrong,
        },
      } as DomphyElement);
      inner.push({
        p: f.details,
        style: {
          fontSize: fixed("14px"),
          color: textSoft,
          margin: "0",
          lineHeight: fixed("1.5"),
        },
      } as DomphyElement);
      const featureStyle = {
        height: "100%",
        padding: ts(6),
        background: bgSoft,
        color: text,
        border: `1px solid ${border}`,
        borderRadius: ts(4),
        transition: "border-color .18s ease",
        "&:hover": {
          borderColor: `color-mix(in srgb, ${brand} 55%, ${border})`,
        },
      };
      const el: DomphyElement = {
        div: inner,
        style: featureStyle,
      } as DomphyElement;
      return f.link
        ? ({
            a: [el],
            href: f.link,
            style: {
              display: "block",
              color: "inherit",
              "&:hover": { textDecoration: fixed("none") },
              "&:hover > div": { borderColor: brand },
            },
          } as DomphyElement)
        : el;
    }),
    style: {
      display: "grid",
      gridTemplateColumns: `repeat(auto-fit,minmax(${ts(60)},1fr))`,
      gap: ts(4),
      margin: `${ts(10)} 0`,
    },
  };
}

export function homeShell(ctx: LayoutContext): DomphyElement {
  const main: DomphyElement[] = [];
  const hero = ctx.frontmatter.hero as HeroConfig | undefined;
  const features = ctx.frontmatter.features as FeatureConfig[] | undefined;
  // fullBleed (frontmatter opt-in): the fixed 1100px main column is dropped
  // and each top-level prose block centers itself instead, so bare island
  // placeholders (live demos — e.g. a WebGL hero) can span edge-to-edge.
  const fullBleed = ctx.frontmatter.fullBleed === true;
  if (hero || features?.length) {
    const blocks: DomphyElement[] = [];
    if (hero) blocks.push(heroSection(hero));
    if (features?.length) blocks.push(featuresSection(features));
    if (fullBleed) {
      main.push({
        div: blocks,
        style: {
          maxWidth: "1100px",
          margin: "0 auto",
          padding: `${ts(12)} ${ts(6)} 0`,
        },
      } as DomphyElement);
    } else {
      main.push(...blocks);
    }
  }
  // Home body spans the full main column (doc pages keep their reading
  // width) — hero/features above are 1100px wide, so a ~710px left-aligned
  // body reads as broken alignment. Table/hr polish is home-only: the
  // markdown package/feature tables on a landing are presentation, not
  // reference reading.
  main.push({
    div: [contentDiv(ctx.body, "none")],
    style: {
      ...(fullBleed
        ? {
            // Per-block centering replaces the main column. The :not() bumps
            // specificity past contentDiv's own `.scope h2`-style rules so
            // marginInline:auto survives their margin shorthands.
            "& > div > :not([data-island])": {
              maxWidth: "1100px",
              marginInline: "auto",
              paddingInline: ts(6),
            },
          }
        : {}),
      "& hr": {
        border: "none",
        borderTop: `1px solid ${border}`,
        margin: `${ts(12)} 0`,
      },
      "& table": {
        width: "100%",
        borderCollapse: "collapse",
        fontSize: fixed("14.5px"),
      },
      "& thead": { display: "none" },
      "& td": {
        padding: `${ts(3)} ${ts(4)}`,
        borderBottom: `1px solid color-mix(in srgb, ${border} 60%, transparent)`,
      },
      "& tbody tr": { transition: "background .15s ease" },
      "& tbody tr:hover": { background: bgSoft },
      "& td:first-child": { whiteSpace: "nowrap", width: "1%" },
    },
  } as DomphyElement);
  const bar = announcementBar(ctx.config);
  const headerEl = resolveSlot(ctx, "header", header);
  const slots = ctx.config.themeConfig.slots;
  const footerContent = slots?.footer
    ? slots.footer(ctx)
    : ({
        footer: ctx.config.themeConfig.footerMessage ?? "",
        style: {
          padding: `${ts(6)} ${ts(12)}`,
          borderTop: `1px solid ${border}`,
          color: text,
          fontSize: fixed("13px"),
          "& a": { color: brand, textDecoration: fixed("underline") },
        },
      } as DomphyElement);
  // Backdrop: covers screen on mobile when the Primary nav drawer is open
  // (this page has no docs sidebar of its own — see header()'s showSidebar).
  const backdrop: DomphyElement = {
    div: [],
    class: "dp-sidebar-backdrop",
  } as unknown as DomphyElement;
  return {
    div: [
      skipToContentLink(),
      ...(bar ? [bar] : []),
      ...(headerEl ? [headerEl] : []),
      backdrop,
      {
        main,
        id: "main-content",
        tabindex: -1,
        style: fullBleed
          ? { padding: `0 0 ${ts(20)}` }
          : {
              maxWidth: "1100px",
              margin: "0 auto",
              padding: `${ts(12)} ${ts(6)} ${ts(20)}`,
            },
      },
      ...(footerContent ? [footerContent] : []),
    ],
  };
}
