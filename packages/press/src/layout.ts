// Page shell: header, sidebar, content, TOC aside, prev/next, footer.
// CSS comes entirely from inline style:{} objects so generateCSS() is the
// single source of truth — no hand-written class-targeted CSS strings.

import { navLink } from "@domphy/app";
import type { DomphyElement, StyleObject } from "@domphy/core";
import { rawHtml } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";
import { linkButton, small, strong, toolbar, toolbarSpacer } from "@domphy/ui";
import {
  prevNextForRoute,
  sidebarForRoute,
  withBase,
} from "./routes-browser.js";
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
// fontSize onto the nearest token would visibly change every press site, and
// markdown emits bare <h2>/<code>/<th> with no call site to attach a
// typography patch to.
//
// This wrapper used to double as a doctor marker: `inline-typography` skipped
// function values, so declaring typography through a function meant "not a
// token, on purpose". Doctor now resolves reactive values and flags the literal
// behind them, so the marker no longer carries that meaning and every element
// that declares typography through `fixed()` states it itself, with
// `_doctorDisable: "inline-typography"`. This comment is the reason for all of
// them; the sites do not repeat it.
//
// MEASURED — why the theme scale cannot express this one (diagnose() over
// pageShell + homeShell with every themeConfig feature enabled: 48 warnings
// across 25 elements, all of them typography literals; a bare context renders
// fewer elements, which is why any single count quoted without its fixture is
// meaningless):
//   - The scale is 12 / 14 / 16 / 20 / 25 / 31 / 39 / 49 px at a 16px root.
//     The literals here are 10, 11, 12, 13, 13.5, 14, 14.5, 17, 18, 28, 30, 56
//     and two clamp() ramps. Only 12px and 14px land on a token.
//   - `themeSize()` covers fontSize only. There is no theme token for
//     fontWeight (500/600/700/800) or letterSpacing (-.01/-.02/-.03em), so
//     those elements would keep the warning even after a fontSize swap.
//   - The generated stylesheet in theme.ts carries ~100 more px values for the
//     same scale (12px, 13px, 13.5px, 14.5px, .85em…) as raw CSS text doctor
//     cannot see. Routing the 2-3 coincidental matches through a token would
//     make those elements follow a site's `fontSizes` override while the other
//     ~120 declarations stayed put — one scale silently becoming two.
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
// Tone floors are measured, not chosen by eye (built-in theme, axe-core 4.12
// on the sample site): on the page surface shift-9 = 4.61:1 (AA) while
// shift-8 = 4.12:1 and shift-6 = 2.77:1 both fail. On a shift-1 surface
// shift-9 drops to 4.23:1, so tinted chrome (code title bars, table headers,
// feature cards, admonitions) needs shift-10 = 5.13:1. Essential UI chrome —
// nav items, TOC links, prev/next labels — therefore uses `text`, never a
// softer tone (see AGENTS.md "Contrast contract").
const text = tc("shift-9");
// Body tone for text sitting on a shift-1 tinted surface.
const textOnTint = tc("shift-10");
const textStrong = tc("shift-11");
const brand = tc("shift-9", "primary");
// Brand text on a tinted (shift-1/shift-2) surface: primary-9 measures
// 4.87:1 on shift-1 light but only 4.12:1 on shift-2 light and 3.85:1 on
// shift-2 dark; primary-10 clears AA on both (same reason as theme.ts).
const brandOnTint = tc("shift-10", "primary");
// …and shift-11 for the shift-2 surfaces (hovered panel row, tinted bars).
const brandOnBar = tc("shift-11", "primary");

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
    _doctorDisable: "inline-typography",
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: ts(8.5),
      height: ts(8.5),
      borderRadius: ts(2),
      color: textOnTint,
      background: bgSoft,
      border: `1px solid ${border}`,
      fontSize: fixed("10px"),
      fontWeight: fixed("700"),
      flexShrink: "0",
      "&:hover": {
        color: textStrong,
        borderColor: text,
        textDecoration: fixed("none"),
      },
    },
  } as DomphyElement;
}

// --- Page link helper ---------------------------------------------------

// The emitted href is base-prefixed (non-root deployments); navLink keeps the
// base-LESS route href — its SSR aria-current matching compares against the
// router pathname, which is base-less. The native href wins over the patch's
// (mergePartial "native win"), so the DOM emits the prefixed one.
function pageLink(text: string, href: string, base: string): DomphyElement {
  return {
    a: text,
    href: withBase(base, href),
    $: [navLink({ href, exact: true })],
  } as DomphyElement;
}

// --- Nav dropdown -------------------------------------------------------

function navDropdown(
  item: {
    text: string;
    items: { text: string; link: string }[];
  },
  base: string,
): DomphyElement {
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
    // `:any-link` bumps specificity past the header nav's own `& a` colour
    // rule so panel links get the shift-1-surface tone regardless of the
    // order the two scoped rules land in the generated stylesheet.
    "& a:any-link": {
      display: "block",
      padding: `${ts(1.25)} ${ts(2.5)}`,
      borderRadius: ts(1.25),
      fontSize: fixed("13px"),
      color: textOnTint,
    },
    "& a:any-link:hover, & a:any-link[aria-current='page']": {
      background: bgMute,
      color: brandOnBar,
    },
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
        // A <button>, not a <span>: the panel is revealed by :focus-within, so
        // the trigger MUST be focusable or the whole submenu is unreachable by
        // keyboard (its links are display:none, hence not tabbable either).
        // Same mechanism as VitePress's VPFlyout. RUNTIME_SCRIPT mirrors the
        // hover/focus state onto aria-expanded.
        button: item.text,
        type: "button",
        ariaExpanded: "false",
        ariaHaspopup: "true",
        _doctorDisable: "inline-typography",
        style: {
          color: text,
          background: "none",
          border: "none",
          padding: "0",
          fontFamily: fixed("inherit"),
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
        div: item.items.map((child) => pageLink(child.text, child.link, base)),
        style: menuStyle,
      },
    ],
    dataNavDropdown: "",
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
  const children: DomphyElement[] = [
    { span: rawHtml(bar.text) } as DomphyElement,
  ];
  if (bar.dismissible !== false) {
    children.push({
      button: "✕",
      type: "button",
      dataDismissAnnouncement: "",
      ariaLabel: "Dismiss",
      _doctorDisable: "inline-typography",
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
    // <aside>, not <div>: it sits outside header/main/footer, so as a plain
    // div its text belongs to no landmark (axe `region`, moderate).
    aside: children,
    ariaLabel: "Announcement",
    class: "dp-announcement", // kept: JS uses querySelector('.dp-announcement')
    ...(idAttr ? { dataId: idAttr } : {}),
    _doctorDisable: "inline-typography",
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

function localePrefix(key: string): string {
  return key.replace(/\/$/, "");
}

// Segment-boundary match: "/vi" must not claim "/video".
function routeBelongsToLocale(route: string, key: string): boolean {
  if (key === "/") return false;
  const prefix = localePrefix(key);
  return route === prefix || route.startsWith(`${prefix}/`);
}

function localeSwitcher(ctx: LayoutContext): DomphyElement | null {
  const { config, route } = ctx;
  if (!config.locales) return null;
  const entries = Object.entries(config.locales);
  if (entries.length <= 1) return null;

  let currentKey = "/";
  let barePath = route;
  // Longest prefix first so /zh-CN wins over /zh.
  const prefixed = entries
    .filter(([key]) => key !== "/")
    .sort((a, b) => localePrefix(b[0]).length - localePrefix(a[0]).length);
  for (const [key] of prefixed) {
    if (routeBelongsToLocale(route, key)) {
      currentKey = key;
      const prefix = localePrefix(key);
      barePath = route === prefix ? "/" : route.slice(prefix.length) || "/";
      break;
    }
  }
  const currentLocale = config.locales[currentKey];
  if (!currentLocale) return null;

  const links: DomphyElement[] = entries.map(([key, locale]) => {
    const prefix = key === "/" ? "" : key.replace(/\/$/, "");
    const href = withBase(
      config.base,
      prefix + (barePath === "/" ? "/" : barePath),
    );
    const isActive = key === currentKey;
    return {
      a: locale.label,
      href,
      ...(isActive ? { ariaCurrent: "true" } : {}),
      lang: locale.lang,
      _doctorDisable: "inline-typography",
      style: {
        display: "block",
        padding: `${ts(1.25)} ${ts(2.5)}`,
        borderRadius: ts(1.25),
        fontSize: fixed("13px"),
        // The panel sits on a shift-1 surface — see textOnTint/brandOnTint.
        color: textOnTint,
        ...(isActive ? { color: brandOnTint, fontWeight: fixed("600") } : {}),
        "&:hover": {
          background: bgMute,
          color: textStrong,
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
        // Focusable trigger — see navDropdown: the panel opens on
        // :focus-within, which a <span> can never satisfy.
        button: ["🌐 ", currentLocale.label],
        type: "button",
        ariaExpanded: "false",
        ariaHaspopup: "true",
        ariaLabel: `Select language, current ${currentLocale.label}`,
        _doctorDisable: "inline-typography",
        style: {
          color: textOnTint,
          fontFamily: fixed("inherit"),
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
    dataNavDropdown: "",
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
    // A long site title must give way rather than push the toolbar past the
    // viewport edge (measured: 375px header scrollWidth 425px before this).
    "@media (max-width: 860px)": {
      flexShrink: "1",
      minWidth: "0",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
  };
  const logoEl: DomphyElement = logo
    ? ({
        a: logoInner,
        href: config.base,
        _doctorDisable: "inline-typography",
        style: logoStyle,
      } as DomphyElement)
    : ({
        a: config.title,
        href: config.base,
        _doctorDisable: "inline-typography",
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
                config.base,
              )
            : pageLink(item.text, item.link!, config.base),
        ),
        $: [toolbar({ gap: 4 })],
        ariaLabel: "Primary",
        id: "dp-primary-nav",
        style: {
          "& a": {
            color: text,
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
                // --dp-drawer-top is written by RUNTIME_SCRIPT from the live
                // header bottom edge: with an announcement bar above it the
                // header sits lower than headerH and a fixed `top: headerH`
                // drawer covers it (reproduced at 375px with a bar present).
                top: `var(--dp-drawer-top, ${headerH})`,
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
                      _doctorDisable: "inline-typography",
                      style: {
                        width: "100%",
                        height: ts(8),
                        padding: `0 ${ts(2.5)}`,
                        border: `1px solid ${border}`,
                        borderRadius: ts(1.5),
                        background: bgSoft,
                        color: textOnTint,
                        fontSize: fixed("13px"),
                        fontFamily: fixed("inherit"),
                        outline: "none",
                        cursor: "pointer",
                        // Placeholder text is text under WCAG 1.4.3. On this
                        // shift-1 tinted field shift-7 measured 2.84:1 light /
                        // 3.33:1 dark, and shift-9 is still only 4.23:1 light;
                        // shift-10 (the field's own textOnTint) is the first
                        // tone that clears 4.5 on both — 5.13:1 / 6.03:1.
                        //
                        // Matching the field's text tone (rather than sitting a
                        // step below it, as the `inputSearch()` patch does) is
                        // correct here: this input is pre-hydration chrome for
                        // the `search` island, which swaps in the real
                        // `searchWidget()` field. It never holds a typed value,
                        // so its placeholder IS its label.
                        "&::placeholder": { color: textOnTint },
                      },
                    },
                  ],
                  dataIsland: "search",
                  style: {
                    width: ts(50),
                    // Phone widths: give up width rather than push the
                    // toolbar off-screen. ts(20) keeps the field usable.
                    "@media (max-width: 860px)": {
                      width: "auto",
                      flex: `1 1 ${ts(35)}`,
                      minWidth: ts(20),
                    },
                  },
                } as DomphyElement,
              ]
            : []),
          ...socialEls,
          ...(localeEl ? [localeEl] : []),
          {
            // Icons via .dp-theme-toggle-icon / .dp-menu-toggle-icon in pressCSS
            // (not "◐"/"☰" glyphs — inconsistent, look like placeholders).
            button: [
              {
                span: null,
                class: "dp-theme-toggle-icon",
                ariaHidden: "true",
              },
            ],
            type: "button",
            ariaLabel: "Toggle dark mode",
            // Toggle button state (WAI-ARIA APG button pattern); RUNTIME_SCRIPT
            // flips it together with html[data-theme].
            ariaPressed: "false",
            dataThemeToggle: "",
            style: {
              border: `1px solid ${border}`,
              background: bgSoft,
              color: text,
              borderRadius: ts(2),
              width: ts(8.5),
              height: ts(8.5),
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: "0",
              padding: "0",
              "&:hover": { background: bgMute },
            },
          },
          {
            button: [
              {
                span: null,
                class: "dp-menu-toggle-icon",
                ariaHidden: "true",
              },
            ],
            type: "button",
            ariaLabel: "Toggle menu",
            // Disclosure pattern: the drawer it controls is the docs sidebar
            // nav (or the Primary nav on pages without one).
            ariaExpanded: "false",
            ariaControls: showSidebar ? "dp-sidebar-nav" : "dp-primary-nav",
            dataMenuToggle: "",
            style: {
              border: `1px solid ${border}`,
              background: bgSoft,
              color: text,
              borderRadius: ts(2),
              width: ts(8.5),
              height: ts(8.5),
              cursor: "pointer",
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: "0",
              padding: "0",
              "&:hover": { background: bgMute },
              "@media (max-width: 860px)": { display: "inline-flex" },
            },
          },
        ],
        $: [toolbar({ gap: 2 })],
        style: {
          flexShrink: "0",
          // The search field inside is what absorbs the shrink (see above).
          "@media (max-width: 860px)": { flexShrink: "1", minWidth: "0" },
        },
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
  // shift-10, not shift-9: the badge paints a 12% tint of its own family over
  // the page surface, and shift-9 lands at 4.08–4.2:1 there in dark
  // (axe-core on the sample site). shift-10 clears AA on both themes.
  const colorMap: Record<string, string> = {
    tip: brandOnTint,
    info: textOnTint,
    warning: tc("shift-10", "warning"),
    danger: tc("shift-10", "danger"),
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
    _doctorDisable: "inline-typography",
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
      color: colorMap[type] ?? textOnTint,
    },
  } as DomphyElement;
}

// --- Sidebar ------------------------------------------------------------

function pageLinkWithBadge(
  text: string,
  href: string,
  base: string,
  badge?: SidebarItem["badge"],
): DomphyElement {
  if (!badge) {
    return pageLink(text, href, base);
  }
  return {
    a: [{ span: text }, badgeEl(badge)],
    href: withBase(base, href),
    $: [navLink({ href, exact: true })],
    style: { display: "flex", alignItems: "center" },
  } as DomphyElement;
}

function sidebarGroup(group: SidebarItem, base: string): DomphyElement {
  const children: DomphyElement[] = [];
  const isCollapsible = group.items && group.items.length > 0;

  if (group.link) {
    children.push(pageLinkWithBadge(group.text, group.link, base, group.badge));
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
        // Disclosure state for the group's link list — RUNTIME_SCRIPT keeps
        // it in sync with the `collapsed` class (incl. the restored state).
        ariaExpanded: group.collapsed ? "false" : "true",
        dataSidebarToggle: "",
        _doctorDisable: "inline-typography",
        style: {
          marginLeft: "auto",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: text,
          fontSize: fixed("14px"),
          padding: `0 ${ts(1)}`,
          lineHeight: fixed("1"),
          "&:hover": { color: text },
        },
      } as DomphyElement);
    }
    children.push({
      div: titleChildren,
      _doctorDisable: "inline-typography",
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
          _doctorDisable: "inline-typography",
          style: {
            fontSize: fixed("12px"),
            color: text,
            padding: `${ts(1)} ${ts(3)}`,
            fontWeight: fixed("600"),
          },
        } as DomphyElement);
        for (const leaf of item.items) {
          if (leaf.link)
            itemsEl.push(
              pageLinkWithBadge(leaf.text, leaf.link, base, leaf.badge),
            );
        }
      } else if (item.link) {
        itemsEl.push(pageLinkWithBadge(item.text, item.link, base, item.badge));
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

// Top-level site nav, flattened into the mobile drawer. On a doc page the
// header's Primary nav is display:none below 860px, and the drawer is the only
// panel that opens — without this copy the site nav is simply unreachable on a
// phone (VitePress/Starlight/Docusaurus all surface it in the mobile menu).
// Hidden above 860px, where the header nav is the real one.
function mobileSiteNav(ctx: LayoutContext): DomphyElement | null {
  const items = ctx.config.themeConfig.nav;
  if (items.length === 0) return null;
  const base = ctx.config.base;
  const children: DomphyElement[] = [];
  for (const item of items) {
    if (item.items) {
      children.push({
        div: item.text,
        _doctorDisable: "inline-typography",
        style: {
          fontSize: fixed("12px"),
          color: text,
          padding: `${ts(1)} ${ts(3)}`,
          fontWeight: fixed("600"),
        },
      } as DomphyElement);
      for (const child of item.items)
        children.push(pageLink(child.text, child.link, base));
    } else if (item.link) {
      children.push(pageLink(item.text, item.link, base));
    }
  }
  return {
    div: children,
    style: {
      display: "none",
      flexDirection: "column",
      paddingBottom: ts(3),
      marginBottom: ts(3),
      borderBottom: `1px solid ${border}`,
      color: text,
      "@media (max-width: 860px)": { display: "flex" },
    },
  } as DomphyElement;
}

function sidebar(ctx: LayoutContext): DomphyElement {
  const groups = sidebarForRoute(ctx.route, ctx.config);
  const siteNav = mobileSiteNav(ctx);
  return {
    nav: [
      ...(siteNav ? [siteNav] : []),
      ...groups.map((group) => sidebarGroup(group, ctx.config.base)),
    ],
    ariaLabel: "Documentation", // used as stable selector in pressCSS mobile-open rule
    id: "dp-sidebar-nav",
    style: {
      position: "sticky",
      top: headerH,
      // Fixed height (not maxHeight): the column divider borderRight must
      // reach the viewport bottom even when the nav has few items — a border
      // that stops at the last link reads as a rendering glitch.
      height: `calc(100vh - ${headerH})`,
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
      // brandOnTint, not brand: the hovered/active row paints a shift-1
      // background under the label (primary-9 measures 4.34:1 there in dark).
      "& a:hover": {
        color: brandOnTint,
        textDecoration: fixed("none"),
        background: bgSoft,
      },
      "& a[aria-current='page']": {
        color: brandOnTint,
        fontWeight: fixed("600"),
        background: bgSoft,
      },
      "@media (max-width: 860px)": {
        position: "fixed",
        // See the Primary nav drawer — announcement bar offsets the header.
        top: `var(--dp-drawer-top, ${headerH})`,
        left: "0",
        bottom: "0",
        width: "80%",
        maxWidth: ts(80),
        background: bg,
        zIndex: "25",
        transform: "translateX(-100%)",
        transition: "transform .2s ease",
        // Drawer box is defined by top+bottom, not the desktop height.
        height: "auto",
      },
    },
  };
}

// --- TOC aside ----------------------------------------------------------

/** Below this width the shell grid has no aside column (sidebar + content
 *  only), so the aside hides with it. */
const ASIDE_COLUMN_MEDIA = "@media (max-width: 1200px)";

function tocAside(ctx: LayoutContext): DomphyElement | null {
  if (ctx.frontmatter.aside === false) return null;
  const [minLevel, maxLevel] = ctx.config.themeConfig.outline?.level ?? [2, 3];
  const entries = ctx.toc.filter(
    (e) => e.level >= minLevel && e.level <= maxLevel,
  );
  if (entries.length === 0) return null;
  const tocTitle = ctx.config.themeConfig.tocTitle ?? "On this page";

  // Base left padding keeps the active border from sitting flush against the
  // label; nested levels add indent on top of that base (never zero).
  const basePad = ts(3);
  const indentMap: Record<number, string> = {
    2: basePad,
    3: `calc(${basePad} + ${ts(3)})`,
    4: `calc(${basePad} + ${ts(6)})`,
  };
  return {
    aside: [
      {
        div: tocTitle,
        _doctorDisable: "inline-typography",
        style: { fontWeight: fixed("700"), marginBottom: ts(2), color: text },
      },
      {
        // class dp-toc: RUNTIME_SCRIPT scroll-spy sets aria-current on the
        // active heading link (click + scroll). Do not remove without updating
        // build.ts's RUNTIME_SCRIPT.
        nav: entries.map((e) => ({
          a: e.text,
          href: `#${e.slug}`,
          _doctorDisable: "inline-typography",
          style: {
            display: "block",
            padding: `${ts(0.75)} 0`,
            color: text,
            paddingLeft: indentMap[e.level] ?? basePad,
            borderLeft: fixed("2px solid transparent"),
            marginLeft: fixed("-2px"),
            "&:hover": { color: brand, textDecoration: fixed("none") },
            // location = in-page TOC active section (not route aria-current=page)
            "&[aria-current='true']": {
              color: brand,
              fontWeight: fixed("600"),
              borderLeftColor: brand,
            },
          },
        })),
        class: "dp-toc",
        ariaLabel: tocTitle,
      },
    ],
    _doctorDisable: "inline-typography",
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
  const base = ctx.config.base;
  const linkStyle = style({
    display: "block",
    padding: `${ts(3)} ${ts(4)}`,
    border: `1px solid ${border}`,
    borderRadius: ts(2),
    // `color` as well as `border`: without it the link text does not
    // re-resolve when an ancestor shifts the tone context (doctor
    // `missing-color`).
    color: text,
    flex: "1",
    "&:hover": { borderColor: brand, textDecoration: fixed("none") },
  });
  return {
    nav: [
      prev
        ? {
            a: [
              // small(): the patch owns the size and the shift-10 tone that
              // keeps sub-body type above 4.5:1. A host `style.color` or an
              // inline fontSize here would outrank it (native beats patch) —
              // only layout belongs in `style`.
              {
                small: "Previous",
                $: [small()],
                style: { display: "block" },
              },
              { strong: prev.text, $: [strong()] },
            ],
            href: withBase(base, prev.link),
            style: linkStyle,
          }
        : // Keeps the remaining link on its own half instead of letting it
          // stretch across the full row (VitePress does the same).
          { span: "", style: { flex: "1" } },
      next
        ? {
            a: [
              {
                small: "Next",
                $: [small()],
                style: { display: "block" },
              },
              { strong: next.text, $: [strong()] },
            ],
            href: withBase(base, next.link),
            style: { ...linkStyle, textAlign: "right" },
          }
        : { span: "", style: { flex: "1" } },
    ],
    ariaLabel: "Page navigation",
    style: {
      display: "flex",
      justifyContent: "space-between",
      gap: ts(4),
      marginTop: ts(12),
      paddingTop: ts(6),
      borderTop: `1px solid ${border}`,
      color: text,
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
      _doctorDisable: "inline-typography",
      style: { fontWeight: fixed("500"), fontSize: fixed("13px") },
    } as DomphyElement);
  }
  return {
    div: children,
    _doctorDisable: "inline-typography",
    style: {
      display: "flex",
      alignItems: "center",
      gap: ts(4),
      flexWrap: "wrap",
      marginTop: ts(8),
      paddingTop: ts(5),
      borderTop: `1px solid ${border}`,
      fontSize: fixed("13px"),
      color: text,
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
      // Inherited: a long unbroken token (a URL, a package specifier, a hash)
      // otherwise widens the single mobile grid column and scrolls the whole
      // page sideways — measured 508px of scrollWidth at a 375px viewport.
      // VitePress applies the same on .vp-doc.
      overflowWrap: "break-word",
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
        // Explicit, not inherit: the 40% warning tint is dark enough that the
        // inherited body tone measures 3.42:1 on it (axe-core).
        color: textStrong,
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
        color: text,
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
        // shift-1 (not shift-2) + shift-10: the body tone on a shift-2 chip
        // measured 3.57:1; this pair measures 5.13:1 on both themes.
        background: bgSoft,
        color: textOnTint,
        padding: `${ts(0.75)} ${ts(1.5)}`,
        borderRadius: ts(1),
        border: `1px solid ${border}`,
      },
      "& pre": {
        margin: `${ts(4)} 0`,
        padding: `${ts(4)} ${ts(5)}`,
        // Same surface as `.code-block pre` in pressCSS — the two selectors
        // have equal specificity, so they must agree or the winner depends on
        // stylesheet order. See the contrast note there.
        background: bg,
        color: text,
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
      // The wrapper the markdown walker emits is the scroll container — it
      // carries role=region + a name + tabindex=0 so the horizontal scroll is
      // keyboard-reachable and announced (axe `scrollable-region-focusable`).
      // The old rule put `display:block; overflow-x:auto` on the <table>
      // itself, which made the table the scroll container AND dropped its
      // table semantics in screen readers that key off the display type.
      "& .dp-table-scroll": {
        margin: `${ts(4)} 0`,
        overflowX: "auto",
        maxWidth: "100%",
      },
      "& .dp-table-scroll:focus-visible": {
        outline: `2px solid ${brand}`,
        outlineOffset: "2px",
      },
      "& table": {
        borderCollapse: "collapse",
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
        color: textOnTint,
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

  // `wide: true` drops the 1440px shell cap for pages whose content is a wide
  // artifact — a generated diagram, a broad table — rather than prose. It is
  // deliberately orthogonal to `layout`: a wide page usually still wants the
  // nav sidebar, which `layout: 'page'` would remove. Without this the only
  // way to show something wider than the cap is to let it overflow into a
  // horizontal scrollbar, which is not reading, it is peeking.
  const wide = ctx.frontmatter.wide === true;

  const main: DomphyElement[] = [];
  const badge = pageBadge(ctx.frontmatter);
  if (badge)
    main.push({
      div: [badge],
      style: { marginBottom: ts(-2) },
    } as DomphyElement);
  // With the aside column hidden (frontmatter `aside: false` or no TOC), let
  // the content span the freed-up grid space instead of capping at prose width.
  // A `wide` page uncaps unconditionally — including with the sidebar hidden,
  // where the no-sidebar branch otherwise assumes prose (home, playground).
  main.push(
    contentDiv(
      ctx.body,
      wide || (!showAside && showSidebar) ? "none" : undefined,
    ),
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
        maxWidth: wide || layout === "page" ? "100%" : contentMax,
        margin: "0 auto",
        "@media (max-width: 860px)": { padding: `${ts(6)} ${ts(5)} ${ts(16)}` },
      };
  const shellChildren: DomphyElement[] = [
    ...(sidebarEl ? [sidebarEl] : []),
    { main, id: "main-content", tabindex: -1, style: mainStyle },
  ];
  // The grid drops the aside column at ASIDE_COLUMN_MEDIA; an aside still
  // mounted there would wrap into a new row below the whole page, so it hides
  // with its column.
  if (showAside)
    shellChildren.push({
      ...asideEl!,
      style: {
        ...((asideEl!.style as Record<string, unknown> | undefined) ?? {}),
        [ASIDE_COLUMN_MEDIA]: { display: "none" },
      },
    } as DomphyElement);

  const headerEl = resolveSlot(ctx, "header", header);
  const bar = announcementBar(ctx.config);
  const slots = ctx.config.themeConfig.slots;
  const footerContent = slots?.footer
    ? slots.footer(ctx)
    : ({
        footer: rawHtml(ctx.config.themeConfig.footerMessage ?? ""),
        _doctorDisable: "inline-typography",
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
            : "minmax(0,1fr)",
          alignItems: "start",
          maxWidth: wide ? "none" : "1440px",
          margin: "0 auto",
          [ASIDE_COLUMN_MEDIA]: showSidebar
            ? { gridTemplateColumns: `${sidebarW} minmax(0,1fr)` }
            : {},
          // minmax(0,1fr), not bare 1fr: a bare 1fr is minmax(auto,1fr),
          // which floors the single mobile column at the content's
          // min-content width — any page with a wide unbreakable subtree
          // (e.g. the playground's CodeMirror scroller, white-space:pre)
          // blows out the viewport horizontally on ≤860px (found by
          // visual:responsive playground @ mobile-375).
          "@media (max-width: 860px)": { gridTemplateColumns: "minmax(0,1fr)" },
        },
      },
      ...(footerContent ? [footerContent] : []),
    ],
  };
}

export interface HeroConfig {
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

function heroSection(hero: HeroConfig, base: string): DomphyElement {
  const hasImage = Boolean(hero.image);
  const imageSrc =
    typeof hero.image === "string" ? hero.image : hero.image?.src;
  const imageAlt =
    typeof hero.image === "object" ? (hero.image?.alt ?? "") : "";

  const textChildren: DomphyElement[] = [];
  if (hero.name)
    textChildren.push({
      div: hero.name,
      _doctorDisable: "inline-typography",
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
      _doctorDisable: "inline-typography",
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
      _doctorDisable: "inline-typography",
      style: {
        fontSize: fixed("18px"),
        color: text,
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
            href: withBase(base, a.link),
            $: [
              linkButton({
                color: !a.theme || a.theme === "brand" ? "primary" : "neutral",
                // Brand CTAs read as filled primary; secondary stays outline.
                variant: !a.theme || a.theme === "brand" ? "solid" : "outline",
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
      _doctorDisable: "inline-typography",
      style: {
        display: "inline-flex",
        gap: ts(2),
        alignSelf: "center",
        marginTop: ts(6),
        padding: `${ts(2)} ${ts(4.5)}`,
        borderRadius: ts(2),
        border: `1px solid ${border}`,
        background: bgSoft,
        color: textOnTint,
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

function featuresSection(
  features: FeatureConfig[],
  base: string,
): DomphyElement {
  return {
    div: features.map((f) => {
      const inner: DomphyElement[] = [];
      if (f.icon) {
        inner.push(
          typeof f.icon === "string"
            ? ({
                div: f.icon,
                _doctorDisable: "inline-typography",
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
        _doctorDisable: "inline-typography",
        style: {
          fontWeight: fixed("700"),
          fontSize: fixed("17px"),
          marginBottom: ts(2),
          color: textStrong,
        },
      } as DomphyElement);
      inner.push({
        p: f.details,
        _doctorDisable: "inline-typography",
        style: {
          fontSize: fixed("14px"),
          // Card surface is shift-1 — see textOnTint.
          color: textOnTint,
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
            href: withBase(base, f.link),
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
    if (hero) blocks.push(heroSection(hero, ctx.config.base));
    if (features?.length)
      blocks.push(featuresSection(features, ctx.config.base));
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
        footer: rawHtml(ctx.config.themeConfig.footerMessage ?? ""),
        _doctorDisable: "inline-typography",
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
