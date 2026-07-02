// shadcn/ui "sidebar-05" — clean-room reimplementation from the public behavior
// description only (no upstream source viewed). Inline-accordion nav: each
// top-level group expands/collapses in place with a plus/minus toggle glyph
// (not a rotating chevron), multiple groups can stay open at once, and the
// sidebar itself slides fully off-canvas when hidden (no icon-rail collapse).

import type { DomphyElement, Listener } from "@domphy/core";
import { toState } from "@domphy/core";
import { icon, inputSearch, list, listItemButton, small, strong } from "@domphy/ui";
import { themeColor, themeDensity, themeSpacing } from "@domphy/theme";
import {
  ICON_BAR_CHART,
  ICON_FOLDER,
  ICON_GRID,
  ICON_INBOX,
  ICON_MARK,
  ICON_MINUS,
  ICON_PLUS,
  ICON_SEARCH,
  sidebarBackdrop,
  sidebarIcon,
  sidebarMainContent,
  sidebarStickyHeader,
  type SidebarBreadcrumbItem,
} from "./sidebar05-08-shared.js";

/** One nested link under a top-level nav group. */
type Sidebar05SubItem = {
  title: string;
  href?: string;
  active?: boolean;
};

/** One collapsible top-level nav category. */
type Sidebar05NavGroup = {
  title: string;
  href?: string;
  icon?: string;
  defaultOpen?: boolean;
  items: Sidebar05SubItem[];
};

type Sidebar05Props = {
  header?: { icon?: string; title?: string; subtitle?: string };
  searchPlaceholder?: string;
  navGroups?: Sidebar05NavGroup[];
  breadcrumbItems?: SidebarBreadcrumbItem[];
  children?: DomphyElement | DomphyElement[];
};

const DEFAULT_NAV_GROUPS: Sidebar05NavGroup[] = [
  {
    title: "Getting Started",
    icon: ICON_GRID,
    defaultOpen: true,
    items: [
      { title: "Installation", href: "#" },
      { title: "Project Structure", href: "#", active: true },
    ],
  },
  {
    title: "Building Your Application",
    icon: ICON_INBOX,
    items: [
      { title: "Routing", href: "#" },
      { title: "Data Fetching", href: "#" },
      { title: "Rendering", href: "#" },
      { title: "Caching", href: "#" },
    ],
  },
  {
    title: "API Reference",
    icon: ICON_BAR_CHART,
    items: [
      { title: "Components", href: "#" },
      { title: "File Conventions", href: "#" },
    ],
  },
  {
    title: "Architecture",
    icon: ICON_FOLDER,
    items: [
      { title: "Accessibility", href: "#" },
      { title: "Fast Refresh", href: "#" },
    ],
  },
];

/** A single sub-link row: plain text, or bold + accent-tinted when active. */
function renderSubItem(item: Sidebar05SubItem, key: string | number): DomphyElement<"li"> {
  return {
    li: [
      {
        a: item.active
          ? ([{ strong: item.title, $: [strong({ color: "neutral" })] }] as unknown as DomphyElement)
          : item.title,
        href: item.href ?? "#",
        ariaCurrent: item.active ? "page" : undefined,
        $: [listItemButton({ color: "neutral", accentColor: "primary", dense: true })],
      } as unknown as DomphyElement,
    ],
    _key: key,
  } as DomphyElement<"li">;
}

/** A collapsible top-level group: native <details> disclosure with a
 * plus/minus toggle glyph swapped purely via the `[open]` CSS attribute
 * selector (no JS, no rotating chevron). */
function renderNavGroup(group: Sidebar05NavGroup, key: string | number): DomphyElement<"li"> {
  const subItems = group.items.map((item, index) => renderSubItem(item, `${group.title}-${index}`));

  return {
    li: [
      {
        details: [
          {
            summary: [
              ...(group.icon ? [sidebarIcon(group.icon)] : []),
              { span: group.title, style: { flex: "1", textAlign: "left" } } as unknown as DomphyElement,
              { span: ICON_PLUS, dataSlot: "toggle-plus", $: [icon({ color: "neutral" })] } as unknown as DomphyElement,
              { span: ICON_MINUS, dataSlot: "toggle-minus", $: [icon({ color: "neutral" })] } as unknown as DomphyElement,
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
              "&:hover": {
                backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral"),
              },
            },
          } as unknown as DomphyElement,
          {
            ul: subItems,
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
        open: group.defaultOpen ?? false,
        style: {
          "&[open] [data-slot=toggle-plus]": { display: "none" },
          "&:not([open]) [data-slot=toggle-minus]": { display: "none" },
          "&[open] > ul": {
            maxHeight: themeSpacing(240),
            opacity: "1",
            paddingBlock: themeSpacing(1),
          },
        },
      } as unknown as DomphyElement,
    ],
    _key: key,
  } as DomphyElement<"li">;
}

/**
 * shadcn/ui "sidebar-05" — inline-accordion collapsible nav with a plus/minus
 * toggle glyph, a search field in the header, and a sticky breadcrumb header
 * for the content area. Call with no arguments for a fully working demo.
 */
function sidebar05(props: Sidebar05Props = {}): DomphyElement<"div"> {
  const {
    header = { icon: ICON_MARK, title: "Acme Inc", subtitle: "v1.0.0" },
    searchPlaceholder = "Search the docs...",
    navGroups = DEFAULT_NAV_GROUPS,
    breadcrumbItems = [{ label: "Building Your Application" }, { label: "Data Fetching" }],
    children,
  } = props;

  const sidebarOpen = toState(true);

  const asideElement: DomphyElement<"aside"> = {
    aside: [
      {
        div: [
          {
            div: [
              {
                span: header.icon ?? ICON_MARK,
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
              } as unknown as DomphyElement,
              {
                div: [
                  { strong: header.title ?? "Acme Inc", $: [strong({ color: "neutral" })] } as unknown as DomphyElement,
                  { small: header.subtitle ?? "v1.0.0", $: [small({ color: "neutral" })] } as unknown as DomphyElement,
                ],
                style: { display: "flex", flexDirection: "column", gap: themeSpacing(0.5), minWidth: "0" },
              } as unknown as DomphyElement,
            ],
            style: { display: "flex", alignItems: "center", gap: (l: Listener) => themeSpacing(themeDensity(l) * 3) },
          } as unknown as DomphyElement,
          {
            div: [
              {
                span: ICON_SEARCH,
                style: {
                  position: "absolute",
                  insetInlineStart: themeSpacing(3),
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  display: "inline-flex",
                  color: (l: Listener) => themeColor(l, "shift-6", "neutral"),
                },
              } as unknown as DomphyElement,
              {
                input: null,
                type: "search",
                placeholder: searchPlaceholder,
                style: { width: "100%", paddingInlineStart: themeSpacing(9) },
                $: [inputSearch({ color: "neutral", accentColor: "primary" })],
              } as unknown as DomphyElement,
            ],
            style: { position: "relative", display: "flex", alignItems: "center" },
          } as unknown as DomphyElement,
        ],
        style: {
          display: "flex",
          flexDirection: "column",
          gap: themeSpacing(4),
          flexShrink: "0",
          padding: (l: Listener) => themeSpacing(themeDensity(l) * 4),
        },
      } as unknown as DomphyElement,
      {
        nav: [
          {
            ul: navGroups.map((group, index) => renderNavGroup(group, group.title ?? index)),
            $: [list()],
          } as unknown as DomphyElement,
        ],
        style: {
          flex: "1",
          minHeight: "0",
          overflowY: "auto",
          paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
          paddingBottom: (l: Listener) => themeSpacing(themeDensity(l) * 4),
        },
      } as unknown as DomphyElement,
    ],
    dataTone: "shift-2",
    style: {
      display: "flex",
      flexDirection: "column",
      flexShrink: "0",
      width: (l: Listener) => (sidebarOpen.get(l) ? themeSpacing(64) : "0px"),
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
        transform: (l: Listener) => (sidebarOpen.get(l) ? "translateX(0)" : "translateX(-100%)"),
        transition: "transform 0.2s ease",
        boxShadow: (l: Listener) => `0 0 ${themeSpacing(6)} ${themeColor(l, "shift-3", "neutral")}`,
      },
    },
  } as unknown as DomphyElement<"aside">;

  const mainElement: DomphyElement<"main"> = {
    main: [
      sidebarStickyHeader({
        onToggle: () => sidebarOpen.set(!sidebarOpen.get()),
        breadcrumbItems,
      }),
      sidebarMainContent(children),
    ],
    style: {
      display: "flex",
      flexDirection: "column",
      flex: "1",
      minWidth: "0",
      minHeight: "0",
      overflow: "auto",
    },
  } as unknown as DomphyElement<"main">;

  return {
    div: [asideElement, mainElement, sidebarBackdrop(sidebarOpen, () => sidebarOpen.set(false))],
    style: {
      display: "flex",
      height: "100dvh",
      overflow: "hidden",
      position: "relative",
    },
  } as unknown as DomphyElement<"div">;
}

export { sidebar05 };
export type { Sidebar05NavGroup, Sidebar05Props, Sidebar05SubItem };
