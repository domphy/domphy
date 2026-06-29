// Page shell: header, sidebar, content, TOC aside, prev/next, footer.
// CSS comes entirely from inline style:{} objects so generateCSS() is the
// single source of truth — no hand-written class-targeted CSS strings.

import { navLink } from "@domphy/app";
import type { DomphyElement, StyleObject } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";
import { toolbar, toolbarSpacer } from "@domphy/ui";
import { prevNextForRoute, sidebarForRoute } from "./routes-browser.js";
import type { SidebarItem, SiteConfig, SocialLink, TocEntry } from "./types.js";

// Avoids TypeScript widening string literals to 'string' when style objects
// are defined as standalone variables (not inlined directly on elements).
const style = <T extends StyleObject>(obj: T): T => obj;

export interface LayoutContext {
  route: string;
  title: string;
  body: DomphyElement[];
  toc: TocEntry[];
  frontmatter: Record<string, unknown>;
  config: SiteConfig;
  /** ISO date string from git log, if lastUpdated:true and git available. */
  lastUpdated?: string;
  /** Estimated reading time in minutes. */
  readingTime?: number;
  /** Relative path from srcDir (e.g. "guide/index.md"), used for editLink. */
  filePath?: string;
}

// Theme tokens — static CSS var references (no listener needed for SSR CSS)
const tc = (tone: string, color?: string): string =>
  themeColor(null, tone as any, color);
const ts = (n: number): string => themeSpacing(n);

const bg = tc("inherit");
const bgSoft = tc("shift-1");
const bgMute = tc("shift-2");
const border = tc("shift-3");
const textSoft = tc("shift-6");
const text = tc("shift-9");
const textStrong = tc("shift-11");
const brand = tc("shift-9", "primary");
const brandHover = tc("shift-10", "primary");

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
      fontSize: "10px",
      fontWeight: "700",
      flexShrink: "0",
      "&:hover": { color: text, borderColor: textSoft, textDecoration: "none" },
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
      fontSize: "13px",
    },
    "& a:hover": { background: bgMute },
  });
  return {
    div: [
      {
        span: item.text,
        style: {
          color: textSoft,
          fontSize: "14px",
          fontWeight: "500",
          cursor: "pointer",
          userSelect: "none",
          "&::after": { content: '" ▾"', fontSize: "10px", opacity: ".6" },
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
        fontSize: "14px",
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
      fontSize: "14px",
      fontWeight: "500",
      textAlign: "center",
      "& a": { color: bg, fontWeight: "700" },
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
        fontSize: "13px",
        color: textSoft,
        ...(isActive ? { color: brand, fontWeight: "600" } : {}),
        "&:hover": { background: bgMute, color: text, textDecoration: "none" },
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
          fontSize: "13px",
          fontWeight: "500",
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
          "&::after": { content: '" ▾"', fontSize: "10px", opacity: ".6" },
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

function header(ctx: LayoutContext): DomphyElement {
  const { config } = ctx;
  const searchEnabled = config.themeConfig.search !== false;
  const logo = config.themeConfig.logo;

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
    fontWeight: "700",
    fontSize: "18px",
    color: textStrong,
    whiteSpace: "nowrap",
    flexShrink: "0",
    textDecoration: "none",
    "&:hover": { textDecoration: "none" },
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
            fontSize: "14px",
            fontWeight: "500",
            whiteSpace: "nowrap",
            lineHeight: "1",
          },
          "& a:hover, & a[aria-current='page']": {
            color: brand,
            textDecoration: "none",
          },
          "@media (max-width: 860px)": { display: "none" },
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
                        fontSize: "13px",
                        fontFamily: "inherit",
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
              fontSize: "16px",
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
              fontSize: "16px",
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
      fontSize: "11px",
      fontWeight: "700",
      lineHeight: "1.4",
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
          fontSize: "14px",
          padding: `0 ${ts(1)}`,
          lineHeight: "1",
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
        fontSize: "13px",
        fontWeight: "700",
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
            fontSize: "12px",
            color: textSoft,
            padding: `${ts(1)} ${ts(3)}`,
            fontWeight: "600",
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
      borderRight: `1px solid ${border}`,
      "& a": {
        display: "flex",
        alignItems: "center",
        gap: ts(1.5),
        padding: `${ts(1.25)} ${ts(3)}`,
        fontSize: "14px",
        color: textSoft,
        borderRadius: ts(1.5),
      },
      "& a:hover": { color: text, textDecoration: "none" },
      "& a[aria-current='page']": {
        color: brand,
        fontWeight: "600",
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
        style: { fontWeight: "700", marginBottom: ts(2), color: text },
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
            "&:hover": { color: brand, textDecoration: "none" },
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
      fontSize: "13px",
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
    fontWeight: "600",
    flex: "1",
    "&:hover": { borderColor: brand, textDecoration: "none" },
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
                  fontWeight: "400",
                  fontSize: "12px",
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
                  fontWeight: "400",
                  fontSize: "12px",
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
      style: { fontWeight: "500", fontSize: "13px" },
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
      fontSize: "13px",
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

function contentDiv(body: DomphyElement[]): DomphyElement {
  return {
    div: body,
    style: {
      maxWidth: contentMax,
      "& h1": {
        fontSize: "30px",
        fontWeight: "700",
        lineHeight: "1.25",
        margin: `0 0 ${ts(6)}`,
        letterSpacing: "-.02em",
        color: textStrong,
      },
      "& h2": {
        fontSize: "22px",
        fontWeight: "700",
        margin: `${ts(11)} 0 ${ts(4)}`,
        paddingTop: ts(5),
        borderTop: `1px solid ${border}`,
        letterSpacing: "-.01em",
        color: textStrong,
      },
      "& h3": {
        fontSize: "18px",
        fontWeight: "600",
        margin: `${ts(7)} 0 ${ts(3)}`,
        color: textStrong,
      },
      "& h4": {
        fontSize: "16px",
        fontWeight: "600",
        margin: `${ts(5.5)} 0 ${ts(2)}`,
        color: textStrong,
      },
      "& p": { margin: `${ts(4)} 0` },
      "& ul, & ol": { margin: `${ts(4)} 0`, paddingLeft: "1.4em" },
      "& li": { margin: `${ts(1.5)} 0` },
      "& a": { fontWeight: "500" },
      "& a[target='_blank']::after": {
        content: '" ↗"',
        fontSize: ".75em",
        opacity: ".6",
      },
      "& strong": { fontWeight: "600", color: textStrong },
      "& em": { fontStyle: "italic" },
      "& mark": {
        background: `color-mix(in srgb,${tc("shift-6", "warning")} 40%,${bg})`,
        color: "inherit",
        padding: `${ts(0.25)} ${ts(0.75)}`,
        borderRadius: ts(0.75),
      },
      "& sup": { fontSize: ".75em", verticalAlign: "super" },
      "& sub": { fontSize: ".75em", verticalAlign: "sub" },
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
        fontFamily: `ui-monospace,SFMono-Regular,"SF Mono",Menlo,monospace`,
        fontSize: ".85em",
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
        fontSize: "13.5px",
        lineHeight: "1.5",
      },
      "& pre code": {
        fontFamily: `ui-monospace,SFMono-Regular,"SF Mono",Menlo,monospace`,
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
      "& th, & td": {
        border: `1px solid ${border}`,
        padding: `${ts(2)} ${ts(3.5)}`,
        textAlign: "left",
      },
      "& th": { background: bgSoft, fontWeight: "600" },
    },
  } as DomphyElement;
}

// --- Shells -------------------------------------------------------------

export function pageShell(ctx: LayoutContext): DomphyElement {
  // layout: 'page' = no sidebar, no TOC, full-width content (same as VitePress)
  const layout =
    typeof ctx.frontmatter.layout === "string"
      ? ctx.frontmatter.layout
      : "doc";
  const showSidebar = layout === "doc" && ctx.frontmatter.sidebar !== false;

  const main: DomphyElement[] = [];
  const badge = pageBadge(ctx.frontmatter);
  if (badge)
    main.push({
      div: [badge],
      style: { marginBottom: ts(-2) },
    } as DomphyElement);
  main.push(contentDiv(ctx.body));
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

  const asideEl = layout !== "page" ? resolveSlot(ctx, "aside", tocAside) : null;
  const showAside = asideEl !== null && showSidebar;
  const shellChildren: DomphyElement[] = [
    ...(sidebarEl ? [sidebarEl] : []),
    { main, style: mainStyle },
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
          color: textSoft,
          fontSize: "13px",
        },
      } as DomphyElement);

  // Backdrop: covers screen on mobile when sidebar is open; click closes it
  const backdrop: DomphyElement = {
    div: [],
    class: "dp-sidebar-backdrop",
  } as unknown as DomphyElement;

  return {
    div: [
      ...(bar ? [bar] : []),
      ...(headerEl ? [headerEl] : []),
      backdrop,
      {
        div: shellChildren,
        style: {
          display: "grid",
          gridTemplateColumns: showSidebar
            ? showAside ? `${sidebarW} minmax(0,1fr) ${asideW}` : `${sidebarW} minmax(0,1fr)`
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
        fontSize: "56px",
        fontWeight: "800",
        lineHeight: "1.1",
        letterSpacing: "-.03em",
        background: `linear-gradient(120deg,${brand},${tc("shift-7", "secondary")})`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
      },
    } as DomphyElement);
  if (hero.text)
    textChildren.push({
      h1: hero.text,
      style: {
        fontSize: "30px",
        fontWeight: "700",
        margin: `${ts(3)} 0 0`,
        color: textStrong,
      },
    } as DomphyElement);
  if (hero.tagline)
    textChildren.push({
      p: hero.tagline,
      style: {
        fontSize: "18px",
        color: textSoft,
        maxWidth: hasImage ? "none" : ts(160),
        margin: hasImage ? `${ts(5)} 0 0` : `${ts(5)} auto 0`,
      },
    } as DomphyElement);
  if (hero.actions?.length) {
    const actionStyle = (theme?: string): Record<string, unknown> => {
      if (!theme || theme === "brand")
        return {
          padding: `${ts(2.5)} ${ts(5.5)}`,
          borderRadius: ts(5.5),
          fontWeight: "600",
          fontSize: "15px",
          background: brand,
          color: bg,
          "&:hover": { background: brandHover, textDecoration: "none" },
        };
      return {
        padding: `${ts(2.5)} ${ts(5.5)}`,
        borderRadius: ts(5.5),
        fontWeight: "600",
        fontSize: "15px",
        background: bgSoft,
        color: text,
        border: `1px solid ${border}`,
        "&:hover": { borderColor: brand, textDecoration: "none" },
      };
    };
    textChildren.push({
      div: hero.actions.map(
        (a) =>
          ({
            a: a.text,
            href: a.link,
            style: actionStyle(a.theme),
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

  if (!hasImage) {
    return {
      section: textChildren,
      style: { textAlign: "center", padding: `${ts(10)} 0 ${ts(6)}` },
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
            style: { display: "flex", flexDirection: "column", justifyContent: "center" },
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
            ? { div: f.icon, style: { fontSize: "28px", marginBottom: ts(3) } } as DomphyElement
            : { div: [f.icon], style: { marginBottom: ts(3) } } as DomphyElement,
        );
      }
      inner.push({
        div: f.title,
        style: {
          fontWeight: "700",
          fontSize: "17px",
          marginBottom: ts(2),
          color: textStrong,
        },
      } as DomphyElement);
      inner.push({
        p: f.details,
        style: {
          fontSize: "14px",
          color: textSoft,
          margin: "0",
          lineHeight: "1.5",
        },
      } as DomphyElement);
      const featureStyle = {
        padding: ts(5),
        background: bgSoft,
        border: `1px solid ${border}`,
        borderRadius: ts(3),
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
              "&:hover": { textDecoration: "none" },
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
  if (hero) main.push(heroSection(hero));
  if (features?.length) main.push(featuresSection(features));
  main.push(contentDiv(ctx.body));
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
          color: textSoft,
          fontSize: "13px",
        },
      } as DomphyElement);
  return {
    div: [
      ...(bar ? [bar] : []),
      ...(headerEl ? [headerEl] : []),
      {
        main,
        style: {
          maxWidth: "1100px",
          margin: "0 auto",
          padding: `${ts(12)} ${ts(6)} ${ts(20)}`,
        },
      },
      ...(footerContent ? [footerContent] : []),
    ],
  };
}
