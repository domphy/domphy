// Aceternity "Sidebar" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A dark,
// icon-only vertical rail fixed to the left edge that expands to show labels
// on hover, plus a bottom profile row. Below `mobileBreakpoint` the rail is
// replaced by a toggled overlay drawer.
//
// The upstream component shares open/expanded state via a React context so
// nested link/body pieces can read it without prop drilling. Domphy has no
// context primitive, but a `State<boolean>` threaded as a plain argument
// serves the identical purpose (any function holding a reference can read
// or write it) — the desktop rail and the mobile drawer below both close
// over the same `expandedState`/`mobileOpen` instances.

import type { DomphyElement, Listener, State, StyleObject, ValueOrState } from "@domphy/core";
import { toState } from "@domphy/core";
import { avatar, buttonGhost, drawer } from "@domphy/ui";
import { themeColor, themeDensity, themeSpacing } from "@domphy/theme";

export type HoverSidebarIconName = "home" | "dashboard" | "projects" | "messages" | "settings";

export interface HoverSidebarLink {
  label: string;
  icon: HoverSidebarIconName;
  href?: string;
  target?: string;
}

export interface HoverSidebarProfile {
  name: string;
  /** Image URL. When omitted, the avatar falls back to initials. */
  avatarSrc?: string;
}

export interface HoverSidebarProps {
  /** Nav link entries. Defaults to a 5-item demo set. */
  links?: HoverSidebarLink[];
  /** Expanded/open state, shared by the desktop rail and the mobile drawer. Pass your own `State` to control it externally. Defaults to false. */
  expanded?: ValueOrState<boolean>;
  /** Eases the width/label transition on hover when true; instant when false. Defaults to true. */
  animate?: boolean;
  /** Bottom profile row content. Defaults to a placeholder user. */
  profile?: HoverSidebarProfile;
  /** CSS media feature below which the hover-rail becomes a toggled overlay drawer. Defaults to "(max-width: 47.9375em)". */
  mobileBreakpoint?: string;
}

const COLLAPSED_WIDTH = themeSpacing(15);
const EXPANDED_WIDTH = themeSpacing(56);
const MOBILE_BREAKPOINT = "(max-width: 47.9375em)";

const DEFAULT_LINKS: HoverSidebarLink[] = [
  { label: "Home", icon: "home", href: "#" },
  { label: "Dashboard", icon: "dashboard", href: "#" },
  { label: "Projects", icon: "projects", href: "#" },
  { label: "Messages", icon: "messages", href: "#" },
  { label: "Settings", icon: "settings", href: "#" },
];

const DEFAULT_PROFILE: HoverSidebarProfile = { name: "Alex Rivera" };

// ---------------------------------------------------------------------------
// Hand-authored generic line icons (24x24, stroke=currentColor) — simple
// geometric silhouettes, not sourced from or tracing any icon library.
// ---------------------------------------------------------------------------

const ICON_SHAPES: Record<HoverSidebarIconName, DomphyElement[]> = {
  home: [
    { polyline: null, points: "4,12 12,5 20,12" },
    { rect: null, x: "6", y: "12", width: "12", height: "8" },
  ],
  dashboard: [
    { rect: null, x: "3", y: "3", width: "8", height: "8", rx: "1" },
    { rect: null, x: "13", y: "3", width: "8", height: "8", rx: "1" },
    { rect: null, x: "3", y: "13", width: "8", height: "8", rx: "1" },
    { rect: null, x: "13", y: "13", width: "8", height: "8", rx: "1" },
  ],
  projects: [{ path: null, d: "M4 7h6l2 3h8v9H4z" }],
  messages: [
    {
      path: null,
      d: "M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
    },
  ],
  settings: [
    { circle: null, cx: "12", cy: "12", r: "3" },
    { circle: null, cx: "12", cy: "12", r: "8" },
  ],
};

const MENU_SHAPE: DomphyElement[] = [
  { line: null, x1: "4", y1: "7", x2: "20", y2: "7" },
  { line: null, x1: "4", y1: "12", x2: "20", y2: "12" },
  { line: null, x1: "4", y1: "17", x2: "20", y2: "17" },
];

const CLOSE_SHAPE: DomphyElement[] = [
  { line: null, x1: "5", y1: "5", x2: "19", y2: "19" },
  { line: null, x1: "19", y1: "5", x2: "5", y2: "19" },
];

function rawGlyph(shape: DomphyElement[]): DomphyElement<"svg"> {
  return {
    svg: shape,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    role: "img",
    ariaHidden: "true",
    style: { width: "100%", height: "100%" },
  } as DomphyElement<"svg">;
}

function sidebarGlyph(name: HoverSidebarIconName): DomphyElement<"svg"> {
  return rawGlyph(ICON_SHAPES[name]);
}

function iconBox(glyph: DomphyElement<"svg">): DomphyElement<"span"> {
  return {
    span: [glyph],
    style: {
      display: "inline-flex",
      flexShrink: "0",
      width: themeSpacing(5),
      height: themeSpacing(5),
    },
  };
}

/** Label span that fades/collapses away in icon-rail mode. Visual only —
 * the anchor itself always carries `ariaLabel`, so the link's accessible
 * name never depends on the collapse state. */
function collapsibleLabel(expanded: State<boolean>, animate: boolean, text: string): DomphyElement<"span"> {
  return {
    span: text,
    ariaHidden: "true",
    style: {
      display: "inline-flex",
      overflow: "hidden",
      whiteSpace: "nowrap",
      opacity: (listener: Listener) => (expanded.get(listener) ? 1 : 0),
      maxWidth: (listener: Listener) => (expanded.get(listener) ? themeSpacing(40) : "0em"),
      transition: animate ? "opacity 200ms ease, max-width 200ms ease" : "none",
    },
  };
}

function sidebarLinkRow(
  link: HoverSidebarLink,
  expanded: State<boolean>,
  animate: boolean,
): DomphyElement<"li"> {
  return {
    li: [
      {
        a: [iconBox(sidebarGlyph(link.icon)), collapsibleLabel(expanded, animate, link.label)],
        href: link.href ?? "#",
        target: link.target,
        ariaLabel: link.label,
        style: {
          display: "flex",
          alignItems: "center",
          textDecoration: () => "none",
          gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
          paddingBlock: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
          paddingInline: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
          borderRadius: (listener: Listener) => themeSpacing(themeDensity(listener) * 1),
          color: (listener: Listener) => themeColor(listener, "shift-8"),
          "&:hover": {
            backgroundColor: (listener: Listener) => themeColor(listener, "increase-1"),
            color: (listener: Listener) => themeColor(listener, "shift-10"),
          },
        },
      } as DomphyElement<"a">,
    ],
    _key: link.label,
  };
}

function sidebarProfileRow(
  profile: HoverSidebarProfile,
  expanded: State<boolean>,
  animate: boolean,
): DomphyElement<"div"> {
  const avatarContent: DomphyElement[] | string = profile.avatarSrc
    ? [{ img: null, src: profile.avatarSrc, alt: "" } as DomphyElement<"img">]
    : profile.name.slice(0, 2).toUpperCase();

  return {
    div: [
      { span: avatarContent, $: [avatar({ color: "primary" })] } as DomphyElement<"span">,
      {
        span: profile.name,
        style: {
          display: "inline-flex",
          overflow: "hidden",
          whiteSpace: "nowrap",
          opacity: (listener: Listener) => (expanded.get(listener) ? 1 : 0),
          maxWidth: (listener: Listener) => (expanded.get(listener) ? themeSpacing(40) : "0em"),
          transition: animate ? "opacity 200ms ease, max-width 200ms ease" : "none",
          color: (listener: Listener) => themeColor(listener, "shift-9"),
        },
      } as DomphyElement<"span">,
    ],
    style: {
      display: "flex",
      alignItems: "center",
      marginTop: "auto",
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
      paddingBlock: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
      paddingInline: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
      borderTop: (listener: Listener) => `1px solid ${themeColor(listener, "shift-3")}`,
      color: (listener: Listener) => themeColor(listener, "shift-9"),
    },
  };
}

function linkListStyle(): Record<string, unknown> {
  return { listStyle: "none", margin: "0", padding: "0", display: "flex", flexDirection: "column" };
}

function hoverSidebarDesktopAside(
  links: HoverSidebarLink[],
  expandedState: State<boolean>,
  animate: boolean,
  profile: HoverSidebarProfile,
  mobileBreakpoint: string,
): DomphyElement<"aside"> {
  // `mobileBreakpoint` is a plain `string` prop (not a literal), so a
  // computed `@media ${mobileBreakpoint}` key inline in the object literal
  // below can't be *inferred* as matching `StyleObject`'s narrower
  // `` `@${string}` `` index signature — TypeScript always widens a
  // non-literal computed key to a generic `[x: string]` on the literal's
  // inferred type, which then fails structural comparison against the
  // pattern-specific target type. Building the static part as its own
  // literal (clean inference) and adding the dynamic media-query entry via
  // a separately-cast assignment sidesteps that inference limitation.
  const asideStyle: StyleObject = {
    // `position: relative` + `height: 100%` (not `fixed` + `insetBlock: 0`):
    // a `fixed` box is removed from flow entirely and positioned against the
    // real page viewport, which (a) contributes zero size to whatever
    // normal-flow container this is mounted inside — collapsing that
    // container's layout down to nothing wherever it isn't the literal
    // document root — and (b) renders wherever the real viewport's edge is,
    // disconnected from this element's actual mount point. Keeping the rail
    // in normal flow (sized by the `height: 100dvh` root wrapper below, the
    // same pattern `sidebar07`'s full-height app-shell root uses) gives it
    // real, capturable layout wherever it's mounted, while still visually
    // spanning the full available height.
    position: "relative",
    height: "100%",
    zIndex: 30,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    width: (listener: Listener) => (expandedState.get(listener) ? EXPANDED_WIDTH : COLLAPSED_WIDTH),
    paddingBlock: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
    transition: animate ? "width 250ms ease" : "none",
    backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
    color: (listener: Listener) => themeColor(listener, "shift-9"),
    borderInlineEnd: (listener: Listener) => `1px solid ${themeColor(listener, "shift-3")}`,
  };
  (asideStyle as Record<string, StyleObject>)[`@media ${mobileBreakpoint}`] = { display: "none" };

  return {
    aside: [
      {
        ul: links.map((link) => sidebarLinkRow(link, expandedState, animate)),
        style: { ...linkListStyle(), gap: themeSpacing(1) },
      } as DomphyElement<"ul">,
      sidebarProfileRow(profile, expandedState, animate),
    ],
    ariaLabel: "Primary navigation",
    dataTone: "shift-16",
    onMouseEnter: () => expandedState.set(true),
    onMouseLeave: () => expandedState.set(false),
    style: asideStyle,
  };
}

function hoverSidebarMobileToggle(
  mobileOpen: State<boolean>,
  mobileBreakpoint: string,
): DomphyElement<"button"> {
  // See the matching comment in `hoverSidebarDesktopAside`.
  const toggleStyle: StyleObject = {
    display: "none",
    position: "fixed",
    top: themeSpacing(3),
    insetInlineStart: themeSpacing(3),
    zIndex: 35,
  };
  (toggleStyle as Record<string, StyleObject>)[`@media ${mobileBreakpoint}`] = { display: "inline-flex" };

  return {
    button: [iconBox(rawGlyph(MENU_SHAPE))],
    ariaLabel: "Open navigation menu",
    onClick: () => mobileOpen.set(true),
    $: [buttonGhost()],
    style: toggleStyle,
  };
}

function hoverSidebarMobileDrawer(
  links: HoverSidebarLink[],
  mobileOpen: State<boolean>,
  profile: HoverSidebarProfile,
): DomphyElement<"dialog"> {
  // The mobile drawer always renders fully expanded — there is no icon-rail
  // mode once the sidebar has already collapsed into an overlay sheet.
  const alwaysExpanded = toState(true);

  return {
    dialog: [
      {
        button: [iconBox(rawGlyph(CLOSE_SHAPE))],
        ariaLabel: "Close navigation menu",
        onClick: () => mobileOpen.set(false),
        $: [buttonGhost()],
        style: { alignSelf: "flex-end" },
      } as DomphyElement<"button">,
      {
        ul: links.map((link) => sidebarLinkRow(link, alwaysExpanded, false)),
        style: { ...linkListStyle(), gap: themeSpacing(1) },
      } as DomphyElement<"ul">,
      sidebarProfileRow(profile, alwaysExpanded, false),
    ],
    dataTone: "shift-16",
    $: [drawer({ open: mobileOpen, placement: "start", size: EXPANDED_WIDTH })],
    style: {
      display: "flex",
      flexDirection: "column",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
    },
  };
}

/**
 * A dark, icon-only vertical navigation rail fixed to the left edge that
 * expands on hover (desktop) or becomes a toggled overlay drawer (mobile).
 * Call with no arguments for a working 5-link demo with a profile footer.
 */
function hoverSidebar(props: HoverSidebarProps = {}): DomphyElement<"div"> {
  const links = props.links ?? DEFAULT_LINKS;
  const animate = props.animate ?? true;
  const profile = props.profile ?? DEFAULT_PROFILE;
  const mobileBreakpoint = props.mobileBreakpoint ?? MOBILE_BREAKPOINT;
  const expandedState = toState(props.expanded ?? false);
  const mobileOpen = toState(false);

  return {
    div: [
      hoverSidebarDesktopAside(links, expandedState, animate, profile, mobileBreakpoint),
      hoverSidebarMobileToggle(mobileOpen, mobileBreakpoint),
      hoverSidebarMobileDrawer(links, mobileOpen, profile),
    ],
    // `height: 100dvh` (matching `sidebar07`'s full-height app-shell root)
    // gives the rail's `height: 100%` a real, non-auto parent height to
    // resolve against, instead of `display: contents` (which generates no
    // box at all and left the fixed-positioned rail with no in-flow parent
    // to size against).
    style: { position: "relative", display: "flex", height: "100dvh" },
  };
}

export { hoverSidebar };
