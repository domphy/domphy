// shadcn/ui "sidebar-10" — clean-room reimplementation from the public
// behavior description only (no upstream source viewed). A persistent
// workspace sidebar (team switcher, favorites, nested workspace tree,
// secondary links) whose per-item overflow menu and the header's quick-action
// menu open as a floating popover styled like a miniature sidebar (multiple
// bordered sections, icon+label rows) rather than a plain flat dropdown. See
// ./sidebar09-12-shared.ts and ./sidebar05-08-shared.ts.

import type { DomphyElement, Listener, State } from "@domphy/core";
import { toState } from "@domphy/core";
import { avatar, buttonGhost, icon, popover, small } from "@domphy/ui";
import { themeColor, themeDensity, themeSpacing } from "@domphy/theme";
import {
  ICON_BAR_CHART,
  ICON_CHEVRON_RIGHT,
  ICON_FILE,
  ICON_FOLDER,
  ICON_GRID,
  ICON_INBOX,
  ICON_LIFEBUOY,
  ICON_MORE,
  ICON_PANEL_TOGGLE,
  ICON_PLUS,
  ICON_SEARCH,
  ICON_TRASH,
  emojiGlyph,
  interactiveRowStyle,
  renderPlainNavRow,
  renderTeamSwitcher,
  renderUserFooter,
  sidebarBreadcrumb,
  sidebarIcon,
  sidebarMainContent,
  sidebarStyledPopoverContent,
  useShowMore,
  verticalDivider,
  type SidebarBreadcrumbItem,
  type SidebarNavMainItem,
  type SidebarTeam,
  type SidebarUser,
} from "./sidebar09-12-shared.js";
import { ICON_CALENDAR, ICON_HOME, ICON_SETTINGS, ICON_SPARKLE } from "./sidebar09-12-shared.js";

type Sidebar10FavoriteItem = { emoji: string; label: string; href?: string };
type Sidebar10Page = { title: string; href?: string; emoji?: string };

// Page-action icons the header's "…" menu needs that aren't in the shared set
// (lucide equivalents). Local to this block to keep the shared icon module lean.
const SVG_OPEN =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em">';
const ICON_LINK = `${SVG_OPEN}<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
const ICON_COPY = `${SVG_OPEN}<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
const ICON_MOVE_TO = `${SVG_OPEN}<polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>`;
const ICON_UNDO = `${SVG_OPEN}<polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>`;
const ICON_HISTORY = `${SVG_OPEN}<path d="M7 2h10"/><path d="M5 6h14"/><rect width="18" height="12" x="3" y="10" rx="2"/></svg>`;
const ICON_BELL = `${SVG_OPEN}<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`;
const ICON_IMPORT = `${SVG_OPEN}<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>`;
const ICON_EXPORT = `${SVG_OPEN}<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>`;
type Sidebar10Workspace = { name: string; emoji: string; expanded?: boolean; pages: Sidebar10Page[] };
type Sidebar10SecondaryLink = { title: string; icon: string; href?: string };

type Sidebar10Props = {
  teams?: SidebarTeam[];
  favorites?: Sidebar10FavoriteItem[];
  favoritesVisibleCount?: number;
  workspaces?: Sidebar10Workspace[];
  workspacesVisibleCount?: number;
  secondaryLinks?: Sidebar10SecondaryLink[];
  user?: SidebarUser;
  breadcrumbItems?: SidebarBreadcrumbItem[];
  children?: DomphyElement | DomphyElement[];
};

const DEFAULT_TEAMS: SidebarTeam[] = [
  { name: "Acme Inc", plan: "Enterprise" },
  { name: "Acme Corp", plan: "Startup" },
];

const DEFAULT_FAVORITES: Sidebar10FavoriteItem[] = [
  { emoji: "📊", label: "Roadmap" },
  { emoji: "📝", label: "Meeting Notes" },
  { emoji: "🎯", label: "OKRs" },
  { emoji: "🐛", label: "Bug Tracker" },
  { emoji: "🚀", label: "Launch Plan" },
  { emoji: "💰", label: "Budget" },
  { emoji: "📚", label: "Handbook" },
  { emoji: "🎨", label: "Design System" },
  { emoji: "📈", label: "Analytics" },
  { emoji: "🧭", label: "Onboarding" },
  { emoji: "🗓️", label: "Sprint Calendar" },
  { emoji: "🤝", label: "Partnerships" },
  { emoji: "🔐", label: "Security" },
];

const DEFAULT_WORKSPACES: Sidebar10Workspace[] = [
  {
    name: "Engineering",
    emoji: "🛠️",
    expanded: true,
    pages: [
      { emoji: "🏛️", title: "Architecture" },
      { emoji: "📄", title: "RFCs" },
      { emoji: "📟", title: "On-call" },
    ],
  },
  {
    name: "Product",
    emoji: "📦",
    pages: [
      { emoji: "🗺️", title: "Roadmap" },
      { emoji: "💬", title: "Feedback" },
      { emoji: "📋", title: "Specs" },
    ],
  },
  {
    name: "Design",
    emoji: "🎨",
    pages: [
      { emoji: "🧩", title: "Components" },
      { emoji: "🎟️", title: "Tokens" },
    ],
  },
  {
    name: "Marketing",
    emoji: "📣",
    pages: [
      { emoji: "🚀", title: "Campaigns" },
      { emoji: "🏷️", title: "Brand" },
      { emoji: "✍️", title: "Content" },
    ],
  },
  {
    name: "Sales",
    emoji: "💼",
    pages: [
      { emoji: "📈", title: "Pipeline" },
      { emoji: "📕", title: "Playbook" },
    ],
  },
  {
    name: "Finance",
    emoji: "💰",
    pages: [
      { emoji: "🔮", title: "Forecasts" },
      { emoji: "🧾", title: "Invoices" },
    ],
  },
];

const DEFAULT_SECONDARY_LINKS: Sidebar10SecondaryLink[] = [
  { title: "Calendar", icon: ICON_CALENDAR },
  { title: "Settings", icon: ICON_SETTINGS },
  { title: "Templates", icon: ICON_GRID },
  { title: "Trash", icon: ICON_TRASH },
  { title: "Help", icon: ICON_LIFEBUOY },
];

const DEFAULT_USER: SidebarUser = { name: "Shad Cn", email: "shadcn@example.com" };

/** Uppercase muted section heading (hidden in icon-rail mode). */
function sectionLabel(text: string, collapsed: State<boolean>): DomphyElement<"small"> {
  return {
    small: text,
    style: {
      display: (l: Listener) => (collapsed.get(l) ? "none" : "block"),
      paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
      paddingBlock: themeSpacing(1),
      textTransform: "uppercase",
    },
    $: [small({ color: "neutral" })],
  } as unknown as DomphyElement<"small">;
}

/** A favorite row: emoji + label + hover-revealed "more" popover trigger. */
function favoriteRow(item: Sidebar10FavoriteItem, collapsed: State<boolean>): DomphyElement<"li"> {
  const actionsMenu = sidebarStyledPopoverContent([
    { items: [{ label: "Rename" }, { label: "Copy link" }, { label: "Remove from favorites" }] },
  ]);

  return {
    li: [
      {
        div: [
          {
            a: [emojiGlyph(item.emoji), { span: item.label, style: { flex: "1", textAlign: "left" } } as unknown as DomphyElement],
            href: item.href ?? "#",
            style: { display: "flex", alignItems: "center", flex: "1", minWidth: "0", gap: themeSpacing(2), textDecoration: () => "none", overflow: "hidden", whiteSpace: "nowrap", color: (l: Listener) => themeColor(l, "shift-9", "neutral") },
          } as unknown as DomphyElement,
          {
            button: sidebarIcon(ICON_MORE),
            type: "button",
            dataSlot: "row-more",
            ariaLabel: `${item.label} actions`,
            style: {
              display: "none",
              flexShrink: "0",
              border: "none",
              background: "none",
              cursor: "pointer",
              color: (l: Listener) => themeColor(l, "shift-7", "neutral"),
            },
            $: [popover({ placement: "right-start", content: actionsMenu })],
          } as unknown as DomphyElement,
        ],
        style: {
          display: (l: Listener) => (collapsed.get(l) ? "none" : "flex"),
          alignItems: "center",
          width: "100%",
          gap: themeSpacing(1),
          paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 1.5),
          paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
          borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
          color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
          backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
          "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
          "&:hover [data-slot=row-more], &:focus-within [data-slot=row-more]": { display: "inline-flex" },
        },
      } as unknown as DomphyElement,
      {
        a: [emojiGlyph(item.emoji)],
        href: item.href ?? "#",
        ariaLabel: item.label,
        style: {
          display: (l: Listener) => (collapsed.get(l) ? "flex" : "none"),
          justifyContent: "center",
          paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 1.5),
          textDecoration: () => "none",
          color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
        },
      } as unknown as DomphyElement,
    ],
    _key: item.label,
  } as DomphyElement<"li">;
}

/** A workspace tree node: `<details>` accordion + hover add-page button + nested page list. */
function workspaceNode(workspace: Sidebar10Workspace, collapsed: State<boolean>): DomphyElement<"li"> {
  return {
    li: [
      {
        details: [
          {
            summary: [
              emojiGlyph(workspace.emoji),
              { span: workspace.name, style: { flex: "1", textAlign: "left" } } as unknown as DomphyElement,
              {
                button: sidebarIcon(ICON_PLUS),
                type: "button",
                dataSlot: "row-add",
                ariaLabel: `Add page to ${workspace.name}`,
                onClick: (event: Event) => {
                  event.preventDefault();
                  event.stopPropagation();
                },
                style: {
                  display: "none",
                  flexShrink: "0",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  color: (l: Listener) => themeColor(l, "shift-7", "neutral"),
                },
              } as unknown as DomphyElement,
              {
                span: ICON_CHEVRON_RIGHT,
                dataSlot: "chevron",
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
              gap: themeSpacing(2),
              width: "100%",
              paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 1.5),
              paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
              borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
              color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
              backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
              "&::-webkit-details-marker": { display: "none" },
              "&::marker": { content: `""` },
              "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
              "&:hover [data-slot=row-add]": { display: "inline-flex" },
            },
          } as unknown as DomphyElement,
          {
            ul: workspace.pages.map((page, index) => ({
              li: [
                {
                  a: [
                    ...(page.emoji ? [emojiGlyph(page.emoji)] : []),
                    { span: page.title, style: { flex: "1", textAlign: "left" } } as unknown as DomphyElement,
                  ],
                  href: page.href ?? "#",
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: themeSpacing(2),
                    paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 1.5),
                    paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
                    borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
                    textDecoration: () => "none",
                    color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
                    backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
                    "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
                  },
                } as unknown as DomphyElement,
              ],
              _key: index,
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
        open: workspace.expanded ?? false,
        style: {
          display: (l: Listener) => (collapsed.get(l) ? "none" : "block"),
          "&[open] summary [data-slot=chevron]": { transform: "rotate(90deg)" },
          "&[open] > ul": { maxHeight: themeSpacing(240), opacity: "1", paddingBlock: themeSpacing(1) },
        },
      } as unknown as DomphyElement,
    ],
    _key: workspace.name,
  } as DomphyElement<"li">;
}

/** A real "show more" toggle row — reveals the rest of an overflowed list. */
function moreRow(label: string, onClick: () => void, collapsed: State<boolean>): DomphyElement<"li"> {
  return {
    li: [
      {
        button: [sidebarIcon(ICON_MORE), { span: label, style: { flex: "1", textAlign: "left" } } as unknown as DomphyElement],
        type: "button",
        onClick,
        style: { ...interactiveRowStyle(true), color: (l: Listener) => themeColor(l, "shift-9", "neutral") },
      } as unknown as DomphyElement,
    ],
    _key: "show-more",
    style: { display: (l: Listener) => (collapsed.get(l) ? "none" : "block") },
  } as unknown as DomphyElement<"li">;
}

/** Overlapping avatar-stack shown in the main header's nav-actions cluster. */
function avatarStack(names: string[]): DomphyElement<"div"> {
  return {
    div: names.map((name, index) => ({
      span: name.slice(0, 1).toUpperCase(),
      _key: index,
      style: {
        marginInlineStart: index === 0 ? "0" : `-${themeSpacing(2)}`,
        outline: (l: Listener) => `2px solid ${themeColor(l, "inherit", "neutral")}`,
        outlineOffset: "0",
        color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
      },
      $: [avatar({ color: index % 2 === 0 ? "primary" : "neutral" })],
    })) as unknown as DomphyElement[],
    style: { display: "flex", alignItems: "center" },
  } as unknown as DomphyElement<"div">;
}

function mainHeader(props: {
  onToggle: () => void;
  breadcrumbItems: SidebarBreadcrumbItem[];
  memberNames: string[];
}): DomphyElement<"header"> {
  // Notion-style page-actions menu — matches upstream nav-actions.tsx's four
  // grouped sections.
  const actionsMenu = sidebarStyledPopoverContent([
    {
      items: [
        { icon: ICON_SETTINGS, label: "Customize Page" },
        { icon: ICON_FILE, label: "Turn into wiki" },
      ],
    },
    {
      items: [
        { icon: ICON_LINK, label: "Copy Link" },
        { icon: ICON_COPY, label: "Duplicate" },
        { icon: ICON_MOVE_TO, label: "Move to" },
        { icon: ICON_TRASH, label: "Move to Trash" },
      ],
    },
    {
      items: [
        { icon: ICON_UNDO, label: "Undo" },
        { icon: ICON_BAR_CHART, label: "View analytics" },
        { icon: ICON_HISTORY, label: "Version History" },
        { icon: ICON_TRASH, label: "Show delete pages" },
        { icon: ICON_BELL, label: "Notifications" },
      ],
    },
    {
      items: [
        { icon: ICON_IMPORT, label: "Import" },
        { icon: ICON_EXPORT, label: "Export" },
      ],
    },
  ]);

  return {
    header: [
      {
        button: [sidebarIcon(ICON_PANEL_TOGGLE)],
        type: "button",
        ariaLabel: "Toggle sidebar",
        onClick: props.onToggle,
        $: [buttonGhost({ color: "neutral" })],
      } as unknown as DomphyElement,
      verticalDivider(),
      sidebarBreadcrumb(props.breadcrumbItems),
      {
        div: [
          avatarStack(props.memberNames),
          {
            button: sidebarIcon(ICON_MORE),
            type: "button",
            ariaLabel: "More actions",
            style: {
              border: "none",
              background: "none",
              cursor: "pointer",
              color: (l: Listener) => themeColor(l, "shift-7", "neutral"),
            },
            $: [popover({ placement: "bottom-end", content: actionsMenu })],
          } as unknown as DomphyElement,
        ],
        style: { marginInlineStart: "auto", display: "flex", alignItems: "center", gap: themeSpacing(3) },
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
  } as unknown as DomphyElement<"header">;
}

/**
 * Persistent workspace sidebar (team switcher, favorites, nested workspace
 * tree, secondary links) with a "sidebar in a popover" quick-actions menu.
 * Call with no arguments for a fully working demo.
 */
function sidebar10(props: Sidebar10Props = {}): DomphyElement<"div"> {
  const {
    teams = DEFAULT_TEAMS,
    favorites = DEFAULT_FAVORITES,
    favoritesVisibleCount = 10,
    workspaces = DEFAULT_WORKSPACES,
    workspacesVisibleCount = 5,
    secondaryLinks = DEFAULT_SECONDARY_LINKS,
    user = DEFAULT_USER,
    breadcrumbItems = [{ label: "Engineering" }, { label: "Architecture" }],
    children,
  } = props;

  const collapsed = toState(false);
  const favoritesShowMore = useShowMore(favorites, favoritesVisibleCount);
  const workspacesShowMore = useShowMore(workspaces, workspacesVisibleCount);

  const quickLinks: SidebarNavMainItem[] = [
    { title: "Search", icon: ICON_SEARCH, href: "#" },
    { title: "Ask AI", icon: ICON_SPARKLE, href: "#" },
    { title: "Home", icon: ICON_HOME, href: "#" },
    { title: "Inbox", icon: ICON_INBOX, href: "#" },
  ];

  const asideElement: DomphyElement<"aside"> = {
    aside: [
      renderTeamSwitcher(teams),
      {
        nav: [
          {
            ul: quickLinks.map((item) => renderPlainNavRow(item, collapsed)),
            style: { listStyle: "none", margin: "0", padding: "0", display: "flex", flexDirection: "column", gap: themeSpacing(0.5) },
          } as unknown as DomphyElement,
          {
            div: [
              sectionLabel("Favorites", collapsed),
              {
                ul: (listener: Listener) => {
                  const rows: DomphyElement[] = favoritesShowMore.slice(listener).map((item) => favoriteRow(item, collapsed));
                  if (!favoritesShowMore.visible.get(listener) && favorites.length > favoritesVisibleCount) {
                    rows.push(moreRow("More", () => favoritesShowMore.visible.set(true), collapsed));
                  }
                  return rows;
                },
                style: { listStyle: "none", margin: "0", padding: "0", display: "flex", flexDirection: "column", gap: themeSpacing(0.5) },
              } as unknown as DomphyElement,
            ],
            style: { display: "flex", flexDirection: "column", gap: themeSpacing(1), marginTop: themeSpacing(3) },
          } as unknown as DomphyElement,
          {
            div: [
              sectionLabel("Workspaces", collapsed),
              {
                ul: (listener: Listener) => {
                  const rows: DomphyElement[] = workspacesShowMore.slice(listener).map((workspace) => workspaceNode(workspace, collapsed));
                  if (!workspacesShowMore.visible.get(listener) && workspaces.length > workspacesVisibleCount) {
                    rows.push(moreRow("More", () => workspacesShowMore.visible.set(true), collapsed));
                  }
                  return rows;
                },
                style: { listStyle: "none", margin: "0", padding: "0", display: "flex", flexDirection: "column", gap: themeSpacing(0.5) },
              } as unknown as DomphyElement,
            ],
            style: { display: "flex", flexDirection: "column", gap: themeSpacing(1), marginTop: themeSpacing(3) },
          } as unknown as DomphyElement,
        ],
        style: {
          flex: "1",
          minHeight: "0",
          overflowY: "auto",
          overflowX: "hidden",
          paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
        },
      } as unknown as DomphyElement,
      {
        ul: secondaryLinks.map((link) => renderPlainNavRow({ title: link.title, icon: link.icon, href: link.href }, collapsed)),
        style: {
          listStyle: "none",
          margin: "0",
          padding: (l: Listener) => `0 ${themeSpacing(themeDensity(l) * 3)}`,
          display: "flex",
          flexDirection: "column",
          gap: themeSpacing(0.5),
          flexShrink: "0",
          borderTop: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
          paddingTop: (l: Listener) => themeSpacing(themeDensity(l) * 2),
          color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
        },
      } as unknown as DomphyElement,
      renderUserFooter(user),
    ],
    style: {
      display: "flex",
      flexDirection: "column",
      flexShrink: "0",
      width: (l: Listener) => (collapsed.get(l) ? themeSpacing(12) : themeSpacing(64)),
      overflow: "hidden",
      transition: "width 0.2s linear",
      borderInlineEnd: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
    },
  } as unknown as DomphyElement<"aside">;

  const mainElement: DomphyElement<"main"> = {
    main: [
      mainHeader({
        onToggle: () => collapsed.set(!collapsed.get()),
        breadcrumbItems,
        memberNames: [user.name, "Alex Rivera", "Jordan Lee"],
      }),
      sidebarMainContent(children),
    ],
    style: {
      display: "flex",
      flexDirection: "column",
      flex: "1",
      minWidth: "0",
      minHeight: "0",
      overflow: "hidden",
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
    },
  } as unknown as DomphyElement<"main">;

  return {
    div: [asideElement, mainElement],
    dataTone: "shift-0",
    style: {
      display: "flex",
      height: "100dvh",
      overflow: "hidden",
      position: "relative",
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    },
  } as unknown as DomphyElement<"div">;
}

export { sidebar10 };
export type {
  Sidebar10FavoriteItem,
  Sidebar10Page,
  Sidebar10Props,
  Sidebar10SecondaryLink,
  Sidebar10Workspace,
};
