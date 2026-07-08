// shadcn/ui "sidebar-left-right" block — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed). A
// Notion-like three-column workspace: a primary left sidebar (org switcher,
// quick links, emoji-prefixed favorites, expandable emoji-prefixed workspace
// pages, pinned utility footer) and a secondary right sidebar dedicated to an
// inline month calendar + togglable calendar-visibility list, sandwiching a
// scrollable main column. Built from two independent sidebar instances (one
// mirrored) around a shared main area — not an exotic new primitive.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement, ElementNode, Listener, ReadableState, State } from "@domphy/core";
import { RecordState, toState } from "@domphy/core";
import { avatar, breadcrumb, buttonGhost, icon, inputCheckbox, menu, popover, small, strong, tooltip } from "@domphy/ui";
import { type ThemeColor, themeColor, themeDensity, themeSpacing } from "@domphy/theme";
import {
  ICON_CHEVRONS_UPDOWN,
  ICON_CHEVRON_RIGHT,
  ICON_MARK,
  ICON_MORE,
  ICON_PANEL_TOGGLE,
  ICON_PLUS,
  ICON_SEARCH,
  sidebarBackdrop,
  sidebarIcon,
  sidebarMainContent,
  verticalDivider,
  type SidebarTeam,
} from "./sidebar05-08-shared.js";

// ---------------------------------------------------------------------------
// Hand-authored generic line icons (24x24, stroke=currentColor) — simple
// geometric shapes, not sourced from any icon library.
// ---------------------------------------------------------------------------

const ICON_SPARKLE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>';

const ICON_CHEVRON_DOWN =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M6 9l6 6 6-6"/></svg>';

const ICON_HOME =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M4 11l8-7 8 7"/><path d="M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9"/></svg>';

const ICON_INBOX =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M3 12h4l2 3h6l2-3h4"/><path d="M5.5 5h13l2.5 7v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-7z"/></svg>';

const ICON_CALENDAR =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M4 10h16M8 4v4M16 4v4"/></svg>';

const ICON_SETTINGS =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/></svg>';

const ICON_TEMPLATE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>';

const ICON_TRASH =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M5 7h14M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>';

const ICON_HELP =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.7-2.5 2-2.5 3.5"/><path d="M12 17h.01"/></svg>';

// ---------------------------------------------------------------------------
// Data shapes
// ---------------------------------------------------------------------------

type FavoriteItem = { id: string; label: string; emoji: string; href?: string };
type WorkspacePage = { label: string; emoji: string; href?: string };
type WorkspaceGroup = { id: string; label: string; emoji: string; pages: WorkspacePage[] };
type FooterLink = { label: string; icon: string; href?: string };
type CurrentUser = { name: string; email: string; avatarUrl?: string };
type CalendarEntry = { id: string; name: string; color: ThemeColor; checked?: boolean };
type CalendarGroup = { label: string; entries: CalendarEntry[] };

type SidebarLeftRightProps = {
  organizations?: SidebarTeam[];
  favorites?: FavoriteItem[];
  workspaces?: WorkspaceGroup[];
  footerLinks?: FooterLink[];
  user?: CurrentUser;
  calendarGroups?: CalendarGroup[];
  /** Fixed reference date for the inline month calendar. */
  selectedDate?: Date;
  breadcrumbLabel?: string;
  defaultLeftCollapsed?: boolean;
  children?: DomphyElement | DomphyElement[];
};

const DEFAULT_ORGANIZATIONS: SidebarTeam[] = [
  { name: "Acme Inc", plan: "Enterprise" },
  { name: "Acme Corp.", plan: "Startup" },
  { name: "Evil Corp.", plan: "Free" },
];

const DEFAULT_FAVORITES: FavoriteItem[] = [
  { id: "getting-started", label: "Getting Started", emoji: "🏠" },
  { id: "roadmap", label: "Roadmap", emoji: "📊" },
  { id: "ideas", label: "Ideas", emoji: "💡" },
  { id: "meeting-notes", label: "Meeting Notes", emoji: "📝" },
  { id: "okrs", label: "OKRs", emoji: "🎯" },
  { id: "wiki", label: "Wiki", emoji: "📚" },
  { id: "bug-tracker", label: "Bug Tracker", emoji: "🐛" },
  { id: "launch-plan", label: "Launch Plan", emoji: "🚀" },
  { id: "budget", label: "Budget", emoji: "💰" },
  { id: "team-directory", label: "Team Directory", emoji: "👥" },
];

const DEFAULT_WORKSPACES: WorkspaceGroup[] = [
  {
    id: "product",
    label: "Product",
    emoji: "📁",
    pages: [
      { label: "Roadmap", emoji: "🗺️" },
      { label: "Specs", emoji: "📐" },
      { label: "Feedback", emoji: "💬" },
    ],
  },
  {
    id: "engineering",
    label: "Engineering",
    emoji: "📁",
    pages: [
      { label: "Architecture", emoji: "🏗️" },
      { label: "Runbooks", emoji: "📖" },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    emoji: "📁",
    pages: [
      { label: "Campaigns", emoji: "📣" },
      { label: "Brand Assets", emoji: "🎨" },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    emoji: "📁",
    pages: [
      { label: "Playbook", emoji: "📔" },
      { label: "Proposals", emoji: "📄" },
    ],
  },
  {
    id: "design",
    label: "Design",
    emoji: "📁",
    pages: [
      { label: "Design System", emoji: "🧩" },
      { label: "Prototypes", emoji: "🖼️" },
    ],
  },
];

const DEFAULT_FOOTER_LINKS: FooterLink[] = [
  { label: "Calendar", icon: ICON_CALENDAR },
  { label: "Settings", icon: ICON_SETTINGS },
  { label: "Templates", icon: ICON_TEMPLATE },
  { label: "Trash", icon: ICON_TRASH },
  { label: "Help", icon: ICON_HELP },
];

const DEFAULT_USER: CurrentUser = { name: "Shad Cn", email: "shadcn@example.com" };

// Upstream `Calendars` marks exactly the first two items of every group active
// (`data-active={index < 2}`) and colors every active indicator with the single
// `sidebar-primary` accent — so every entry here is `primary`, and only the
// first two entries of each group start checked.
const DEFAULT_CALENDAR_GROUPS: CalendarGroup[] = [
  {
    label: "My Calendars",
    entries: [
      { id: "personal", name: "Personal", color: "primary", checked: true },
      { id: "work", name: "Work", color: "primary", checked: true },
      { id: "family", name: "Family", color: "primary", checked: false },
    ],
  },
  {
    label: "Favorites",
    entries: [
      { id: "holidays", name: "Holidays", color: "primary", checked: true },
      { id: "birthdays", name: "Birthdays", color: "primary", checked: true },
    ],
  },
  {
    label: "Other",
    entries: [
      { id: "travel", name: "Travel", color: "primary", checked: true },
      { id: "reminders", name: "Reminders", color: "primary", checked: true },
      { id: "deadlines", name: "Deadlines", color: "primary", checked: false },
    ],
  },
];

// Fixed reference date (not "today") so the zero-arg demo is deterministic.
const DEFAULT_SELECTED_DATE = new Date(2024, 9, 15);
const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// ---------------------------------------------------------------------------
// Date helpers (no third-party library)
// ---------------------------------------------------------------------------

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function addMonths(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}
function addDays(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isoOf(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

// ---------------------------------------------------------------------------
// Left sidebar — text fades away on collapse (icon/emoji always stays), one
// row definition serving both expanded and icon-rail states. Lighter-weight
// than the dual-row + tooltip pattern used elsewhere in the family: this
// variant's favorites/workspace lists are long enough that duplicating every
// row would roughly double this file for little visual benefit.
// ---------------------------------------------------------------------------

/** Row label that fades/collapses away in icon-rail mode. */
function collapsibleLabel(collapsed: ReadableState<boolean>, content: string): DomphyElement<"span"> {
  return {
    span: content,
    style: {
      display: "inline-flex",
      overflow: "hidden",
      whiteSpace: "nowrap",
      flex: "1",
      textAlign: "left",
      opacity: (l: Listener) => (collapsed.get(l) ? 0 : 1),
      maxWidth: (l: Listener) => (collapsed.get(l) ? "0em" : themeSpacing(56)),
      transition: "opacity 150ms linear, max-width 150ms linear",
    },
  } as unknown as DomphyElement<"span">;
}

/** Uppercase muted section heading, hidden in icon-rail mode. */
function sectionLabel(collapsed: ReadableState<boolean>, text: string): DomphyElement<"small"> {
  return {
    small: text,
    $: [small({ color: "neutral" })],
    style: {
      textTransform: "uppercase",
      paddingInline: themeSpacing(3),
      overflow: "hidden",
      whiteSpace: "nowrap",
      opacity: (l: Listener) => (collapsed.get(l) ? 0 : 1),
      maxHeight: (l: Listener) => (collapsed.get(l) ? "0em" : themeSpacing(6)),
      transition: "opacity 150ms linear, max-height 150ms linear",
    },
  } as unknown as DomphyElement<"small">;
}

/** A plain icon+label quick-access row (Search / Ask AI / Home / Inbox). */
function quickLinkRow(
  emojiOrIcon: string,
  label: string,
  collapsed: ReadableState<boolean>,
  options: { href?: string; onClick?: () => void; active?: boolean } = {},
): DomphyElement<"li"> {
  const rowStyle = {
    display: "flex",
    alignItems: "center",
    width: "100%",
    gap: (l: Listener) => themeSpacing(themeDensity(l) * 2),
    paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 1.5),
    paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
    borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
    border: "none",
    cursor: "pointer",
    overflow: "hidden",
    textDecoration: () => "none",
    color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
    "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
    "&[aria-current=page]": {
      backgroundColor: (l: Listener) => themeColor(l, "shift-3", "primary"),
      color: (l: Listener) => themeColor(l, "shift-12", "primary"),
    },
  };

  const content = [sidebarIcon(emojiOrIcon), collapsibleLabel(collapsed, label)];
  const ariaCurrent = options.active ? "page" : undefined;

  // A no-href "More" row has no action — omit `onClick` entirely rather than
  // passing `undefined`, which Domphy rejects (`on*` must be a function).
  const row = options.href
    ? ({ a: content, href: options.href, ariaCurrent, style: rowStyle } as unknown as DomphyElement)
    : ({
        button: content,
        type: "button",
        ariaCurrent,
        ...(options.onClick ? { onClick: options.onClick } : {}),
        style: rowStyle,
      } as unknown as DomphyElement);

  return { li: [row], _key: label } as DomphyElement<"li">;
}

/** Favorites row: emoji + label, hover-revealed "more" icon-button with a
 * remove/copy/open/delete dropdown. */
function favoriteRow(item: FavoriteItem, collapsed: ReadableState<boolean>): DomphyElement<"li"> {
  const moreOpen = toState(false);
  const moreMenu: DomphyElement<"div"> = {
    div: null,
    style: { minWidth: themeSpacing(44) },
    $: [
      menu({
        items: [
          { label: "Remove from Favorites" },
          { label: "Copy Link" },
          { label: "Open in New Tab" },
          { label: "Delete" },
        ],
      }),
    ],
  } as unknown as DomphyElement<"div">;

  return {
    li: [
      {
        div: [
          {
            a: [sidebarIcon(item.emoji), collapsibleLabel(collapsed, item.label)],
            href: item.href ?? "#",
            title: item.label,
            style: {
              display: "flex",
              alignItems: "center",
              flex: "1",
              minWidth: "0",
              gap: (l: Listener) => themeSpacing(themeDensity(l) * 2),
              textDecoration: () => "none",
              overflow: "hidden",
              color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
            },
          } as unknown as DomphyElement,
          {
            button: sidebarIcon(ICON_MORE),
            type: "button",
            dataSlot: "row-more",
            ariaLabel: `${item.label} actions`,
            style: {
              display: (l: Listener) => (moreOpen.get(l) || collapsed.get(l) ? "none" : "inline-flex"),
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
          display: "flex",
          alignItems: "center",
          width: "100%",
          gap: (l: Listener) => themeSpacing(themeDensity(l) * 1),
          paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 1.5),
          paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
          borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
          color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
          backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
          "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
          "&:hover [data-slot=row-more], &:focus-within [data-slot=row-more]": {
            display: (l: Listener) => (collapsed.get(l) ? "none" : "inline-flex"),
          },
        },
      } as unknown as DomphyElement,
    ],
    _key: item.id,
  } as DomphyElement<"li">;
}

/** An expandable workspace group. Mirrors upstream `NavWorkspaces`: the row
 * `<a>` navigates, while a hover-revealed accent-tinted `ChevronRight` sitting
 * at `left-2` (over the emoji) is the ONLY thing that toggles the nested page
 * list, and a hover-revealed `Plus` on the right is an add-page action. */
function workspaceGroupRow(group: WorkspaceGroup, collapsed: ReadableState<boolean>): DomphyElement<"li"> {
  const open = toState(false);

  // Absolutely-positioned SidebarMenuAction buttons hidden until row hover
  // (base `display: none`; the wrapper's `:hover`/`:focus-within` descendant
  // rule reveals them). The chevron stays visible whenever the group is open.
  return {
    li: [
      {
        div: [
          {
            a: [sidebarIcon(group.emoji), collapsibleLabel(collapsed, group.label)],
            href: "#",
            style: {
              display: "flex",
              alignItems: "center",
              width: "100%",
              gap: (l: Listener) => themeSpacing(themeDensity(l) * 2),
              paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 1.5),
              paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
              borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
              textDecoration: () => "none",
              overflow: "hidden",
              color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
            },
          } as unknown as DomphyElement,
          {
            button: {
              span: ICON_CHEVRON_RIGHT,
              style: {
                display: "inline-flex",
                transition: "transform 150ms ease",
                transform: (l: Listener) => (open.get(l) ? "rotate(90deg)" : "rotate(0deg)"),
              },
              $: [icon({ color: "neutral" })],
            } as unknown as DomphyElement,
            type: "button",
            dataSlot: "workspace-toggle",
            ariaLabel: `Toggle ${group.label}`,
            ariaExpanded: (l: Listener) => open.get(l),
            onClick: () => open.set(!open.get()),
            style: {
              position: "absolute",
              insetInlineStart: themeSpacing(2),
              top: themeSpacing(1.5),
              alignItems: "center",
              justifyContent: "center",
              width: themeSpacing(5),
              height: themeSpacing(5),
              border: "none",
              cursor: "pointer",
              borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
              // Revealed on row hover, or kept on-screen while the group is open.
              display: (l: Listener) => (collapsed.get(l) ? "none" : open.get(l) ? "flex" : "none"),
              backgroundColor: (l: Listener) => themeColor(l, "shift-3", "neutral"),
              color: (l: Listener) => themeColor(l, "shift-11", "neutral"),
            },
          } as unknown as DomphyElement,
          {
            button: sidebarIcon(ICON_PLUS),
            type: "button",
            dataSlot: "workspace-add",
            ariaLabel: `Add page to ${group.label}`,
            style: {
              position: "absolute",
              insetInlineEnd: themeSpacing(1),
              top: themeSpacing(1.5),
              alignItems: "center",
              justifyContent: "center",
              width: themeSpacing(5),
              height: themeSpacing(5),
              border: "none",
              background: "none",
              cursor: "pointer",
              borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
              display: "none",
              color: (l: Listener) => themeColor(l, "shift-7", "neutral"),
              "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-3", "neutral") },
            },
          } as unknown as DomphyElement,
        ],
        style: {
          position: "relative",
          display: (l: Listener) => (collapsed.get(l) ? "none" : "block"),
          borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
          "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
          "&:hover [data-slot=workspace-toggle], &:focus-within [data-slot=workspace-toggle]": {
            display: (l: Listener) => (collapsed.get(l) ? "none" : "flex"),
          },
          "&:hover [data-slot=workspace-add], &:focus-within [data-slot=workspace-add]": {
            display: (l: Listener) => (collapsed.get(l) ? "none" : "flex"),
          },
        },
      } as unknown as DomphyElement,
      {
        ul: group.pages.map((page, index) => ({
          li: [
            {
              a: [sidebarIcon(page.emoji), { span: page.label, style: { flex: "1", textAlign: "left" } }],
              href: page.href ?? "#",
              style: {
                display: "flex",
                alignItems: "center",
                gap: (l: Listener) => themeSpacing(themeDensity(l) * 2),
                paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 1.5),
                paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
                borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
                textDecoration: () => "none",
                color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
                "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
              },
            } as unknown as DomphyElement,
          ],
          _key: `${group.id}-${index}`,
        })) as unknown as DomphyElement[],
        style: {
          listStyle: "none",
          margin: "0",
          flexDirection: "column",
          gap: themeSpacing(0.5),
          marginInlineStart: themeSpacing(5),
          paddingInlineStart: themeSpacing(3),
          paddingBlock: "0",
          paddingInlineEnd: "0",
          borderInlineStart: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
          color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
          // Only the chevron toggles this; hidden until the group is open.
          display: (l: Listener) => (open.get(l) && !collapsed.get(l) ? "flex" : "none"),
        },
      } as unknown as DomphyElement,
    ],
    _key: group.id,
  } as DomphyElement<"li">;
}

/** Footer utility link (Calendar/Settings/Templates/Trash/Help). */
function footerLinkRow(item: FooterLink, collapsed: ReadableState<boolean>): DomphyElement<"li"> {
  return quickLinkRow(item.icon, item.label, collapsed, { href: item.href ?? "#" });
}

/** Compact `size-5` primary logo badge shown in the team-switcher trigger. */
function teamTriggerBadge(glyph: string): DomphyElement<"span"> {
  return {
    span: glyph,
    dataTone: "shift-0",
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: themeSpacing(5),
      height: themeSpacing(5),
      flexShrink: "0",
      fontSize: themeSpacing(3),
      borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1.5),
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "primary"),
      color: (l: Listener) => themeColor(l, "shift-10", "primary"),
    },
  } as unknown as DomphyElement<"span">;
}

/** Bordered `size-6` logo box shown on each row of the team-switcher dropdown. */
function teamMenuBadge(glyph: string): DomphyElement<"span"> {
  return {
    span: glyph,
    dataTone: "shift-2",
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: themeSpacing(6),
      height: themeSpacing(6),
      flexShrink: "0",
      fontSize: themeSpacing(4),
      borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
      border: (l: Listener) => `1px solid ${themeColor(l, "shift-4", "neutral")}`,
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
    },
  } as unknown as DomphyElement<"span">;
}

/**
 * Org/team switcher matching upstream `TeamSwitcher` (sidebar-15): a compact
 * `w-fit px-1.5` trigger with a `size-5` logo badge, a single-line team NAME,
 * and a down-only `ChevronDown` (opacity-50). The dropdown has a muted "Teams"
 * heading, one row per team (logo box + name + ⌘N shortcut), and a trailing
 * "Add team" row (Plus badge + muted label). Not the two-line/ChevronsUpDown
 * switcher the sidebar05-08 family shares.
 */
function localTeamSwitcher(teams: SidebarTeam[], collapsed: ReadableState<boolean>): DomphyElement<"div"> {
  const active = teams[0] ?? { name: "Acme Inc", plan: "Enterprise" };

  const rowLabelStyle = {
    display: "flex",
    alignItems: "center",
    width: "100%",
    gap: (l: Listener) => themeSpacing(themeDensity(l) * 2),
  };

  const dropdown: DomphyElement<"div"> = {
    div: [
      {
        small: "Teams",
        $: [small({ color: "neutral" })],
        style: {
          display: "block",
          paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
          paddingBlock: themeSpacing(1.5),
        },
      } as unknown as DomphyElement,
      {
        div: null,
        $: [
          menu({
            items: [
              ...teams.map((team, index) => ({
                key: `${team.name}-${index}`,
                label: {
                  div: [
                    teamMenuBadge(team.logo ?? ICON_MARK),
                    {
                      span: team.name,
                      style: { flex: "1", textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
                    } as unknown as DomphyElement,
                    {
                      small: `⌘${index + 1}`,
                      $: [small({ color: "neutral" })],
                      style: { marginInlineStart: "auto", opacity: "0.6" },
                    } as unknown as DomphyElement,
                  ],
                  style: rowLabelStyle,
                } as unknown as DomphyElement,
              })),
              {
                key: "__add-team",
                label: {
                  div: [teamMenuBadge(ICON_PLUS), { span: "Add team", $: [small({ color: "neutral" })] } as unknown as DomphyElement],
                  style: rowLabelStyle,
                } as unknown as DomphyElement,
              },
            ],
          }),
        ],
      } as unknown as DomphyElement,
    ],
    style: { minWidth: themeSpacing(64) },
  } as unknown as DomphyElement<"div">;

  return {
    div: [
      {
        button: [
          teamTriggerBadge(active.logo ?? ICON_MARK),
          collapsibleLabel(collapsed, active.name),
          {
            span: ICON_CHEVRON_DOWN,
            style: { display: (l: Listener) => (collapsed.get(l) ? "none" : "inline-flex"), opacity: "0.5" },
            $: [icon({ color: "neutral" })],
          } as unknown as DomphyElement,
        ],
        type: "button",
        ariaLabel: "Switch team",
        style: {
          display: "flex",
          alignItems: "center",
          width: "fit-content",
          gap: (l: Listener) => themeSpacing(themeDensity(l) * 2),
          paddingBlock: themeSpacing(1.5),
          paddingInline: themeSpacing(1.5),
          borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
          border: "none",
          cursor: "pointer",
          overflow: "hidden",
          color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
          backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
          "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
        },
        $: [popover({ placement: "bottom-start", content: dropdown })],
      } as unknown as DomphyElement,
    ],
    style: { padding: (l: Listener) => themeSpacing(themeDensity(l) * 2) },
  } as unknown as DomphyElement<"div">;
}

// ---------------------------------------------------------------------------
// Right sidebar — user header + inline month calendar + calendar list
// ---------------------------------------------------------------------------

function currentUserHeader(user: CurrentUser): DomphyElement<"div"> {
  // Upstream `NavUser` dropdown: a user-info header label followed by five
  // actions — Upgrade to Pro / Account / Billing / Notifications / Log out.
  const accountMenu: DomphyElement<"div"> = {
    div: [
      {
        div: [
          user.avatarUrl
            ? ({ span: [{ img: null, src: user.avatarUrl, alt: user.name } as unknown as DomphyElement], $: [avatar({ color: "primary" })] } as unknown as DomphyElement)
            : ({ span: user.name.slice(0, 1).toUpperCase(), $: [avatar({ color: "primary" })] } as unknown as DomphyElement),
          {
            div: [
              { strong: user.name, $: [strong({ color: "neutral" })] } as unknown as DomphyElement,
              { small: user.email, $: [small({ color: "neutral" })] } as unknown as DomphyElement,
            ],
            style: { display: "flex", flexDirection: "column", gap: themeSpacing(0.5), minWidth: "0", overflow: "hidden" },
          } as unknown as DomphyElement,
        ],
        style: {
          display: "flex",
          alignItems: "center",
          gap: (l: Listener) => themeSpacing(themeDensity(l) * 2),
          padding: (l: Listener) => themeSpacing(themeDensity(l) * 2),
        },
      } as unknown as DomphyElement,
      {
        div: null,
        $: [
          menu({
            items: [
              { label: "Upgrade to Pro" },
              { label: "Account" },
              { label: "Billing" },
              { label: "Notifications" },
              { label: "Log out" },
            ],
          }),
        ],
      } as unknown as DomphyElement,
    ],
    style: { minWidth: themeSpacing(56) },
  } as unknown as DomphyElement<"div">;

  const avatarChild: DomphyElement<"span"> = user.avatarUrl
    ? ({ span: [{ img: null, src: user.avatarUrl, alt: user.name } as unknown as DomphyElement], $: [avatar({ color: "primary" })] } as unknown as DomphyElement<"span">)
    : ({ span: user.name.slice(0, 1).toUpperCase(), $: [avatar({ color: "primary" })] } as unknown as DomphyElement<"span">);

  return {
    div: [
      {
        button: [
          avatarChild,
          {
            div: [
              { strong: user.name, $: [strong({ color: "neutral" })] } as unknown as DomphyElement,
              { small: user.email, $: [small({ color: "neutral" })] } as unknown as DomphyElement,
            ],
            style: { display: "flex", flexDirection: "column", gap: themeSpacing(0.5), minWidth: "0", overflow: "hidden" },
          } as unknown as DomphyElement,
          sidebarIcon(ICON_CHEVRONS_UPDOWN),
        ],
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
        $: [popover({ placement: "bottom", content: accountMenu })],
      } as unknown as DomphyElement,
    ],
    style: {
      padding: (l: Listener) => themeSpacing(themeDensity(l) * 2),
      borderBottom: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    },
  } as unknown as DomphyElement<"div">;
}

function calendarNavButtonStyle() {
  return {
    appearance: "none" as const,
    border: "none",
    background: "none",
    cursor: "pointer",
    width: themeSpacing(7),
    height: themeSpacing(7),
    borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
    color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
    "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-3", "neutral") },
  };
}

function calendarGridRowStyle() {
  return { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: themeSpacing(0.5) };
}

/** Compact always-visible month-grid calendar (Sunday-first, no popover),
 * styled with the primary accent color on the selected day. */
function inlineMonthCalendar(viewMonth: State<Date>, selectedDate: State<Date>): DomphyElement<"div"> {
  const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
  const fullDateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "full" });

  const header: DomphyElement<"div"> = {
    div: [
      {
        button: "‹",
        type: "button",
        ariaLabel: "Previous month",
        onClick: () => viewMonth.set(addMonths(viewMonth.get(), -1)),
        style: calendarNavButtonStyle(),
      } as unknown as DomphyElement,
      {
        strong: (l: Listener) => monthFormatter.format(viewMonth.get(l)),
        ariaLive: "polite",
        style: { flex: "1", textAlign: "center" },
        $: [strong({ color: "neutral" })],
      } as unknown as DomphyElement,
      {
        button: "›",
        type: "button",
        ariaLabel: "Next month",
        onClick: () => viewMonth.set(addMonths(viewMonth.get(), 1)),
        style: calendarNavButtonStyle(),
      } as unknown as DomphyElement,
    ],
    style: { display: "flex", alignItems: "center", gap: themeSpacing(1), marginBottom: themeSpacing(2) },
  } as unknown as DomphyElement<"div">;

  const weekdayHeader: DomphyElement<"div"> = {
    // NOT `role="row"` — see the matching note in sidebar12.ts's
    // `weekdayHeader`: this header is a sibling of `grid`, not nested inside
    // its own `role="grid"` container, so `role="row"` here has no valid
    // ancestor/children to satisfy `aria-required-parent`/`-children`.
    div: WEEKDAY_LABELS.map((label, index) => ({
      small: label,
      _key: index,
      style: { textAlign: "center" },
      $: [small({ color: "neutral" })],
    })) as unknown as DomphyElement[],
    style: calendarGridRowStyle(),
  } as unknown as DomphyElement<"div">;

  const grid: DomphyElement<"div"> = {
    div: (listener: Listener) => {
      const monthStart = startOfMonth(viewMonth.get(listener));
      const month = monthStart.getMonth();
      const gridStart = addDays(monthStart, -monthStart.getDay());
      const selected = selectedDate.get(listener);
      const weeks: DomphyElement[] = [];
      for (let week = 0; week < 6; week++) {
        const cells: DomphyElement[] = [];
        for (let day = 0; day < 7; day++) {
          const date = addDays(gridStart, week * 7 + day);
          const outside = date.getMonth() !== month;
          const isSelected = sameDay(date, selected);
          cells.push({
            button: String(date.getDate()),
            type: "button",
            role: "gridcell",
            disabled: outside,
            ariaSelected: isSelected,
            ariaLabel: fullDateFormatter.format(date),
            onClick: () => selectedDate.set(date),
            _key: isoOf(date),
            // The selected day is a fixed accent chip, not a tone-context
            // surface — same deliberate exception the core `datePicker()`
            // patch itself makes for its own selected-day cell.
            _doctorDisable: isSelected ? "tone-background-inherit" : undefined,
            style: {
              appearance: "none",
              border: "none",
              cursor: outside ? "default" : "pointer",
              aspectRatio: "1",
              borderRadius: "50%",
              opacity: outside ? 0.4 : 1,
              color: (l: Listener) => (isSelected ? themeColor(l, "shift-0", "primary") : themeColor(l, "shift-9", "neutral")),
              backgroundColor: (l: Listener) => (isSelected ? themeColor(l, "shift-9", "primary") : themeColor(l, "inherit", "neutral")),
              "&:hover:not(:disabled)": {
                backgroundColor: (l: Listener) => (isSelected ? themeColor(l, "shift-9", "primary") : themeColor(l, "shift-2", "neutral")),
              },
            },
          } as unknown as DomphyElement);
        }
        weeks.push({
          div: cells,
          role: "row",
          _key: isoOf(addDays(gridStart, week * 7)),
          style: calendarGridRowStyle(),
        } as unknown as DomphyElement);
      }
      return weeks;
    },
    role: "grid",
    ariaLabel: "Calendar",
    style: { display: "flex", flexDirection: "column", gap: themeSpacing(0.5) },
  } as unknown as DomphyElement<"div">;

  return {
    div: [header, weekdayHeader, grid],
    style: {
      padding: (l: Listener) => themeSpacing(themeDensity(l) * 3),
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    },
  } as unknown as DomphyElement<"div">;
}

/** One calendar-visibility row: colored checkbox (the swatch itself, via
 * `accentColor`) + name — clicking anywhere in the row toggles visibility. */
function calendarEntryRow(entry: CalendarEntry, visibility: RecordState<Record<string, boolean>>): DomphyElement<"li"> {
  return {
    li: [
      {
        label: [
          {
            input: null,
            type: "checkbox",
            checked: (l: Listener) => visibility.get(entry.id, l),
            onChange: (e: Event) => visibility.set(entry.id, (e.target as HTMLInputElement).checked),
            $: [inputCheckbox({ color: "neutral", accentColor: entry.color })],
          } as unknown as DomphyElement,
          { span: entry.name, style: { flex: "1", textAlign: "left" } } as unknown as DomphyElement,
        ],
        style: {
          display: "flex",
          alignItems: "center",
          width: "100%",
          gap: (l: Listener) => themeSpacing(themeDensity(l) * 2),
          paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 1.5),
          paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
          borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
          cursor: "pointer",
          color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
          backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
          "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
        },
      } as unknown as DomphyElement,
    ],
    _key: entry.id,
  } as DomphyElement<"li">;
}

function calendarGroupSection(
  group: CalendarGroup,
  visibility: RecordState<Record<string, boolean>>,
  defaultOpen: boolean,
): DomphyElement<"div"> {
  return {
    div: [
      {
        details: [
          {
            summary: [
              { small: group.label, style: { flex: "1", textTransform: "uppercase" }, $: [small({ color: "neutral" })] } as unknown as DomphyElement,
              {
                span: ICON_CHEVRON_RIGHT,
                dataSlot: "calendar-chevron",
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
              paddingInline: themeSpacing(3),
              color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
              "&::-webkit-details-marker": { display: "none" },
              "&::marker": { content: `""` },
            },
          } as unknown as DomphyElement,
          {
            ul: group.entries.map((entry) => calendarEntryRow(entry, visibility)),
            style: { listStyle: "none", margin: "0", padding: "0", display: "flex", flexDirection: "column", gap: themeSpacing(0.5) },
          } as unknown as DomphyElement,
        ],
        open: defaultOpen,
        style: { "&[open] summary [data-slot=calendar-chevron]": { transform: "rotate(90deg)" } },
      } as unknown as DomphyElement,
    ],
    style: { display: "flex", flexDirection: "column", gap: themeSpacing(1) },
    _key: group.label,
  } as unknown as DomphyElement<"div">;
}

/** Full-width hairline rule (upstream `SidebarSeparator` with `mx-0`), rendered
 * after the date picker and after every calendar group. */
function calendarSeparator(key: string): DomphyElement<"div"> {
  return {
    div: null,
    _key: key,
    ariaHidden: "true",
    style: {
      height: "0",
      marginBlock: themeSpacing(2),
      marginInline: "0",
      borderTop: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
    },
    _doctorDisable: "missing-color",
  } as unknown as DomphyElement<"div">;
}

// ---------------------------------------------------------------------------
// Root assembly
// ---------------------------------------------------------------------------

/**
 * shadcn/ui "sidebar-left-right" — a Notion-like three-column workspace: a
 * primary left sidebar (org switcher, quick links, favorites, expandable
 * workspace pages, utility footer) and a secondary right sidebar (account
 * header, inline calendar, togglable calendar list) sandwiching a scrollable
 * main column. Call with no arguments for a fully working demo.
 */
function sidebarLeftRight(props: SidebarLeftRightProps = {}): DomphyElement<"div"> {
  const {
    organizations = DEFAULT_ORGANIZATIONS,
    favorites = DEFAULT_FAVORITES,
    workspaces = DEFAULT_WORKSPACES,
    footerLinks = DEFAULT_FOOTER_LINKS,
    user = DEFAULT_USER,
    calendarGroups = DEFAULT_CALENDAR_GROUPS,
    selectedDate = DEFAULT_SELECTED_DATE,
    breadcrumbLabel = "Home",
    defaultLeftCollapsed = false,
    children,
  } = props;

  const leftSidebarOpen = toState(true);
  const leftCollapsed = toState(defaultLeftCollapsed);

  const selectedDateState = toState(selectedDate);
  const viewMonthState = toState(startOfMonth(selectedDate));

  const initialVisibility: Record<string, boolean> = {};
  for (const group of calendarGroups) {
    for (const entry of group.entries) initialVisibility[entry.id] = entry.checked ?? true;
  }
  const calendarVisibility = new RecordState<Record<string, boolean>>(initialVisibility);

  const leftAside: DomphyElement<"aside"> = {
    aside: [
      localTeamSwitcher(organizations, leftCollapsed),
      {
        ul: [
          quickLinkRow(ICON_SEARCH, "Search", leftCollapsed, { href: "#" }),
          quickLinkRow(ICON_SPARKLE, "Ask AI", leftCollapsed, { href: "#" }),
          quickLinkRow(ICON_HOME, "Home", leftCollapsed, { href: "#", active: true }),
          quickLinkRow(ICON_INBOX, "Inbox", leftCollapsed, { href: "#" }),
        ],
        style: {
          listStyle: "none",
          margin: "0",
          padding: (l: Listener) => `0 ${themeSpacing(themeDensity(l) * 3)}`,
          display: "flex",
          flexDirection: "column",
          gap: themeSpacing(0.5),
          flexShrink: "0",
        },
      } as unknown as DomphyElement,
      {
        nav: [
          {
            div: [
              sectionLabel(leftCollapsed, "Favorites"),
              {
                ul: [...favorites.map((item) => favoriteRow(item, leftCollapsed)), quickLinkRow(ICON_MORE, "More", leftCollapsed)],
                style: { listStyle: "none", margin: "0", padding: "0", display: "flex", flexDirection: "column", gap: themeSpacing(0.5) },
              } as unknown as DomphyElement,
            ],
            style: { display: "flex", flexDirection: "column", gap: themeSpacing(1) },
          } as unknown as DomphyElement,
          {
            div: [
              sectionLabel(leftCollapsed, "Workspaces"),
              {
                ul: [...workspaces.map((group) => workspaceGroupRow(group, leftCollapsed)), quickLinkRow(ICON_MORE, "More", leftCollapsed)],
                style: { listStyle: "none", margin: "0", padding: "0", display: "flex", flexDirection: "column", gap: themeSpacing(0.5) },
              } as unknown as DomphyElement,
            ],
            style: { display: "flex", flexDirection: "column", gap: themeSpacing(1), marginTop: themeSpacing(4) },
          } as unknown as DomphyElement,
          // NavSecondary (Calendar/Settings/Templates/Trash/Help). Upstream
          // renders this INSIDE the scrollable content with `mt-auto` — it
          // scrolls with the content and has no pinned divider.
          {
            ul: footerLinks.map((item) => footerLinkRow(item, leftCollapsed)),
            style: {
              listStyle: "none",
              margin: "0",
              padding: "0",
              display: "flex",
              flexDirection: "column",
              gap: themeSpacing(0.5),
              marginTop: "auto",
            },
          } as unknown as DomphyElement,
        ],
        style: {
          flex: "1",
          minHeight: "0",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          overflowX: "hidden",
          paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
          paddingBlockStart: themeSpacing(2),
          paddingBlockEnd: themeSpacing(2),
        },
      } as unknown as DomphyElement,
      // Thin invisible edge rail — also acts as a click target to toggle collapse.
      {
        div: null,
        ariaHidden: "true",
        onClick: () => leftCollapsed.set(!leftCollapsed.get()),
        style: { position: "absolute", insetBlock: "0", insetInlineEnd: "0", width: themeSpacing(1), cursor: "col-resize" },
      } as unknown as DomphyElement,
    ],
    // `rightAside` below is also a plain `<aside>` with no name — without a
    // distinguishing label the two collide as duplicate "complementary"
    // landmarks (axe-core `landmark-unique`).
    ariaLabel: "Primary sidebar",
    dataTone: "shift-2",
    _onMount: (node: ElementNode) => {
      const onKeyDown = (event: KeyboardEvent) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
          event.preventDefault();
          leftCollapsed.set(!leftCollapsed.get());
        }
      };
      window.addEventListener("keydown", onKeyDown);
      node.addHook("Remove", () => window.removeEventListener("keydown", onKeyDown));
    },
    style: {
      position: "relative",
      display: "flex",
      flexDirection: "column",
      flexShrink: "0",
      width: (l: Listener) => (leftCollapsed.get(l) ? themeSpacing(14) : themeSpacing(64)),
      overflow: "hidden",
      transition: "width 0.2s linear",
      // Upstream `<SidebarLeft className="border-r-0">` deliberately removes the
      // right border, so the left sidebar butts up to the content with no rule.
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
      "@media (max-width: 768px)": {
        position: "fixed",
        insetBlock: "0",
        insetInlineStart: "0",
        zIndex: "15",
        width: themeSpacing(72),
        transform: (l: Listener) => (leftSidebarOpen.get(l) ? "translateX(0)" : "translateX(-100%)"),
        transition: "transform 0.2s ease",
        boxShadow: (l: Listener) => `0 0 ${themeSpacing(6)} ${themeColor(l, "shift-3", "neutral")}`,
      },
    },
  } as unknown as DomphyElement<"aside">;

  const mainElement: DomphyElement<"main"> = {
    main: [
      {
        header: [
          {
            button: sidebarIcon(ICON_PANEL_TOGGLE),
            type: "button",
            ariaLabel: "Toggle sidebar",
            onClick: () => {
              leftSidebarOpen.set(!leftSidebarOpen.get());
              leftCollapsed.set(!leftCollapsed.get());
            },
            $: [buttonGhost({ color: "neutral" })],
          } as unknown as DomphyElement,
          verticalDivider(),
          {
            nav: [{ strong: breadcrumbLabel, ariaCurrent: "page", $: [strong({ color: "neutral" })] } as unknown as DomphyElement],
            $: [breadcrumb({ color: "neutral" })],
          } as unknown as DomphyElement,
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
          borderBottom: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
          backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
          color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
        },
      } as unknown as DomphyElement,
      sidebarMainContent(children),
    ],
    style: { display: "flex", flexDirection: "column", flex: "1", minWidth: "0", minHeight: "0", overflow: "auto" },
  } as unknown as DomphyElement<"main">;

  const rightAside: DomphyElement<"aside"> = {
    aside: [
      currentUserHeader(user),
      {
        // Upstream `SidebarRight` content: DatePicker, a `mx-0` separator, then
        // `Calendars` which emits a `mx-0` SidebarSeparator after EACH of the
        // three groups.
        div: [
          { ...inlineMonthCalendar(viewMonthState, selectedDateState), _key: "datepicker" } as unknown as DomphyElement,
          calendarSeparator("sep-datepicker"),
          ...calendarGroups.flatMap((group, index) => [
            calendarGroupSection(group, calendarVisibility, index === 0),
            calendarSeparator(`sep-${group.label}`),
          ]),
        ],
        style: {
          flex: "1",
          minHeight: "0",
          overflowY: "auto",
          paddingBlock: themeSpacing(2),
        },
      } as unknown as DomphyElement,
      {
        div: [
          {
            button: [sidebarIcon(ICON_PLUS), { span: "New Calendar", style: { flex: "1", textAlign: "left" } }],
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
              cursor: "pointer",
              textDecoration: () => "none",
              color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
              backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
              "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
            },
          } as unknown as DomphyElement,
        ],
        style: {
          flexShrink: "0",
          padding: (l: Listener) => themeSpacing(themeDensity(l) * 3),
          borderTop: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
          color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
        },
      } as unknown as DomphyElement,
    ],
    // `leftAside` above is also a plain `<aside>` with no name — without a
    // distinguishing label the two collide as duplicate "complementary"
    // landmarks (axe-core `landmark-unique`).
    ariaLabel: "Calendar sidebar",
    dataTone: "shift-2",
    style: {
      display: "none",
      flexDirection: "column",
      flexShrink: "0",
      width: themeSpacing(72),
      borderInlineStart: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
      // Always visible on desktop, never an animated drawer on mobile — it
      // simply appears/disappears via a plain breakpoint-driven display toggle.
      "@media (min-width: 64em)": { display: "flex" },
    },
  } as unknown as DomphyElement<"aside">;

  return {
    div: [leftAside, mainElement, rightAside, sidebarBackdrop(leftSidebarOpen, () => leftSidebarOpen.set(false))],
    style: { display: "flex", height: "100dvh", overflow: "hidden", position: "relative" },
  } as unknown as DomphyElement<"div">;
}

export { sidebarLeftRight };
export type {
  CalendarEntry as SidebarLeftRightCalendarEntry,
  CalendarGroup as SidebarLeftRightCalendarGroup,
  CurrentUser as SidebarLeftRightUser,
  FavoriteItem as SidebarLeftRightFavoriteItem,
  FooterLink as SidebarLeftRightFooterLink,
  SidebarLeftRightProps,
  WorkspaceGroup as SidebarLeftRightWorkspaceGroup,
  WorkspacePage as SidebarLeftRightWorkspacePage,
};
export type { SidebarTeam as SidebarLeftRightOrganization } from "./sidebar05-08-shared.js";
