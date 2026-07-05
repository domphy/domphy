// Shared building blocks for the shadcn "sidebar-0N" family (sidebar05..sidebar08).
// Not part of the package's public surface — each sidebarNN.ts file exports the
// actual factory function; this module only holds icons/types/helpers reused
// across the four variants to avoid duplicating ~150 lines of layout per file.

import type { DomphyElement, Listener, ReadableState } from "@domphy/core";
import { toState } from "@domphy/core";
import {
  avatar,
  breadcrumb,
  buttonGhost,
  icon,
  link,
  menu,
  popover,
  small,
  strong,
  tooltip,
} from "@domphy/ui";
import {
  themeColor,
  themeDensity,
  themeSpacing,
} from "@domphy/theme";

// ---------------------------------------------------------------------------
// Icons — hand-authored generic line glyphs (24x24, stroke=currentColor).
// Not sourced from any third-party icon set; these are simple geometric shapes
// (plus/minus/magnifying-glass/dots/chevrons) that are not anyone's IP. Domphy
// has no innerHTML API, but TextNode treats a single-root HTML string as
// intentional inline markup (sanitized against event-handler attrs), which is
// the same pattern @domphy/ui itself uses for inline icons — see
// packages/ui/src/patches/inputPassword.ts.
// ---------------------------------------------------------------------------

const ICON_PLUS =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M12 5v14M5 12h14"/></svg>';

const ICON_MINUS =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M5 12h14"/></svg>';

const ICON_SEARCH =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';

const ICON_PANEL_TOGGLE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg>';

const ICON_MORE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="none" width="1em" height="1em"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>';

const ICON_CHEVRONS_UPDOWN =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M7 15l5 5 5-5M7 9l5-5 5 5"/></svg>';

const ICON_CHEVRON_RIGHT =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M9 6l6 6-6 6"/></svg>';

const ICON_FOLDER =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';

const ICON_GRID =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>';

const ICON_INBOX =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M3 12h4l2 3h6l2-3h4"/><path d="M5.5 5h13l2.5 7v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-7z"/></svg>';

const ICON_BAR_CHART =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M4 20V10M12 20V4M20 20v-6"/></svg>';

const ICON_LIFEBUOY =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M5.6 5.6l3.2 3.2M18.4 5.6l-3.2 3.2M5.6 18.4l3.2-3.2M18.4 18.4l-3.2-3.2"/></svg>';

const ICON_MESSAGE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M4 5h16v11H8l-4 4z"/></svg>';

const ICON_MARK =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="none" width="1em" height="1em"><path d="M12 2l8 4.5v9L12 20l-8-4.5v-9z"/></svg>';

const ICON_USERS =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 6.5a3 3 0 0 1 0 5.8M21 20a5.5 5.5 0 0 0-4.5-5.4"/></svg>';

export {
  ICON_PLUS,
  ICON_MINUS,
  ICON_SEARCH,
  ICON_PANEL_TOGGLE,
  ICON_MORE,
  ICON_CHEVRONS_UPDOWN,
  ICON_CHEVRON_RIGHT,
  ICON_FOLDER,
  ICON_GRID,
  ICON_INBOX,
  ICON_BAR_CHART,
  ICON_LIFEBUOY,
  ICON_MESSAGE,
  ICON_MARK,
  ICON_USERS,
};

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/** A single crumb in the sticky content header's breadcrumb trail. */
type SidebarBreadcrumbItem = {
  label: string;
  href?: string;
};

export type { SidebarBreadcrumbItem };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wraps a raw inline SVG string in a themed icon() span. */
function sidebarIcon(
  svg: string,
  color: "neutral" | "primary" = "neutral",
): DomphyElement<"span"> {
  return { span: svg, $: [icon({ color })] } as DomphyElement<"span">;
}

/** Muted rounded video-aspect placeholder card (edge dataTone surface). */
function placeholderCard(key: string | number): DomphyElement<"div"> {
  return {
    div: null,
    _key: key,
    dataTone: "shift-2",
    style: {
      aspectRatio: "16 / 9",
      borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 2),
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    },
  } as DomphyElement<"div">;
}

/** Large muted rounded panel filling the rest of the content height. */
function placeholderPanel(): DomphyElement<"div"> {
  return {
    div: null,
    dataTone: "shift-2",
    style: {
      flex: "1",
      minHeight: themeSpacing(80),
      borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 2),
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    },
  } as DomphyElement<"div">;
}

/**
 * The content slot shared by every sidebar-0N demo: caller-supplied children,
 * or (by default) 3 muted video-aspect cards + 1 large placeholder panel.
 */
function sidebarMainContent(
  children?: DomphyElement | DomphyElement[] | null,
): DomphyElement<"div"> {
  const content = children
    ? Array.isArray(children)
      ? children
      : [children]
    : [
        {
          div: [
            placeholderCard("a"),
            placeholderCard("b"),
            placeholderCard("c"),
          ],
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: (l: Listener) => themeSpacing(themeDensity(l) * 4),
          },
        } as DomphyElement<"div">,
        placeholderPanel(),
      ];

  return {
    div: content,
    style: {
      display: "flex",
      flexDirection: "column",
      flex: "1",
      minHeight: "0",
      gap: (l: Listener) => themeSpacing(themeDensity(l) * 4),
      padding: (l: Listener) => themeSpacing(themeDensity(l) * 4),
      overflow: "auto",
    },
  } as DomphyElement<"div">;
}

/**
 * Breadcrumb trail for the sticky content header: earlier crumbs are muted
 * links, the last crumb is bold/current (`aria-current="page"`).
 */
function sidebarBreadcrumb(
  items: SidebarBreadcrumbItem[],
): DomphyElement<"nav"> {
  const crumbs: DomphyElement[] = items.map((item, index) => {
    const isLast = index === items.length - 1;
    if (isLast) {
      return {
        strong: item.label,
        _key: `${item.label}-${index}`,
        ariaCurrent: "page",
        $: [strong({ color: "neutral" })],
      } as unknown as DomphyElement;
    }
    return {
      a: item.label,
      _key: `${item.label}-${index}`,
      href: item.href ?? "#",
      $: [link({ color: "neutral", accentColor: "neutral" })],
    } as unknown as DomphyElement;
  });
  return {
    nav: crumbs,
    $: [breadcrumb({ color: "neutral" })],
  } as DomphyElement<"nav">;
}

/** Decorative vertical rule (border, not backgroundColor, to stay theme-safe). */
function verticalDivider(): DomphyElement<"div"> {
  return {
    div: null,
    ariaHidden: "true",
    style: {
      width: "0",
      alignSelf: "stretch",
      marginBlock: themeSpacing(2),
      borderInlineStart: (l: Listener) =>
        `1px solid ${themeColor(l, "shift-3", "neutral")}`,
      color: (l: Listener) => themeColor(l, "shift-3", "neutral"),
    },
  } as DomphyElement<"div">;
}

/** Sticky content header: toggle button + vertical divider + breadcrumb trail. */
function sidebarStickyHeader(props: {
  onToggle: () => void;
  breadcrumbItems: SidebarBreadcrumbItem[];
}): DomphyElement<"header"> {
  return {
    header: [
      {
        button: sidebarIcon(ICON_PANEL_TOGGLE),
        type: "button",
        ariaLabel: "Toggle sidebar",
        onClick: props.onToggle,
        $: [buttonGhost({ color: "neutral" })],
      } as unknown as DomphyElement,
      verticalDivider(),
      sidebarBreadcrumb(props.breadcrumbItems),
    ],
    style: {
      position: "sticky",
      top: "0",
      zIndex: "10",
      display: "flex",
      alignItems: "center",
      gap: (l: Listener) => themeSpacing(themeDensity(l) * 3),
      height: themeSpacing(16),
      flexShrink: "0",
      paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 4),
      borderBottom: (l: Listener) =>
        `1px solid ${themeColor(l, "shift-3", "neutral")}`,
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    },
  } as DomphyElement<"header">;
}

/**
 * Mobile-only backdrop shown behind the off-canvas/overlay sidebar. Hidden by
 * default; the `@media` block reveals it only under the mobile breakpoint AND
 * only while `open` is true.
 */
function sidebarBackdrop(
  open: ReadableState<boolean>,
  onClose: () => void,
): DomphyElement<"div"> {
  return {
    div: null,
    ariaHidden: "true",
    dataTone: "shift-17",
    onClick: onClose,
    style: {
      display: "none",
      position: "fixed",
      inset: "0",
      zIndex: "14",
      cursor: "pointer",
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
      opacity: "0.6",
      "@media (max-width: 768px)": {
        display: (l: Listener) => (open.get(l) ? "block" : "none"),
      },
    },
  } as DomphyElement<"div">;
}

export {
  sidebarIcon,
  placeholderCard,
  placeholderPanel,
  sidebarMainContent,
  sidebarBreadcrumb,
  verticalDivider,
  sidebarStickyHeader,
  sidebarBackdrop,
};

// ---------------------------------------------------------------------------
// Full-featured sidebar building blocks — shared by sidebar07 and sidebar08
// (team switcher, nested nav-main, projects list, user footer). Both variants
// collapse from a full labeled panel down to a narrow icon-only rail; every
// row below is rendered twice (an expanded row + a collapsed icon-only row
// with a tooltip) so the collapsed-only tooltip never doubles up with an
// already-visible label.
// ---------------------------------------------------------------------------

type SidebarTeam = { name: string; plan: string; logo?: string };
type SidebarNavChild = { title: string; href?: string; active?: boolean };
type SidebarNavMainItem = {
  title: string;
  icon?: string;
  href?: string;
  active?: boolean;
  items?: SidebarNavChild[];
};
type SidebarProject = { title: string; icon?: string; href?: string };
type SidebarUser = { name: string; email: string; avatarUrl?: string };

export type {
  SidebarTeam,
  SidebarNavChild,
  SidebarNavMainItem,
  SidebarProject,
  SidebarUser,
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

/** Icon badge used by the team-switcher and the brand mark. Edge-anchored
 * dataTone surface per the design system's badge convention. */
function iconBadge(svg: string): DomphyElement<"span"> {
  return {
    span: svg,
    dataTone: "shift-0",
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: themeSpacing(8),
      height: themeSpacing(8),
      flexShrink: "0",
      borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 2),
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "primary"),
      color: (l: Listener) => themeColor(l, "shift-10", "primary"),
    },
  } as unknown as DomphyElement<"span">;
}

/** Two-line label (title + muted caption) that clips instead of wrapping when
 * the sidebar's own container narrows down to the icon rail. */
function twoLineLabel(title: string, caption: string): DomphyElement<"div"> {
  return {
    div: [
      { strong: title, $: [strong({ color: "neutral" })] } as unknown as DomphyElement,
      { small: caption, $: [small({ color: "neutral" })] } as unknown as DomphyElement,
    ],
    style: {
      display: "flex",
      flexDirection: "column",
      gap: themeSpacing(0.5),
      minWidth: "0",
      overflow: "hidden",
      whiteSpace: "nowrap",
    },
  } as unknown as DomphyElement<"div">;
}

/** Team switcher: icon badge + two-line label + chevrons, opens a dropdown of
 * teams. Stays a clickable icon in collapsed/icon-rail mode. */
function renderTeamSwitcher(teams: SidebarTeam[]): DomphyElement<"div"> {
  const active = teams[0] ?? { name: "Acme Inc", plan: "Enterprise" };
  const dropdown: DomphyElement<"div"> = {
    div: null,
    style: { minWidth: themeSpacing(48) },
    $: [
      menu({
        items: teams.map((team, index) => ({
          label: `${team.name} — ${team.plan}`,
          key: `${team.name}-${index}`,
        })),
      }),
    ],
  } as unknown as DomphyElement<"div">;

  return {
    div: [
      {
        button: [
          iconBadge(active.logo ?? ICON_CHEVRONS_UPDOWN),
          twoLineLabel(active.name, active.plan),
          sidebarIcon(ICON_CHEVRONS_UPDOWN),
        ],
        type: "button",
        ariaLabel: "Switch team",
        style: {
          display: "flex",
          alignItems: "center",
          width: "100%",
          gap: (l: Listener) => themeSpacing(themeDensity(l) * 2),
          padding: (l: Listener) => themeSpacing(themeDensity(l) * 2),
          borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
          border: "none",
          cursor: "pointer",
          overflow: "hidden",
          color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
          backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
          "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
        },
        $: [popover({ placement: "bottom", content: dropdown })],
      } as unknown as DomphyElement,
    ],
    style: { padding: (l: Listener) => themeSpacing(themeDensity(l) * 2) },
  } as unknown as DomphyElement<"div">;
}

/** A single-level nav-main link row (no children): icon + label, rendered
 * twice — an expanded row (visible unless collapsed) and a collapsed-icon row
 * with a tooltip (visible only while collapsed) — so the tooltip only ever
 * fires when the label itself isn't already on screen. */
function renderPlainNavRow(
  item: SidebarNavMainItem | SidebarProject,
  collapsed: ReadableState<boolean>,
): DomphyElement<"li"> {
  const rowStyle = {
    display: "flex",
    alignItems: "center",
    width: "100%",
    gap: (l: Listener) => themeSpacing(themeDensity(l) * 2),
    paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 2),
    paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
    borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
    textDecoration: () => "none",
    overflow: "hidden",
    whiteSpace: "nowrap",
    color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
    "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
    "&[aria-current=page]": {
      backgroundColor: (l: Listener) => themeColor(l, "shift-3", "primary"),
      color: (l: Listener) => themeColor(l, "shift-12", "primary"),
    },
  };

  const active = "active" in item ? Boolean(item.active) : false;

  return {
    li: [
      {
        a: [
          ...(item.icon ? [sidebarIcon(item.icon)] : []),
          { span: item.title, style: { flex: "1", textAlign: "left" } } as unknown as DomphyElement,
        ],
        href: item.href ?? "#",
        ariaCurrent: active ? "page" : undefined,
        style: { ...rowStyle, display: (l: Listener) => (collapsed.get(l) ? "none" : "flex") },
      } as unknown as DomphyElement,
      {
        a: [item.icon ? sidebarIcon(item.icon) : { span: item.title[0] }],
        href: item.href ?? "#",
        ariaCurrent: active ? "page" : undefined,
        ariaLabel: item.title,
        style: {
          ...rowStyle,
          justifyContent: "center",
          display: (l: Listener) => (collapsed.get(l) ? "flex" : "none"),
        },
        $: [tooltip({ content: item.title, placement: "right" })],
      } as unknown as DomphyElement,
    ],
    _key: item.title,
  } as DomphyElement<"li">;
}

/** A nav-main item with children: inline accordion when expanded, floating
 * flyout when the sidebar is collapsed to its icon rail. */
function renderExpandableNavRow(
  item: SidebarNavMainItem,
  collapsed: ReadableState<boolean>,
): DomphyElement<"li"> {
  const children = item.items ?? [];
  const hasActiveChild = children.some((child) => child.active);
  const flyoutOpen = toState(false);
  const flyoutContent: DomphyElement<"div"> = {
    div: null,
    style: { minWidth: themeSpacing(40) },
    $: [
      menu({
        items: children.map((child, index) => ({ label: child.title, key: `${item.title}-flyout-${index}` })),
      }),
    ],
  } as unknown as DomphyElement<"div">;

  return {
    li: [
      {
        details: [
          {
            summary: [
              ...(item.icon ? [sidebarIcon(item.icon)] : []),
              { span: item.title, style: { flex: "1", textAlign: "left" } } as unknown as DomphyElement,
              {
                span: ICON_CHEVRON_RIGHT,
                dataSlot: "nav-chevron",
                style: { transition: "transform 150ms ease" },
                $: [icon({ color: "neutral" })],
              } as unknown as DomphyElement,
            ],
            style: {
              listStyle: "none",
              cursor: "pointer",
              userSelect: "none",
              display: "flex",
              alignItems: "center",
              gap: (l: Listener) => themeSpacing(themeDensity(l) * 2),
              width: "100%",
              paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 2),
              paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
              borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
              color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
              backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
              "&::-webkit-details-marker": { display: "none" },
              "&::marker": { content: `""` },
              "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
            },
          } as unknown as DomphyElement,
          {
            ul: children.map((child, index) => ({
              li: [
                {
                  a: child.active
                    ? ([{ strong: child.title, $: [strong({ color: "neutral" })] }] as unknown as DomphyElement)
                    : child.title,
                  href: child.href ?? "#",
                  ariaCurrent: child.active ? "page" : undefined,
                  style: {
                    display: "flex",
                    paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 1.5),
                    paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
                    borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
                    textDecoration: () => "none",
                    color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
                    "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
                    "&[aria-current=page]": {
                      backgroundColor: (l: Listener) => themeColor(l, "shift-3", "primary"),
                      color: (l: Listener) => themeColor(l, "shift-12", "primary"),
                    },
                  },
                } as unknown as DomphyElement,
              ],
              _key: `${item.title}-${index}`,
            })) as unknown as DomphyElement[],
            style: {
              listStyle: "none",
              margin: "0",
              display: "flex",
              flexDirection: "column",
              gap: themeSpacing(0.5),
              marginInlineStart: themeSpacing(5),
              paddingInlineStart: themeSpacing(3),
              paddingBlock: "0",
              paddingInlineEnd: "0",
              borderInlineStart: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
              color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
              maxHeight: "0px",
              overflow: "hidden",
              opacity: "0",
              transition: "max-height 180ms linear, opacity 180ms linear",
            },
          } as unknown as DomphyElement,
        ],
        open: hasActiveChild,
        style: {
          display: (l: Listener) => (collapsed.get(l) ? "none" : "block"),
          // Only the chevron glyph rotates on open — a bare "summary span"
          // selector would also match the icon/title spans in the same
          // summary and rotate the visible label text into unreadable
          // vertical text.
          "&[open] summary [data-slot=nav-chevron]": { transform: "rotate(90deg)" },
          "&[open] > ul": { maxHeight: themeSpacing(240), opacity: "1", paddingBlock: themeSpacing(1) },
        },
      } as unknown as DomphyElement,
      {
        button: [sidebarIcon(item.icon ?? ICON_FOLDER)],
        type: "button",
        ariaLabel: item.title,
        style: {
          display: (l: Listener) => (collapsed.get(l) ? "flex" : "none"),
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 2),
          borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
          border: "none",
          cursor: "pointer",
          color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
          backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
          "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
          "&[aria-expanded=true]": {
            backgroundColor: (l: Listener) => themeColor(l, "shift-3", "primary"),
            color: (l: Listener) => themeColor(l, "shift-12", "primary"),
          },
        },
        $: [popover({ open: flyoutOpen, placement: "right-start", content: flyoutContent })],
      } as unknown as DomphyElement,
    ],
    _key: item.title,
  } as DomphyElement<"li">;
}

/** Projects row: icon + title + a trailing hover-revealed "more actions" icon
 * (hidden entirely while the sidebar is collapsed). Rendered twice — an
 * expanded row (link + sibling more-button, visible unless collapsed) and a
 * collapsed icon-only link with a tooltip (visible only while collapsed) —
 * the more-button is a sibling of the link, never nested inside it, since
 * `<a>` must not contain another interactive element. */
function renderProjectRow(
  project: SidebarProject,
  collapsed: ReadableState<boolean>,
): DomphyElement<"li"> {
  const moreOpen = toState(false);
  const moreMenu: DomphyElement<"div"> = {
    div: null,
    style: { minWidth: themeSpacing(36) },
    $: [menu({ items: [{ label: "Rename" }, { label: "Delete" }] })],
  } as unknown as DomphyElement<"div">;

  const linkStyle = {
    display: "flex",
    alignItems: "center",
    flex: "1",
    minWidth: "0",
    gap: (l: Listener) => themeSpacing(themeDensity(l) * 2),
    textDecoration: () => "none",
    overflow: "hidden",
    whiteSpace: "nowrap",
    color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
  };

  return {
    li: [
      {
        div: [
          {
            a: [
              ...(project.icon ? [sidebarIcon(project.icon)] : []),
              { span: project.title, style: { flex: "1", textAlign: "left" } } as unknown as DomphyElement,
            ],
            href: project.href ?? "#",
            style: linkStyle,
          } as unknown as DomphyElement,
          {
            button: sidebarIcon(ICON_MORE),
            type: "button",
            dataSlot: "row-more",
            ariaLabel: `${project.title} actions`,
            style: {
              display: (l: Listener) => (moreOpen.get(l) ? "inline-flex" : "none"),
              flexShrink: "0",
              border: "none",
              background: "none",
              cursor: "pointer",
              color: (l: Listener) => themeColor(l, "shift-7", "neutral"),
            },
            $: [popover({ open: moreOpen, placement: "right-start", content: moreMenu })],
          } as unknown as DomphyElement,
        ],
        style: {
          display: (l: Listener) => (collapsed.get(l) ? "none" : "flex"),
          alignItems: "center",
          width: "100%",
          gap: (l: Listener) => themeSpacing(themeDensity(l) * 1),
          paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 2),
          paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
          borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
          color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
          backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
          "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
          "&:hover [data-slot=row-more], &:focus-within [data-slot=row-more]": {
            display: "inline-flex",
          },
        },
      } as unknown as DomphyElement,
      {
        a: [project.icon ? sidebarIcon(project.icon) : { span: project.title[0] }],
        href: project.href ?? "#",
        ariaLabel: project.title,
        style: {
          display: (l: Listener) => (collapsed.get(l) ? "flex" : "none"),
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 2),
          borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
          textDecoration: () => "none",
          color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
          backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
          "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
        },
        $: [tooltip({ content: project.title, placement: "right" })],
      } as unknown as DomphyElement,
    ],
    _key: project.title,
  } as DomphyElement<"li">;
}

/** Trailing muted "More" row that upstream nav-projects renders under the list. */
function renderProjectsMoreRow(): DomphyElement<"li"> {
  return {
    li: [
      {
        button: [
          sidebarIcon(ICON_MORE),
          { span: "More", style: { flex: "1", textAlign: "left" } } as unknown as DomphyElement,
        ],
        type: "button",
        style: {
          display: "flex",
          alignItems: "center",
          width: "100%",
          gap: (l: Listener) => themeSpacing(themeDensity(l) * 2),
          paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 2),
          paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
          borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
          border: "none",
          background: "none",
          cursor: "pointer",
          textAlign: "left",
          color: (l: Listener) => themeColor(l, "shift-7", "neutral"),
          backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
          "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
        },
      } as unknown as DomphyElement,
    ],
    _key: "__more",
  } as DomphyElement<"li">;
}

/** User footer: avatar + two-line label + chevrons, opens an account menu. */
function renderUserFooter(user: SidebarUser): DomphyElement<"div"> {
  const dropdown: DomphyElement<"div"> = {
    div: null,
    style: { minWidth: themeSpacing(48) },
    $: [menu({ items: [{ label: "Account" }, { label: "Billing" }, { label: "Log out" }] })],
  } as unknown as DomphyElement<"div">;

  const avatarChild: DomphyElement<"span"> = user.avatarUrl
    ? ({
        span: [{ img: null, src: user.avatarUrl, alt: user.name } as unknown as DomphyElement],
        $: [avatar({ color: "primary" })],
      } as unknown as DomphyElement<"span">)
    : ({ span: initialsOf(user.name), $: [avatar({ color: "primary" })] } as unknown as DomphyElement<"span">);

  return {
    div: [
      {
        button: [avatarChild, twoLineLabel(user.name, user.email), sidebarIcon(ICON_CHEVRONS_UPDOWN)],
        type: "button",
        ariaLabel: "Account menu",
        style: {
          display: "flex",
          alignItems: "center",
          width: "100%",
          gap: (l: Listener) => themeSpacing(themeDensity(l) * 2),
          padding: (l: Listener) => themeSpacing(themeDensity(l) * 2),
          borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
          border: "none",
          cursor: "pointer",
          overflow: "hidden",
          color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
          backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
          "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
        },
        $: [popover({ placement: "top", content: dropdown })],
      } as unknown as DomphyElement,
    ],
    style: {
      padding: (l: Listener) => themeSpacing(themeDensity(l) * 2),
      borderTop: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    },
  } as unknown as DomphyElement<"div">;
}

export {
  renderTeamSwitcher,
  renderPlainNavRow,
  renderExpandableNavRow,
  renderProjectRow,
  renderProjectsMoreRow,
  renderUserFooter,
};
