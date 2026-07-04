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
  ICON_MORE,
  ICON_PANEL_TOGGLE,
  ICON_PLUS,
  ICON_SEARCH,
  renderTeamSwitcher,
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
  { name: "Acme Corp", plan: "Startup" },
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

const DEFAULT_CALENDAR_GROUPS: CalendarGroup[] = [
  {
    label: "My Calendars",
    entries: [
      { id: "personal", name: "Personal", color: "primary", checked: true },
      { id: "work", name: "Work", color: "secondary", checked: true },
      { id: "family", name: "Family", color: "success", checked: true },
    ],
  },
  {
    label: "Favorites",
    entries: [
      { id: "holidays", name: "Holidays", color: "warning", checked: true },
      { id: "birthdays", name: "Birthdays", color: "error", checked: false },
    ],
  },
  {
    label: "Other",
    entries: [
      { id: "travel", name: "Travel", color: "info", checked: false },
      { id: "reminders", name: "Reminders", color: "neutral", checked: true },
      { id: "deadlines", name: "Deadlines", color: "error", checked: true },
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
  options: { href?: string; onClick?: () => void; badge?: number } = {},
): DomphyElement<"li"> {
  const badgeElement = options.badge
    ? ({
        span: String(options.badge),
        dataTone: "shift-0",
        style: {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: themeSpacing(5),
          paddingInline: themeSpacing(1.5),
          borderRadius: themeSpacing(999),
          opacity: (l: Listener) => (collapsed.get(l) ? 0 : 1),
          backgroundColor: (l: Listener) => themeColor(l, "inherit", "primary"),
          color: (l: Listener) => themeColor(l, "shift-10", "primary"),
        },
      } as unknown as DomphyElement)
    : null;

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
  };

  const content = [sidebarIcon(emojiOrIcon), collapsibleLabel(collapsed, label), ...(badgeElement ? [badgeElement] : [])];

  return {
    li: [
      options.href
        ? ({ a: content, href: options.href, style: rowStyle } as unknown as DomphyElement)
        : ({ button: content, type: "button", onClick: options.onClick, style: rowStyle } as unknown as DomphyElement),
    ],
    _key: label,
  } as DomphyElement<"li">;
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

/** An expandable workspace group: emoji + label + chevron, revealing a
 * nested list of emoji-prefixed pages on click. */
function workspaceGroupRow(group: WorkspaceGroup, collapsed: ReadableState<boolean>): DomphyElement<"li"> {
  return {
    li: [
      {
        details: [
          {
            summary: [
              sidebarIcon(group.emoji),
              collapsibleLabel(collapsed, group.label),
              {
                span: ICON_CHEVRON_RIGHT,
                style: {
                  transition: "transform 150ms ease",
                  display: (l: Listener) => (collapsed.get(l) ? "none" : "inline-flex"),
                },
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
              paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 1.5),
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
              display: "flex",
              flexDirection: "column",
              gap: themeSpacing(0.5),
              marginInlineStart: themeSpacing(5),
              paddingInlineStart: themeSpacing(3),
              paddingBlock: "0",
              paddingInlineEnd: "0",
              borderInlineStart: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
              color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
            },
          } as unknown as DomphyElement,
        ],
        style: {
          display: (l: Listener) => (collapsed.get(l) ? "none" : "block"),
          "&[open] summary span": { transform: "rotate(90deg)" },
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

// ---------------------------------------------------------------------------
// Right sidebar — user header + inline month calendar + calendar list
// ---------------------------------------------------------------------------

function currentUserHeader(user: CurrentUser): DomphyElement<"div"> {
  const accountMenu: DomphyElement<"div"> = {
    div: null,
    style: { minWidth: themeSpacing(44) },
    $: [menu({ items: [{ label: "Account" }, { label: "Billing" }, { label: "Log out" }] })],
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

function calendarGroupSection(group: CalendarGroup, visibility: RecordState<Record<string, boolean>>): DomphyElement<"div"> {
  return {
    div: [
      {
        small: group.label,
        style: { textTransform: "uppercase", paddingInline: themeSpacing(3) },
        $: [small({ color: "neutral" })],
      } as unknown as DomphyElement,
      {
        ul: group.entries.map((entry) => calendarEntryRow(entry, visibility)),
        style: { listStyle: "none", margin: "0", padding: "0", display: "flex", flexDirection: "column", gap: themeSpacing(0.5) },
      } as unknown as DomphyElement,
    ],
    style: { display: "flex", flexDirection: "column", gap: themeSpacing(1) },
    _key: group.label,
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
      renderTeamSwitcher(organizations),
      {
        ul: [
          quickLinkRow(ICON_SEARCH, "Search", leftCollapsed, { href: "#" }),
          quickLinkRow(ICON_SPARKLE, "Ask AI", leftCollapsed, { href: "#" }),
          quickLinkRow(ICON_HOME, "Home", leftCollapsed, { href: "#" }),
          quickLinkRow(ICON_INBOX, "Inbox", leftCollapsed, { href: "#", badge: 3 }),
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
                ul: favorites.map((item) => favoriteRow(item, leftCollapsed)),
                style: { listStyle: "none", margin: "0", padding: "0", display: "flex", flexDirection: "column", gap: themeSpacing(0.5) },
              } as unknown as DomphyElement,
            ],
            style: { display: "flex", flexDirection: "column", gap: themeSpacing(1) },
          } as unknown as DomphyElement,
          {
            div: [
              sectionLabel(leftCollapsed, "Workspaces"),
              {
                ul: workspaces.map((group) => workspaceGroupRow(group, leftCollapsed)),
                style: { listStyle: "none", margin: "0", padding: "0", display: "flex", flexDirection: "column", gap: themeSpacing(0.5) },
              } as unknown as DomphyElement,
            ],
            style: { display: "flex", flexDirection: "column", gap: themeSpacing(1), marginTop: themeSpacing(4) },
          } as unknown as DomphyElement,
        ],
        style: {
          flex: "1",
          minHeight: "0",
          overflowY: "auto",
          overflowX: "hidden",
          paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
          paddingBlockStart: themeSpacing(2),
        },
      } as unknown as DomphyElement,
      {
        ul: footerLinks.map((item) => footerLinkRow(item, leftCollapsed)),
        style: {
          listStyle: "none",
          margin: "0",
          padding: (l: Listener) => themeSpacing(themeDensity(l) * 3),
          display: "flex",
          flexDirection: "column",
          gap: themeSpacing(0.5),
          flexShrink: "0",
          borderTop: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
          color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
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
      borderInlineEnd: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
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
        div: [
          inlineMonthCalendar(viewMonthState, selectedDateState),
          {
            div: null,
            ariaHidden: "true",
            style: {
              height: "0",
              marginInline: themeSpacing(3),
              borderTop: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
            },
            _doctorDisable: "missing-color",
          } as unknown as DomphyElement,
          {
            div: calendarGroups.map((group) => calendarGroupSection(group, calendarVisibility)),
            style: { display: "flex", flexDirection: "column", gap: themeSpacing(4), padding: (l: Listener) => themeSpacing(themeDensity(l) * 3) },
          } as unknown as DomphyElement,
        ],
        style: { flex: "1", minHeight: "0", overflowY: "auto" },
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
