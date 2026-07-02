// shadcn/ui "sidebar-sticky-header" block — clean-room reimplementation from
// the public behavior/visual spec only (no upstream source viewed). The
// flagship full-featured sidebar (team/brand header, nested Platform nav,
// Projects list, secondary nav, user footer — shared row-renderers reused
// from ./sidebar05-08-shared.ts) paired with a full-width site header that is
// a SIBLING of the sidebar (not nested inside its own `<main>` scroll
// container like the rest of the family): it sits `position: fixed` above
// everything, and a `--siteHeaderHeight` custom property on the page wrapper
// lets the sidebar/content row offset correctly beneath it. This is the one
// piece of layout genuinely unique to this variant; everything else below the
// header is standard sidebar-0N chrome.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement, ElementNode, Listener, ReadableState } from "@domphy/core";
import { toState } from "@domphy/core";
import { breadcrumb, buttonGhost, inputSearch, link, small, strong, tooltip } from "@domphy/ui";
import { themeColor, themeDensity, themeSpacing } from "@domphy/theme";
import {
  ICON_BAR_CHART,
  ICON_FOLDER,
  ICON_GRID,
  ICON_INBOX,
  ICON_LIFEBUOY,
  ICON_MARK,
  ICON_MESSAGE,
  ICON_PANEL_TOGGLE,
  ICON_SEARCH,
  renderExpandableNavRow,
  renderPlainNavRow,
  renderProjectRow,
  renderTeamSwitcher,
  renderUserFooter,
  sidebarBackdrop,
  sidebarIcon,
  sidebarMainContent,
  verticalDivider,
  type SidebarBreadcrumbItem,
  type SidebarNavMainItem,
  type SidebarProject,
  type SidebarTeam,
  type SidebarUser,
} from "./sidebar05-08-shared.js";

/** A quiet utility link (Support/Feedback) — no active-state styling, always visible. */
type SidebarStickyHeaderSecondaryItem = { title: string; href?: string; icon?: string };

type SidebarStickyHeaderProps = {
  /** Brand icon/name/plan-caption shown at the top of the sidebar. */
  brand?: SidebarTeam;
  breadcrumbItems?: SidebarBreadcrumbItem[];
  searchPlaceholder?: string;
  navMain?: SidebarNavMainItem[];
  projects?: SidebarProject[];
  moreProjectsHref?: string;
  secondaryNav?: SidebarStickyHeaderSecondaryItem[];
  user?: SidebarUser;
  children?: DomphyElement | DomphyElement[];
};

const SITE_HEADER_HEIGHT = themeSpacing(16);

const DEFAULT_BRAND: SidebarTeam = { name: "Acme Inc", plan: "Enterprise", logo: ICON_MARK };

const DEFAULT_NAV_MAIN: SidebarNavMainItem[] = [
  {
    title: "Playground",
    icon: ICON_GRID,
    items: [{ title: "History" }, { title: "Starred", active: true }, { title: "Settings" }],
  },
  {
    title: "Models",
    icon: ICON_INBOX,
    items: [{ title: "Genesis" }, { title: "Explorer" }, { title: "Quantum" }],
  },
  {
    title: "Documentation",
    icon: ICON_BAR_CHART,
    items: [{ title: "Introduction" }, { title: "Get Started" }],
  },
  {
    title: "Settings",
    icon: ICON_FOLDER,
    items: [{ title: "General" }, { title: "Team" }],
  },
];

const DEFAULT_PROJECTS: SidebarProject[] = [
  { title: "Design Engineering", icon: ICON_FOLDER, href: "#" },
  { title: "Sales & Marketing", icon: ICON_FOLDER, href: "#" },
  { title: "Travel", icon: ICON_FOLDER, href: "#" },
];

const DEFAULT_SECONDARY_NAV: SidebarStickyHeaderSecondaryItem[] = [
  { title: "Support", icon: ICON_LIFEBUOY, href: "#" },
  { title: "Feedback", icon: ICON_MESSAGE, href: "#" },
];

const DEFAULT_USER: SidebarUser = { name: "shadcn", email: "m@example.com" };

/** A de-emphasized secondary-nav row: same expanded/collapsed dual-row +
 * collapsed-only-tooltip pattern as the other rows, no active-state styling. */
function renderSecondaryNavRow(
  item: SidebarStickyHeaderSecondaryItem,
  collapsed: ReadableState<boolean>,
): DomphyElement<"li"> {
  const rowStyle = {
    display: "flex",
    alignItems: "center",
    width: "100%",
    gap: (l: Listener) => themeSpacing(themeDensity(l) * 2),
    paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 1.5),
    paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
    borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
    textDecoration: () => "none",
    overflow: "hidden",
    whiteSpace: "nowrap",
    color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
    "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
  };

  return {
    li: [
      {
        a: [
          ...(item.icon ? [sidebarIcon(item.icon)] : []),
          { span: item.title, style: { flex: "1", textAlign: "left" } } as unknown as DomphyElement,
        ],
        href: item.href ?? "#",
        style: { ...rowStyle, display: (l: Listener) => (collapsed.get(l) ? "none" : "flex") },
      } as unknown as DomphyElement,
      {
        a: [item.icon ? sidebarIcon(item.icon) : { span: item.title[0] }],
        href: item.href ?? "#",
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

/** Trailing "More" link below the Projects list — plain row, no icon. */
function renderMoreProjectsRow(href: string, collapsed: ReadableState<boolean>): DomphyElement<"li"> {
  return {
    li: [
      {
        a: { small: "More", $: [small({ color: "neutral" })] } as unknown as DomphyElement,
        href,
        style: {
          display: (l: Listener) => (collapsed.get(l) ? "none" : "flex"),
          alignItems: "center",
          width: "100%",
          paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 1.5),
          paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
          borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
          textDecoration: () => "none",
          color: (l: Listener) => themeColor(l, "shift-7", "neutral"),
          "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
        },
      } as unknown as DomphyElement,
    ],
    _key: "more-projects",
  } as DomphyElement<"li">;
}

/** Breadcrumb trail whose first (parent) segment hides below a breakpoint. */
function stickyHeaderBreadcrumb(items: SidebarBreadcrumbItem[]): DomphyElement<"nav"> {
  const crumbs: DomphyElement[] = items.map((item, index) => {
    const isLast = index === items.length - 1;
    const isParent = index === 0 && items.length > 1;
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
      style: isParent ? { "@media (max-width: 40em)": { display: "none" } } : undefined,
    } as unknown as DomphyElement;
  });
  return { nav: crumbs, $: [breadcrumb({ color: "neutral" })] } as DomphyElement<"nav">;
}

/**
 * shadcn/ui "sidebar-sticky-header" — a full-featured collapsible sidebar
 * (brand header, nested Platform nav, Projects list, secondary nav, user
 * footer) below a full-width site header that is a sibling of the sidebar,
 * pinned above everything via `position: fixed` and coordinated with the
 * rest of the page through a `--siteHeaderHeight` custom property. Call with
 * no arguments for a fully working demo.
 */
function sidebarStickyHeader(props: SidebarStickyHeaderProps = {}): DomphyElement<"div"> {
  const {
    brand = DEFAULT_BRAND,
    breadcrumbItems = [{ label: "Build Your Application" }, { label: "Data Fetching" }],
    searchPlaceholder = "Search...",
    navMain = DEFAULT_NAV_MAIN,
    projects = DEFAULT_PROJECTS,
    moreProjectsHref = "#",
    secondaryNav = DEFAULT_SECONDARY_NAV,
    user = DEFAULT_USER,
    children,
  } = props;

  const sidebarOpen = toState(true);
  const collapsed = toState(false);

  const navMainRows = navMain.map((item) =>
    item.items && item.items.length > 0 ? renderExpandableNavRow(item, collapsed) : renderPlainNavRow(item, collapsed),
  );

  const siteHeader: DomphyElement<"header"> = {
    header: [
      {
        button: sidebarIcon(ICON_PANEL_TOGGLE),
        type: "button",
        ariaLabel: "Toggle sidebar",
        onClick: () => {
          sidebarOpen.set(!sidebarOpen.get());
          collapsed.set(!collapsed.get());
        },
        $: [buttonGhost({ color: "neutral" })],
      } as unknown as DomphyElement,
      verticalDivider(),
      stickyHeaderBreadcrumb(breadcrumbItems),
      { div: null, style: { flex: "1 1 auto" } } as unknown as DomphyElement,
      {
        form: [
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
            ariaLabel: "Search",
            style: { width: "100%", paddingInlineStart: themeSpacing(9) },
            $: [inputSearch({ color: "neutral", accentColor: "primary" })],
          } as unknown as DomphyElement,
        ],
        role: "search",
        onSubmit: (e: Event) => e.preventDefault(),
        style: {
          position: "relative",
          display: "flex",
          alignItems: "center",
          width: "100%",
          maxWidth: themeSpacing(64),
          "@media (max-width: 40em)": { maxWidth: "100%" },
        },
      } as unknown as DomphyElement,
    ],
    style: {
      position: "fixed",
      insetBlockStart: "0",
      insetInline: "0",
      zIndex: "20",
      display: "flex",
      alignItems: "center",
      gap: (l: Listener) => themeSpacing(themeDensity(l) * 3),
      height: "var(--siteHeaderHeight)",
      paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 4),
      borderBottom: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    },
  } as unknown as DomphyElement<"header">;

  const asideElement: DomphyElement<"aside"> = {
    aside: [
      renderTeamSwitcher([brand]),
      {
        nav: [
          {
            ul: navMainRows,
            style: {
              listStyle: "none",
              margin: "0",
              padding: "0",
              display: "flex",
              flexDirection: "column",
              gap: themeSpacing(0.5),
            },
          } as unknown as DomphyElement,
          {
            div: [
              {
                small: "Projects",
                style: {
                  display: (l: Listener) => (collapsed.get(l) ? "none" : "block"),
                  paddingInline: themeSpacing(3),
                },
                $: [small({ color: "neutral" })],
              } as unknown as DomphyElement,
              {
                ul: [...projects.map((project) => renderProjectRow(project, collapsed)), renderMoreProjectsRow(moreProjectsHref, collapsed)],
                style: {
                  listStyle: "none",
                  margin: "0",
                  padding: "0",
                  display: "flex",
                  flexDirection: "column",
                  gap: themeSpacing(0.5),
                },
              } as unknown as DomphyElement,
            ],
            style: { display: "flex", flexDirection: "column", gap: themeSpacing(1), marginTop: themeSpacing(4) },
          } as unknown as DomphyElement,
          {
            ul: secondaryNav.map((item) => renderSecondaryNavRow(item, collapsed)),
            style: {
              listStyle: "none",
              margin: "0",
              padding: "0",
              display: "flex",
              flexDirection: "column",
              gap: themeSpacing(0.5),
              marginTop: themeSpacing(4),
            },
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
      renderUserFooter(user),
      // Thin invisible edge rail — also acts as a click target to toggle collapse.
      {
        div: null,
        ariaHidden: "true",
        onClick: () => collapsed.set(!collapsed.get()),
        style: {
          position: "absolute",
          insetBlock: "0",
          insetInlineEnd: "0",
          width: themeSpacing(1),
          cursor: "col-resize",
        },
      } as unknown as DomphyElement,
    ],
    dataTone: "shift-2",
    _onMount: (node: ElementNode) => {
      const onKeyDown = (event: KeyboardEvent) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
          event.preventDefault();
          collapsed.set(!collapsed.get());
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
      width: (l: Listener) => (collapsed.get(l) ? themeSpacing(12) : themeSpacing(64)),
      overflow: "hidden",
      transition: "width 0.2s linear",
      borderInlineEnd: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
      "@media (max-width: 768px)": {
        position: "fixed",
        insetBlockStart: "var(--siteHeaderHeight)",
        insetBlockEnd: "0",
        insetInlineStart: "0",
        height: "calc(100dvh - var(--siteHeaderHeight))",
        zIndex: "15",
        width: themeSpacing(72),
        transform: (l: Listener) => (sidebarOpen.get(l) ? "translateX(0)" : "translateX(-100%)"),
        transition: "transform 0.2s ease",
        boxShadow: (l: Listener) => `0 0 ${themeSpacing(6)} ${themeColor(l, "shift-3", "neutral")}`,
      },
    },
  } as unknown as DomphyElement<"aside">;

  const mainElement: DomphyElement<"main"> = {
    main: [sidebarMainContent(children)],
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
    div: [
      siteHeader,
      {
        div: [asideElement, mainElement, sidebarBackdrop(sidebarOpen, () => sidebarOpen.set(false))],
        // Layout-only row (aside + main manage their own color/background) —
        // the `var(--siteHeaderHeight)` reference in height/marginBlockStart is
        // a plain CSS custom property, not a themeColor() call; the doctor's
        // heuristic can't tell those apart from here, so it's a false positive.
        _doctorDisable: "missing-color",
        style: {
          display: "flex",
          height: "calc(100dvh - var(--siteHeaderHeight))",
          marginBlockStart: "var(--siteHeaderHeight)",
          overflow: "hidden",
        },
      } as unknown as DomphyElement,
    ],
    style: {
      "--siteHeaderHeight": SITE_HEADER_HEIGHT,
      position: "relative",
    },
  } as unknown as DomphyElement<"div">;
}

export { sidebarStickyHeader };
export type { SidebarStickyHeaderProps, SidebarStickyHeaderSecondaryItem };
export type {
  SidebarNavChild as SidebarStickyHeaderNavChild,
  SidebarNavMainItem as SidebarStickyHeaderNavMainItem,
  SidebarProject as SidebarStickyHeaderProject,
  SidebarTeam as SidebarStickyHeaderTeam,
  SidebarUser as SidebarStickyHeaderUser,
} from "./sidebar05-08-shared.js";
