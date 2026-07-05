// Shared building blocks for the shadcn "sidebar" block family
// (sidebar01 / sidebar02 / sidebar03 / sidebar04). Not itself an exported
// block — every exported factory in this file group composes these helpers
// into its own fixed, literal element tree.
//
// Note: `shared.ts` in this same folder belongs to a different sidebar batch
// (sidebar05+) — this file is intentionally separate so the two batches never
// collide on the same module.
//
// Clean-room note: this is an independent reimplementation of the public
// *behavior* described in the block spec (docked/floating app sidebar with
// collapsible navigation). Layout, icon artwork and code are original.

import type { DomphyElement, Listener, State } from "@domphy/core";
import { toState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import {
  avatar,
  breadcrumb,
  buttonGhost,
  details,
  drawer,
  icon,
  inputSearch,
  list,
  listItemButton,
  menu,
  popover,
  scrollArea,
  skeleton,
  small,
  toolbar,
  toolbarSpacer,
} from "@domphy/ui";

// ---------------------------------------------------------------------------
// Data shapes
// ---------------------------------------------------------------------------

export interface SidebarNavChild {
  label: string;
  href?: string;
  active?: boolean;
}

export interface SidebarNavItem {
  label: string;
  iconName?: IconName;
  href?: string;
  active?: boolean;
  badge?: string | number;
  children?: SidebarNavChild[];
}

export interface SidebarNavGroup {
  label: string;
  items: SidebarNavItem[];
  /** For the collapsible-section variant (sidebar02). Defaults to open. */
  defaultOpen?: boolean;
}

export interface SidebarTeam {
  name: string;
  plan: string;
}

export interface SidebarHeaderData {
  workspaceName: string;
  workspacePlan: string;
  teams: SidebarTeam[];
}

export interface SidebarUser {
  name: string;
  email: string;
  initials: string;
}

export interface SidebarBreadcrumbItem {
  label: string;
  current?: boolean;
}

// ---------------------------------------------------------------------------
// Layout constants (all resolved through themeSpacing — never literal units)
// ---------------------------------------------------------------------------

/** ~16rem docked sidebar width. */
export const SIDEBAR_WIDTH = themeSpacing(64);
/** ~19rem width for the floating variant (sidebar04). */
export const SIDEBAR_WIDTH_FLOATING = themeSpacing(76);
/** ~3rem icon-only rail width. */
export const SIDEBAR_WIDTH_ICON = themeSpacing(12);
/** Viewport threshold below which the docked sidebar becomes an overlay drawer. */
const MOBILE_MEDIA_QUERY = "(max-width: 47.9375em)";

// ---------------------------------------------------------------------------
// Hand-authored generic line icons (24x24 grid, stroke follows currentColor).
// Deliberately simple geometric silhouettes — original shapes composed from
// primitive SVG shapes, not sourced from or traced against any icon library.
// ---------------------------------------------------------------------------

export type IconName =
  | "home"
  | "inbox"
  | "calendar"
  | "search"
  | "settings"
  | "user"
  | "folder"
  | "fileText"
  | "logOut"
  | "grid"
  | "panel"
  | "chevronsUpDown";

const ICON_SHAPES: Record<IconName, DomphyElement[]> = {
  home: [
    { polyline: null, points: "4,12 12,5 20,12" },
    { rect: null, x: "6", y: "12", width: "12", height: "8" },
  ],
  inbox: [
    { rect: null, x: "4", y: "8", width: "16", height: "12", rx: "2" },
    { polyline: null, points: "4,13 9,13 10,16 14,16 15,13 20,13" },
  ],
  calendar: [
    { rect: null, x: "4", y: "6", width: "16", height: "14", rx: "2" },
    { line: null, x1: "4", y1: "10", x2: "20", y2: "10" },
    { line: null, x1: "8", y1: "4", x2: "8", y2: "8" },
    { line: null, x1: "16", y1: "4", x2: "16", y2: "8" },
  ],
  search: [
    { circle: null, cx: "10", cy: "10", r: "6" },
    { line: null, x1: "15", y1: "15", x2: "20", y2: "20" },
  ],
  settings: [
    { circle: null, cx: "12", cy: "12", r: "3" },
    { circle: null, cx: "12", cy: "12", r: "7" },
  ],
  user: [
    { circle: null, cx: "12", cy: "8", r: "4" },
    { path: null, d: "M4 20c0-4 4-6 8-6s8 2 8 6" },
  ],
  folder: [{ path: null, d: "M4 7h6l2 3h8v9H4z" }],
  fileText: [
    { rect: null, x: "6", y: "3", width: "12", height: "18", rx: "1" },
    { line: null, x1: "9", y1: "8", x2: "15", y2: "8" },
    { line: null, x1: "9", y1: "12", x2: "15", y2: "12" },
    { line: null, x1: "9", y1: "16", x2: "13", y2: "16" },
  ],
  logOut: [
    { rect: null, x: "4", y: "4", width: "10", height: "16", rx: "1" },
    { line: null, x1: "10", y1: "12", x2: "20", y2: "12" },
    { polyline: null, points: "16,8 20,12 16,16" },
  ],
  grid: [
    { rect: null, x: "3", y: "3", width: "8", height: "8", rx: "1" },
    { rect: null, x: "13", y: "3", width: "8", height: "8", rx: "1" },
    { rect: null, x: "3", y: "13", width: "8", height: "8", rx: "1" },
    { rect: null, x: "13", y: "13", width: "8", height: "8", rx: "1" },
  ],
  panel: [
    { rect: null, x: "3", y: "4", width: "18", height: "16", rx: "2" },
    { line: null, x1: "9", y1: "4", x2: "9", y2: "20" },
  ],
  chevronsUpDown: [
    { polyline: null, points: "8,9 12,5 16,9" },
    { polyline: null, points: "8,15 12,19 16,15" },
  ],
};

/** Renders a small stroke-based glyph inside a themed `icon()` box. */
export function navIcon(
  name: IconName,
  color: ThemeColor = "neutral",
): DomphyElement<"span"> {
  return {
    span: [
      {
        svg: ICON_SHAPES[name],
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        role: "img",
        ariaHidden: "true",
        style: { width: "100%", height: "100%" },
      } as DomphyElement<"svg">,
    ],
    $: [icon({ color })],
  };
}

// ---------------------------------------------------------------------------
// Small composable row pieces
// ---------------------------------------------------------------------------

/** Nav label span that fades/collapses away in icon-rail mode. */
export function collapsibleLabel(
  collapsed: State<boolean>,
  content: string,
): DomphyElement<"span"> {
  return {
    span: content,
    style: {
      display: "inline-flex",
      overflow: "hidden",
      whiteSpace: "nowrap",
      opacity: (listener: Listener) => (collapsed.get(listener) ? 0 : 1),
      maxWidth: (listener: Listener) =>
        collapsed.get(listener) ? "0em" : themeSpacing(60),
      transition: "opacity 150ms linear, max-width 150ms linear",
    },
  };
}

/** Uppercase muted section/group heading, hidden in icon-rail mode. */
export function navGroupLabel(
  collapsed: State<boolean>,
  text: string,
): DomphyElement<"small"> {
  return {
    small: text,
    $: [small()],
    style: {
      textTransform: "uppercase",
      // shift-6 ("muted section heading," matching the theme's own "muted
      // text" convention) measured a real WCAG contrast failure here —
      // bumped to shift-9.
      color: (listener: Listener) => themeColor(listener, "shift-9", "neutral"),
      paddingInline: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
      overflow: "hidden",
      whiteSpace: "nowrap",
      opacity: (listener: Listener) => (collapsed.get(listener) ? 0 : 1),
      maxHeight: (listener: Listener) => (collapsed.get(listener) ? "0em" : themeSpacing(6)),
      paddingBlock: (listener: Listener) => (collapsed.get(listener) ? "0em" : themeSpacing(1)),
      transition: "opacity 150ms linear, max-height 150ms linear, padding 150ms linear",
    },
  };
}

/** Small trailing count pill for a nav row. */
export function navBadge(count: string | number): DomphyElement<"span"> {
  return {
    span: String(count),
    // Edge-anchor the pill's own surface so backgroundColor can stay "inherit"
    // (tone-background-inherit) while still reading visually distinct from
    // the row behind it.
    dataTone: "shift-3",
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: themeSpacing(5),
      paddingInline: themeSpacing(1.5),
      marginInlineStart: "auto",
      borderRadius: themeSpacing(999),
      fontSize: (listener: Listener) => themeSize(listener, "decrease-1"),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
    },
  };
}

/** Hairline vertical separator (toggle button | breadcrumb). */
export function verticalDivider(): DomphyElement<"div"> {
  // `_doctorDisable` is a doctor-only annotation not present in core's strict
  // `PartialElement` type — build through an untyped literal, then assert, so
  // the excess-property check doesn't fire on a directly-typed literal.
  // Drawn as a border (like every other hairline in this file) rather than a
  // backgroundColor fill, since tone-background-inherit only allows a fixed
  // shifted tone on border-family properties, not on backgroundColor.
  const element = {
    div: null,
    ariaHidden: "true",
    style: {
      alignSelf: "stretch",
      borderInlineStart: (listener: Listener) => `1px solid ${themeColor(listener, "shift-3")}`,
    },
    // Decorative separator bar — no text content of its own.
    _doctorDisable: "missing-color",
  };
  return element as DomphyElement<"div">;
}

/** Rotates a `details()` summary's chevron away when the sidebar is a rail. */
function hideChevronWhenCollapsed(collapsed: State<boolean>) {
  return {
    "& > summary::after": {
      display: (listener: Listener) => (collapsed.get(listener) ? "none" : "inline-block"),
    },
  };
}

// ---------------------------------------------------------------------------
// Nav rows
// ---------------------------------------------------------------------------

function navItemRow(item: SidebarNavItem, collapsed: State<boolean>): DomphyElement<"li"> {
  const rowChildren: DomphyElement[] = [
    navIcon(item.iconName ?? "folder"),
    collapsibleLabel(collapsed, item.label),
  ];
  if (item.badge != null) rowChildren.push(navBadge(item.badge));

  return {
    li: [
      {
        a: rowChildren,
        href: item.href ?? "#",
        ariaCurrent: item.active ? ("page" as const) : undefined,
        $: [listItemButton({ accentColor: "primary" })],
      },
    ],
    _key: item.label,
  };
}

/** Nav row for an item with a nested sub-list (sidebar03 / sidebar04). */
function navItemWithChildrenRow(
  item: SidebarNavItem,
  collapsed: State<boolean>,
): DomphyElement<"li"> {
  const children = item.children ?? [];
  const anyChildActive = children.some((child) => child.active);

  // Same `details()`-summary contrast issue (and same fix) as
  // `navGroupSection()`'s group label above.
  const itemLabel = collapsibleLabel(collapsed, item.label);

  return {
    li: [
      {
        details: [
          {
            summary: [
              navIcon(item.iconName ?? "folder"),
              {
                ...itemLabel,
                style: { ...itemLabel.style, color: (listener: Listener) => themeColor(listener, "shift-11", "neutral") },
              } as DomphyElement,
            ],
          },
          {
            ul: children.map((child) => ({
              li: [
                {
                  a: [collapsibleLabel(collapsed, child.label)],
                  href: child.href ?? "#",
                  ariaCurrent: child.active ? ("page" as const) : undefined,
                  $: [listItemButton({ dense: true, accentColor: "primary" })],
                },
              ],
              _key: child.label,
            })),
            $: [list()],
            style: {
              marginInlineStart: themeSpacing(5),
              paddingInlineStart: themeSpacing(2),
              borderInlineStart: (listener: Listener) => `1px solid ${themeColor(listener, "shift-3")}`,
              color: (listener: Listener) => themeColor(listener, "shift-9"),
            },
          },
        ],
        open: item.active || anyChildActive ? true : undefined,
        $: [details({ color: "neutral" })],
        style: hideChevronWhenCollapsed(collapsed),
      },
    ],
    _key: item.label,
  };
}

function navGroupSection(
  group: SidebarNavGroup,
  collapsed: State<boolean>,
  supportsChildren: boolean,
): DomphyElement<"li"> {
  const itemRows = group.items.map((item) =>
    supportsChildren && item.children?.length
      ? navItemWithChildrenRow(item, collapsed)
      : navItemRow(item, collapsed),
  );

  // `details()`'s own `"& > summary"` rule (shift-10 text on a shift-2
  // background, both relative to this panel's ambient tone) measured
  // ~4.48:1 (need 4.5:1) — a same-specificity descendant rule on the
  // `<summary>` itself couldn't be reliably beaten by overriding color
  // directly on that element, so the override goes on the label's own
  // `<span>` instead: an inherited value always loses to an explicit one
  // set directly on the descendant, regardless of the ancestor rule's
  // specificity.
  const groupLabel = collapsibleLabel(collapsed, group.label);

  return {
    li: [
      {
        details: [
          {
            summary: [
              {
                ...groupLabel,
                style: { ...groupLabel.style, color: (listener: Listener) => themeColor(listener, "shift-11", "neutral") },
              } as DomphyElement,
            ],
          },
          {
            ul: itemRows,
            $: [list()],
            style: { color: (listener: Listener) => themeColor(listener, "shift-9") },
          },
        ],
        open: group.defaultOpen === false ? undefined : true,
        $: [details({ color: "neutral" })],
        style: hideChevronWhenCollapsed(collapsed),
      },
    ],
    _key: group.label,
  };
}

/** Renders the nav groups for either the plain-list or collapsible-section layout. */
export function navGroupList(
  navGroups: SidebarNavGroup[],
  collapsed: State<boolean>,
  collapsibleSections: boolean,
  supportsChildren: boolean,
): DomphyElement<"ul"> {
  if (collapsibleSections) {
    return {
      ul: navGroups.map((group) => navGroupSection(group, collapsed, supportsChildren)),
      $: [list()],
      style: { gap: themeSpacing(1) },
    };
  }

  return {
    ul: navGroups.map((group) => ({
      li: [
        navGroupLabel(collapsed, group.label),
        {
          ul: group.items.map((item) =>
            supportsChildren && item.children?.length
              ? navItemWithChildrenRow(item, collapsed)
              : navItemRow(item, collapsed),
          ),
          $: [list()],
          style: { color: (listener: Listener) => themeColor(listener, "shift-9") },
        },
      ],
      _key: group.label,
      style: { display: "flex", flexDirection: "column" },
    })),
    $: [list()],
    style: { gap: themeSpacing(3) },
  };
}

// ---------------------------------------------------------------------------
// Header / footer rows
// ---------------------------------------------------------------------------

export function sidebarHeaderSwitcher(
  header: SidebarHeaderData,
  collapsed: State<boolean>,
): DomphyElement<"div"> {
  const teamMenuItems = header.teams.map((team) => ({
    label: `${team.name} — ${team.plan}`,
    key: team.name,
  }));

  return {
    div: [
      {
        button: [
          navIcon("grid", "primary"),
          collapsibleLabel(collapsed, header.workspaceName),
          {
            span: [navIcon("chevronsUpDown")],
            style: {
              marginInlineStart: "auto",
              display: (listener: Listener) => (collapsed.get(listener) ? "none" : "inline-flex"),
            },
          },
        ],
        ariaLabel: `${header.workspaceName} — switch workspace`,
        style: { width: "100%" },
        $: [
          listItemButton({ color: "neutral" }),
          popover({
            placement: "bottom-start",
            content: { div: null, $: [menu({ items: teamMenuItems })] },
          }),
        ],
      },
    ],
    style: {
      paddingBlock: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
      paddingInline: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
    },
  };
}

/**
 * Docs-style search field shown in the sidebar header (sidebar01/02 mirror
 * upstream's `SearchForm`: a labeled search input with a leading icon). Hidden
 * in icon-rail mode, where a full-width text field has nowhere to render.
 */
export function sidebarSearchForm(collapsed: State<boolean>): DomphyElement<"form"> {
  return {
    form: [
      {
        div: [
          {
            span: [navIcon("search")],
            style: {
              position: "absolute",
              insetInlineStart: themeSpacing(2),
              top: "50%",
              transform: "translateY(-50%)",
              width: themeSpacing(4),
              height: themeSpacing(4),
              pointerEvents: "none",
              opacity: 0.5,
              display: "inline-flex",
            },
          },
          {
            input: null,
            type: "search",
            ariaLabel: "Search",
            placeholder: "Search the docs...",
            style: { width: "100%", paddingInlineStart: themeSpacing(8) },
            $: [inputSearch({ color: "neutral", accentColor: "primary" })],
          } as DomphyElement<"input">,
        ],
        style: { position: "relative", display: "flex", alignItems: "center" },
      },
    ],
    style: {
      display: (listener: Listener) => (collapsed.get(listener) ? "none" : "block"),
      paddingInline: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
      paddingBlockEnd: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
    },
  };
}

export function sidebarFooterUser(
  user: SidebarUser,
  collapsed: State<boolean>,
): DomphyElement<"div"> {
  const accountMenuItems = [
    { label: "Account", key: "account" },
    { label: "Billing", key: "billing" },
    { label: "Notifications", key: "notifications" },
    {
      label: {
        span: [navIcon("logOut"), { span: "Log out" }],
        style: { display: "flex", alignItems: "center", gap: themeSpacing(2) },
      } as DomphyElement<"span">,
      key: "logout",
    },
  ];

  return {
    div: [
      {
        button: [
          { span: user.initials, $: [avatar({ color: "primary" })] },
          {
            div: [
              {
                span: user.name,
                style: {
                  fontSize: (listener: Listener) => themeSize(listener, "inherit"),
                  color: (listener: Listener) => themeColor(listener, "shift-10"),
                },
              },
              { small: user.email, $: [small()] },
            ],
            style: {
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              opacity: (listener: Listener) => (collapsed.get(listener) ? 0 : 1),
              maxWidth: (listener: Listener) => (collapsed.get(listener) ? "0em" : themeSpacing(44)),
              transition: "opacity 150ms linear, max-width 150ms linear",
            },
          },
          {
            span: [navIcon("chevronsUpDown")],
            style: {
              marginInlineStart: "auto",
              display: (listener: Listener) => (collapsed.get(listener) ? "none" : "inline-flex"),
            },
          },
        ],
        ariaLabel: `${user.name} account menu`,
        style: { width: "100%" },
        $: [
          listItemButton({ color: "neutral" }),
          popover({
            placement: "top-start",
            content: { div: null, $: [menu({ items: accountMenuItems })] },
          }),
        ],
      },
    ],
    style: {
      paddingBlock: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
      paddingInline: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
      borderTop: (listener: Listener) => `1px solid ${themeColor(listener, "shift-3")}`,
      color: (listener: Listener) => themeColor(listener, "shift-9"),
    },
  };
}

// ---------------------------------------------------------------------------
// Sidebar toggle + content header
// ---------------------------------------------------------------------------

export function sidebarToggleButton(
  collapsed: State<boolean>,
  mobileOpen: State<boolean>,
): DomphyElement<"button"> {
  const toggle = () => {
    const isMobile =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia(MOBILE_MEDIA_QUERY).matches;
    if (isMobile) mobileOpen.set(!mobileOpen.get());
    else collapsed.set(!collapsed.get());
  };

  return {
    button: [navIcon("panel")],
    ariaLabel: "Toggle sidebar",
    onClick: toggle,
    $: [buttonGhost()],
    _onMount: (node) => {
      const handleKeydown = (event: KeyboardEvent) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
          event.preventDefault();
          toggle();
        }
      };
      document.addEventListener("keydown", handleKeydown);
      node.addHook("Remove", () => document.removeEventListener("keydown", handleKeydown));
    },
  };
}

export function contentHeader(
  breadcrumbItems: SidebarBreadcrumbItem[],
  collapsed: State<boolean>,
  mobileOpen: State<boolean>,
  sticky: boolean,
  side: "left" | "right" = "left",
): DomphyElement<"header"> {
  const toggleButton = sidebarToggleButton(collapsed, mobileOpen);
  const breadcrumbNav: DomphyElement<"nav"> = {
    // Each crumb is wrapped in an extra `<span>` rather than being a direct
    // child of the nav: `breadcrumb()`'s own `"& > *"` rule (shift-8 for
    // non-current crumbs) measured a real WCAG contrast failure here, and a
    // same-specificity `.breadcrumbClass > *` vs. a crumb's own generated
    // class is a cascade-order tie this couldn't reliably win by overriding
    // color directly on the direct child. One more level of nesting takes
    // the real crumb text out of that direct-child match.
    nav: breadcrumbItems.map((crumb) => ({
      span: [
        {
          span: crumb.label,
          // Replicates breadcrumb()'s own "current crumb reads stronger"
          // rule (now moot for this grandchild — see the note above) rather
          // than just reusing its too-weak shift-8/shift-9 non-current step.
          style: {
            color: (l: Listener) => themeColor(l, crumb.current ? "shift-10" : "shift-9", "neutral"),
          },
        } as DomphyElement,
      ],
      ariaCurrent: crumb.current ? ("page" as const) : undefined,
      _key: crumb.label,
    })),
    $: [breadcrumb()],
  };

  // When the sidebar is mirrored to the right, the toggle button sits at the
  // header's right edge (adjacent to the sidebar) instead of the left —
  // breadcrumb first, then a flex spacer pushes the divider+toggle to the end.
  const children: DomphyElement[] =
    side === "right"
      ? [breadcrumbNav, toolbarSpacer(), verticalDivider(), toggleButton]
      : [toggleButton, verticalDivider(), breadcrumbNav];

  return {
    header: children,
    $: [toolbar({ gap: 3 })],
    style: {
      position: sticky ? "sticky" : "static",
      top: "0",
      zIndex: 10,
      flexShrink: 0,
      height: themeSpacing(14),
      paddingInline: (listener: Listener) => themeSpacing(themeDensity(listener) * 4),
      borderBottom: (listener: Listener) => `1px solid ${themeColor(listener, "shift-3")}`,
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
    },
  };
}

// ---------------------------------------------------------------------------
// Content demo area
// ---------------------------------------------------------------------------

export function contentTileGrid(): DomphyElement<"div"> {
  const tiles = [0, 1, 2].map((index) => ({
    div: null,
    _key: `tile-${index}`,
    $: [skeleton()],
    style: { height: themeSpacing(48) },
  }));

  return {
    div: [
      {
        div: tiles,
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 4),
        },
      },
      { div: null, $: [skeleton()], style: { height: themeSpacing(160), flex: "1 1 auto" } },
    ],
    style: {
      display: "flex",
      flexDirection: "column",
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 4),
      padding: (listener: Listener) => themeSpacing(themeDensity(listener) * 4),
    },
  };
}

export function contentPlaceholderRows(count = 40): DomphyElement<"div"> {
  const rows = Array.from({ length: count }, (_unused, index) => ({
    div: null,
    _key: `row-${index}`,
    $: [skeleton()],
    style: { height: themeSpacing(14) },
  }));

  return {
    div: rows,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
      padding: (listener: Listener) => themeSpacing(themeDensity(listener) * 4),
    },
  };
}

// ---------------------------------------------------------------------------
// Sidebar shell (desktop aside + mobile drawer)
// ---------------------------------------------------------------------------

export interface SidebarShellOptions {
  header: SidebarHeaderData;
  navGroups: SidebarNavGroup[];
  user: SidebarUser;
  collapsed: State<boolean>;
  collapsibleSections: boolean;
  supportsChildren: boolean;
  floating: boolean;
  /** Renders a docs-style search field under the header switcher (sidebar01/02). */
  showSearch?: boolean;
  /** Which viewport edge the sidebar docks against. Defaults to "left". */
  side?: "left" | "right";
}

export function sidebarAside(options: SidebarShellOptions): DomphyElement<"aside"> {
  const { header, navGroups, user, collapsed, collapsibleSections, supportsChildren, floating } =
    options;
  const showSearch = options.showSearch ?? false;
  const side = options.side ?? "left";
  const expandedWidth = floating ? SIDEBAR_WIDTH_FLOATING : SIDEBAR_WIDTH;
  // The edge facing the main content: for a left-docked sidebar that's its own
  // inline-end edge; mirrored to the right, it's the inline-start edge.
  const contentFacingBorder: ((listener: Listener) => string) | undefined = floating
    ? undefined
    : (listener: Listener) => `1px solid ${themeColor(listener, "shift-3")}`;
  const contentFacingMargin: string | undefined = floating ? "0" : undefined;

  return {
    aside: [
      sidebarHeaderSwitcher(header, collapsed),
      ...(showSearch ? [sidebarSearchForm(collapsed)] : []),
      {
        nav: [navGroupList(navGroups, collapsed, collapsibleSections, supportsChildren)],
        // The mobile drawer below renders a second, structurally-identical
        // `<nav>` (shown off-canvas rather than removed from the DOM) —
        // without distinct names both collide as duplicate "navigation"
        // landmarks (axe-core `landmark-unique`).
        ariaLabel: "Sidebar navigation",
        $: [scrollArea()],
        style: {
          flex: "1 1 auto",
          paddingBlock: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
        },
      },
      sidebarFooterUser(user, collapsed),
    ],
    dataTone: "shift-1",
    style: {
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      width: (listener: Listener) => (collapsed.get(listener) ? SIDEBAR_WIDTH_ICON : expandedWidth),
      transition: "width 200ms linear",
      overflow: "hidden",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      borderInlineEnd: side === "right" ? undefined : contentFacingBorder,
      borderInlineStart: side === "right" ? contentFacingBorder : undefined,
      outline: floating ? (listener: Listener) => `1px solid ${themeColor(listener, "shift-3")}` : undefined,
      outlineOffset: floating ? "-1px" : undefined,
      borderRadius: floating ? themeSpacing(3) : undefined,
      boxShadow: floating
        ? (listener: Listener) =>
            `0 ${themeSpacing(2)} ${themeSpacing(8)} ${themeColor(listener, "shift-3")}`
        : undefined,
      margin: floating ? themeSpacing(4) : undefined,
      marginInlineEnd: side === "right" ? undefined : contentFacingMargin,
      marginInlineStart: side === "right" ? contentFacingMargin : undefined,
      // The docked aside fully hides on mobile — the off-canvas overlay is a
      // separate `sidebarMobileDrawer()` element (see below), not this aside
      // sliding in place.
      "@media (max-width: 47.9375em)": { display: "none" },
    },
  };
}

export function sidebarMobileDrawer(
  options: SidebarShellOptions & { mobileOpen: State<boolean> },
): DomphyElement<"dialog"> {
  const { header, navGroups, user, collapsibleSections, supportsChildren, mobileOpen } = options;
  const showSearch = options.showSearch ?? false;
  const side = options.side ?? "left";
  // The mobile drawer always renders fully expanded — there is no icon-rail
  // mode once the sidebar has already collapsed into an overlay sheet.
  const alwaysExpanded = toState(false);

  return {
    dialog: [
      sidebarHeaderSwitcher(header, alwaysExpanded),
      ...(showSearch ? [sidebarSearchForm(alwaysExpanded)] : []),
      {
        nav: [navGroupList(navGroups, alwaysExpanded, collapsibleSections, supportsChildren)],
        ariaLabel: "Sidebar navigation (mobile)",
        $: [scrollArea()],
        style: {
          flex: "1 1 auto",
          paddingBlock: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
        },
      },
      sidebarFooterUser(user, alwaysExpanded),
    ],
    dataTone: "shift-1",
    $: [drawer({ open: mobileOpen, placement: side === "right" ? "end" : "start", size: SIDEBAR_WIDTH })],
    style: {
      display: "flex",
      flexDirection: "column",
      padding: "0",
      // drawer() already sets these through its own `color` param, but the
      // dataTone-surface-contract check only looks at this literal's own
      // style — restate them explicitly (native style wins either way, so
      // this is a no-op at runtime, not a behavior change).
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
    },
  };
}

// ---------------------------------------------------------------------------
// Root assembly
// ---------------------------------------------------------------------------

export interface SidebarBlockOptions {
  header?: SidebarHeaderData;
  navGroups?: SidebarNavGroup[];
  user?: SidebarUser;
  breadcrumb?: SidebarBreadcrumbItem[];
  defaultCollapsed?: boolean;
  /** Which viewport edge the sidebar docks against. Defaults to "left". */
  side?: "left" | "right";
}

export interface SidebarVariantOptions extends SidebarBlockOptions {
  defaultNavGroups: SidebarNavGroup[];
  collapsibleSections?: boolean;
  supportsChildren?: boolean;
  floating?: boolean;
  stickyHeader?: boolean;
  manyContentRows?: boolean;
  /** Show the docs-style search field in the header (sidebar01/02). */
  showSearch?: boolean;
  /**
   * Renders the main content column as a rounded, shadowed card inset from the
   * sidebar/viewport edges (like sidebar08) instead of a flush full-bleed panel.
   * The inset gap shrinks in step with the sidebar's own collapse transition.
   */
  insetMain?: boolean;
}

export const DEFAULT_HEADER: SidebarHeaderData = {
  workspaceName: "Acme Inc",
  workspacePlan: "Enterprise",
  teams: [
    { name: "Acme Inc", plan: "Enterprise" },
    { name: "Acme Corp", plan: "Startup" },
    { name: "Evil Corp", plan: "Free" },
  ],
};

export const DEFAULT_USER: SidebarUser = {
  name: "Shad CN",
  email: "shad@example.com",
  initials: "SC",
};

export const DEFAULT_BREADCRUMB: SidebarBreadcrumbItem[] = [
  { label: "Building Your Application" },
  { label: "Data Fetching", current: true },
];

export const DEFAULT_NAV_GROUPS: SidebarNavGroup[] = [
  {
    label: "Platform",
    items: [
      { label: "Dashboard", iconName: "home", href: "#", active: true },
      { label: "Inbox", iconName: "inbox", href: "#", badge: 4 },
      { label: "Calendar", iconName: "calendar", href: "#" },
      { label: "Search", iconName: "search", href: "#" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { label: "Documents", iconName: "fileText", href: "#" },
      { label: "Team", iconName: "user", href: "#" },
    ],
  },
  {
    label: "Settings",
    items: [{ label: "General", iconName: "settings", href: "#" }],
  },
];

export const DEFAULT_NAV_GROUPS_WITH_CHILDREN: SidebarNavGroup[] = [
  {
    label: "Platform",
    items: [
      { label: "Dashboard", iconName: "home", href: "#", active: true },
      { label: "Inbox", iconName: "inbox", href: "#", badge: 4 },
    ],
  },
  {
    label: "Projects",
    items: [
      {
        label: "Design Engineering",
        iconName: "folder",
        children: [
          { label: "Genesis", href: "#" },
          { label: "Explorer", href: "#", active: true },
          { label: "Quantum", href: "#" },
        ],
      },
      {
        label: "Sales & Marketing",
        iconName: "folder",
        children: [
          { label: "Campaigns", href: "#" },
          { label: "Emails", href: "#" },
        ],
      },
      {
        label: "Travel",
        iconName: "folder",
        children: [
          { label: "Trips", href: "#" },
          { label: "Bookings", href: "#" },
        ],
      },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "General", iconName: "settings", href: "#" },
      { label: "Team", iconName: "user", href: "#" },
    ],
  },
];

/** Assembles the full root tree shared by every sidebar-NN variant. */
export function buildSidebarBlock(options: SidebarVariantOptions): DomphyElement<"div"> {
  const header = options.header ?? DEFAULT_HEADER;
  const navGroups = options.navGroups ?? options.defaultNavGroups;
  const user = options.user ?? DEFAULT_USER;
  const breadcrumbItems = options.breadcrumb ?? DEFAULT_BREADCRUMB;
  const collapsibleSections = options.collapsibleSections ?? false;
  const supportsChildren = options.supportsChildren ?? false;
  const floating = options.floating ?? false;
  const stickyHeader = options.stickyHeader ?? true;
  const manyContentRows = options.manyContentRows ?? false;
  const showSearch = options.showSearch ?? false;
  const side = options.side ?? "left";
  const insetMain = options.insetMain ?? false;

  const collapsed = toState(options.defaultCollapsed ?? false);
  const mobileOpen = toState(false);

  const shellOptions: SidebarShellOptions = {
    header,
    navGroups,
    user,
    collapsed,
    collapsibleSections,
    supportsChildren,
    floating,
    showSearch,
    side,
  };

  const asideElement = sidebarAside(shellOptions);
  const mobileDrawerElement = sidebarMobileDrawer({ ...shellOptions, mobileOpen });
  const mainElement: DomphyElement<"main"> = {
    main: [
      contentHeader(breadcrumbItems, collapsed, mobileOpen, stickyHeader, side),
      manyContentRows ? contentPlaceholderRows() : contentTileGrid(),
    ],
    $: [scrollArea()],
    dataTone: "shift-0",
    style: {
      flex: "1 1 auto",
      minWidth: "0",
      // Without this, a stretched flex item refuses to shrink below its own
      // content's intrinsic height — with `manyContentRows` (40 stacked
      // placeholder rows) that content is far taller than the viewport, so
      // `main` (and the row it sits in) grows past `height: 100dvh` instead
      // of scrolling internally via scrollArea()'s `overflow: auto`.
      minHeight: "0",
      display: "flex",
      flexDirection: "column",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      // Inset-card treatment: rounded/shadowed card whose margin shrinks in
      // step with the sidebar's own width-collapse transition (sidebar08-style).
      margin: insetMain ? (listener: Listener) => (collapsed.get(listener) ? themeSpacing(2) : themeSpacing(3)) : undefined,
      borderRadius: insetMain ? (listener: Listener) => themeSpacing(themeDensity(listener) * 3) : undefined,
      boxShadow: insetMain
        ? (listener: Listener) =>
            `0 ${themeSpacing(1)} ${themeSpacing(6)} ${themeColor(listener, "shift-4")}`
        : undefined,
      transition: insetMain ? "margin 0.2s linear" : undefined,
    },
  };

  return {
    div:
      side === "right"
        ? [mainElement, asideElement, mobileDrawerElement]
        : [asideElement, mobileDrawerElement, mainElement],
    dataTone: insetMain ? "shift-2" : "shift-0",
    style: {
      display: "flex",
      width: "100%",
      // A fixed `height` (not `minHeight`) caps the row at the viewport —
      // `minHeight` is only a floor, so with tall content (manyContentRows)
      // the whole layout (and the aside stretched alongside it via
      // align-items:stretch) grows far past the viewport instead of the
      // content pane scrolling internally. See `mainElement`'s `minHeight: 0`
      // above for the matching half of this fix.
      height: "100dvh",
      position: "relative",
      overflow: "hidden",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
    },
  };
}
