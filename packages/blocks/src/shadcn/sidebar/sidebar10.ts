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
  ICON_CHEVRON_RIGHT,
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
type Sidebar10Page = { title: string; href?: string };
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
    pages: [{ title: "Architecture" }, { title: "RFCs" }, { title: "On-call" }],
  },
  { name: "Product", emoji: "📦", pages: [{ title: "Roadmap" }, { title: "Feedback" }, { title: "Specs" }] },
  { name: "Design", emoji: "🎨", pages: [{ title: "Components" }, { title: "Tokens" }] },
  { name: "Marketing", emoji: "📣", pages: [{ title: "Campaigns" }, { title: "Brand" }, { title: "Content" }] },
  { name: "Sales", emoji: "💼", pages: [{ title: "Pipeline" }, { title: "Playbook" }] },
  { name: "Finance", emoji: "💰", pages: [{ title: "Forecasts" }, { title: "Invoices" }] },
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
                  a: [{ span: page.title, style: { flex: "1", textAlign: "left" } } as unknown as DomphyElement],
                  href: page.href ?? "#",
                  style: {
                    display: "flex",
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
  const actionsMenu = sidebarStyledPopoverContent([
    { items: [{ icon: ICON_SEARCH, label: "Search" }, { icon: ICON_GRID, label: "Templates" }] },
    { items: [{ icon: ICON_TRASH, label: "Trash" }, { label: "Invite members" }] },
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
