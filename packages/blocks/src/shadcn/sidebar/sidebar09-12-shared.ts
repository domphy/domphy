// Shared building blocks for the shadcn "sidebar-0N" family (sidebar09..sidebar12).
// Not part of the package's public surface — each sidebarNN.ts file exports the
// actual factory function; this module holds icons/helpers reused across the
// four variants. It re-exports the generic icon-rail/backdrop/breadcrumb
// vocabulary already established by ./sidebar05-08-shared.ts (icons are
// hand-authored generic line glyphs, not sourced from any icon library) and
// adds a handful of icons unique to this batch (mail folders, files, home,
// calendar, settings, AI).
//
// Clean-room note: this is an independent reimplementation of the public
// *behavior* described in each block's spec — no upstream shadcn/ui source
// was viewed or copied.

import type { DomphyElement, Listener, State } from "@domphy/core";
import { toState } from "@domphy/core";
import { themeColor, themeDensity, themeSpacing } from "@domphy/theme";
import { sidebarIcon } from "./sidebar05-08-shared.js";

export {
  ICON_BAR_CHART,
  ICON_CHEVRON_RIGHT,
  ICON_CHEVRONS_UPDOWN,
  ICON_FOLDER,
  ICON_GRID,
  ICON_INBOX,
  ICON_LIFEBUOY,
  ICON_MARK,
  ICON_MESSAGE,
  ICON_MORE,
  ICON_PANEL_TOGGLE,
  ICON_PLUS,
  ICON_SEARCH,
  ICON_USERS,
  placeholderCard,
  placeholderPanel,
  renderExpandableNavRow,
  renderPlainNavRow,
  renderTeamSwitcher,
  renderUserFooter,
  type SidebarBreadcrumbItem,
  type SidebarNavChild,
  type SidebarNavMainItem,
  type SidebarTeam,
  type SidebarUser,
  sidebarBackdrop,
  sidebarBreadcrumb,
  sidebarMainContent,
  sidebarStickyHeader,
  srOnlyLabel,
  verticalDivider,
} from "./sidebar05-08-shared.js";

export { sidebarIcon };

// ---------------------------------------------------------------------------
// Icons unique to this batch — same hand-authored 24x24 stroke-glyph style as
// sidebar05-08-shared.ts's icon set.
// ---------------------------------------------------------------------------

const ICON_HOME =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/></svg>';

const ICON_DRAFTS =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M6 3h9l5 5v13H6z"/><path d="M15 3v5h5"/></svg>';

const ICON_SEND =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>';

const ICON_JUNK =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/></svg>';

const ICON_TRASH =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/></svg>';

const ICON_FILE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/></svg>';

const ICON_CALENDAR =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';

const ICON_SETTINGS =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';

const ICON_SPARKLE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>';

export {
  ICON_HOME,
  ICON_DRAFTS,
  ICON_SEND,
  ICON_JUNK,
  ICON_TRASH,
  ICON_FILE,
  ICON_CALENDAR,
  ICON_SETTINGS,
  ICON_SPARKLE,
};

// ---------------------------------------------------------------------------
// Shared row-style helpers
// ---------------------------------------------------------------------------

/** Standard interactive list-row style: icon + label + hover/active states. */
function interactiveRowStyle(dense = false) {
  return {
    display: "flex",
    alignItems: "center",
    width: "100%",
    gap: (l: Listener) => themeSpacing(themeDensity(l) * 2),
    paddingBlock: (l: Listener) =>
      themeSpacing(dense ? 1.5 : themeDensity(l) * 2),
    paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
    borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
    border: "none",
    background: "none",
    cursor: "pointer",
    textAlign: "left",
    textDecoration: () => "none",
    overflow: "hidden",
    whiteSpace: "nowrap",
    color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
    "&:hover": {
      backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral"),
    },
    "&[aria-current=page], &[aria-current=true]": {
      backgroundColor: (l: Listener) => themeColor(l, "shift-3", "primary"),
      color: (l: Listener) => themeColor(l, "shift-12", "primary"),
    },
  } as const;
}

/** Fixed-size emoji glyph slot (plain text, no typography overrides). */
function emojiGlyph(glyph: string): DomphyElement<"span"> {
  return {
    span: glyph,
    ariaHidden: "true",
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: themeSpacing(5),
      flexShrink: "0",
    },
  } as unknown as DomphyElement<"span">;
}

/** A single icon + label action row inside a "sidebar-styled" popover section. */
type PopoverActionItem = { icon?: string; label: string; onClick?: () => void };
type PopoverActionGroup = { items: PopoverActionItem[] };

export type { PopoverActionItem, PopoverActionGroup };

/**
 * Floating action-menu content that reuses the sidebar's own grouped-list
 * styling (bordered sections, icon+label rows) instead of a plain flat
 * dropdown — this is the "sidebar in a popover" pattern from sidebar10, but
 * generic enough that any block in this batch can reuse it for a quick
 * three-dot actions menu.
 */
function sidebarStyledPopoverContent(
  groups: PopoverActionGroup[],
): DomphyElement<"div"> {
  return {
    div: groups.map((group, groupIndex) => ({
      div: group.items.map((item, itemIndex) => ({
        button: [
          ...(item.icon ? [sidebarIcon(item.icon)] : []),
          {
            span: item.label,
            style: { flex: "1", textAlign: "left" },
          } as unknown as DomphyElement,
        ],
        type: "button",
        role: "menuitem",
        onClick: item.onClick ?? (() => {}),
        style: interactiveRowStyle(true),
        _key: itemIndex,
      })) as unknown as DomphyElement[],
      // `role="menu"` (below) requires its direct children to carry a
      // menu-item-family role (or "group") — this plain wrapper div, with no
      // role of its own, failed both `aria-required-children` (on the menu)
      // and `aria-required-parent` (on each `menuitem` button one level down).
      role: "group",
      style: {
        display: "flex",
        flexDirection: "column",
        paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 1),
        paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 1),
        borderBottom:
          groupIndex < groups.length - 1
            ? (l: Listener) =>
                `1px solid ${themeColor(l, "shift-3", "neutral")}`
            : undefined,
      },
      _key: groupIndex,
    })) as unknown as DomphyElement[],
    dataTone: "shift-0",
    role: "menu",
    style: {
      display: "flex",
      flexDirection: "column",
      minWidth: themeSpacing(56),
      borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 2),
      border: (l: Listener) =>
        `1px solid ${themeColor(l, "shift-3", "neutral")}`,
      boxShadow: (l: Listener) =>
        `0 ${themeSpacing(2)} ${themeSpacing(8)} ${themeColor(l, "shift-4", "neutral")}`,
      overflow: "hidden",
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    },
  } as unknown as DomphyElement<"div">;
}

export { interactiveRowStyle, emojiGlyph, sidebarStyledPopoverContent };

// ---------------------------------------------------------------------------
// Overflow "show more" helper — several groups in this batch (favorites,
// workspaces) show an initial slice of items plus a real "More" row that
// reveals the rest, rather than a fixed/inert placeholder row.
// ---------------------------------------------------------------------------

function useShowMore<T>(
  items: T[],
  initialCount: number,
): { visible: State<boolean>; slice: (listener: Listener) => T[] } {
  const expanded = toState(false);
  return {
    visible: expanded,
    slice: (listener: Listener) =>
      expanded.get(listener) ? items : items.slice(0, initialCount),
  };
}

export { useShowMore };
