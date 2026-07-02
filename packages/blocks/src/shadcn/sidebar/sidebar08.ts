// shadcn/ui "sidebar-08" — clean-room reimplementation from the public behavior
// description only (no upstream source viewed). Same full-featured sidebar as
// sidebar07 (team switcher, nested nav-main, projects) plus a de-emphasized
// secondary nav block near the bottom, and a main content area rendered as a
// rounded, shadowed "inset" card offset from the sidebar and viewport edges —
// the inset gap shrinks in step with the sidebar's own collapse transition.

import type { DomphyElement, ElementNode, Listener, ReadableState } from "@domphy/core";
import { toState } from "@domphy/core";
import { small, tooltip } from "@domphy/ui";
import { themeColor, themeDensity, themeSpacing } from "@domphy/theme";
import {
  ICON_BAR_CHART,
  ICON_FOLDER,
  ICON_GRID,
  ICON_INBOX,
  ICON_LIFEBUOY,
  ICON_MESSAGE,
  renderExpandableNavRow,
  renderPlainNavRow,
  renderProjectRow,
  renderTeamSwitcher,
  renderUserFooter,
  sidebarBackdrop,
  sidebarIcon,
  sidebarMainContent,
  sidebarStickyHeader,
  type SidebarBreadcrumbItem,
  type SidebarNavMainItem,
  type SidebarProject,
  type SidebarTeam,
  type SidebarUser,
} from "./sidebar05-08-shared.js";

/** A quiet utility link (support/feedback) — no active-state styling, always
 * visible (collapses to just its icon like the other rows). */
type Sidebar08SecondaryNavItem = { title: string; href?: string; icon?: string };

type Sidebar08Props = {
  teams?: SidebarTeam[];
  navMain?: SidebarNavMainItem[];
  projects?: SidebarProject[];
  secondaryNav?: Sidebar08SecondaryNavItem[];
  user?: SidebarUser;
  breadcrumbItems?: SidebarBreadcrumbItem[];
  children?: DomphyElement | DomphyElement[];
};

const DEFAULT_TEAMS: SidebarTeam[] = [
  { name: "Acme Inc", plan: "Enterprise" },
  { name: "Acme Corp", plan: "Startup" },
];

const DEFAULT_NAV_MAIN: SidebarNavMainItem[] = [
  {
    title: "Playground",
    icon: ICON_GRID,
    items: [
      { title: "History" },
      { title: "Starred", active: true },
      { title: "Settings" },
    ],
  },
  {
    title: "Models",
    icon: ICON_INBOX,
    items: [{ title: "Genesis" }, { title: "Explorer" }, { title: "Quantum" }],
  },
  { title: "Documentation", icon: ICON_BAR_CHART, href: "#" },
];

const DEFAULT_PROJECTS: SidebarProject[] = [
  { title: "Design Engineering", icon: ICON_FOLDER, href: "#" },
  { title: "Sales & Marketing", icon: ICON_FOLDER, href: "#" },
  { title: "Travel", icon: ICON_FOLDER, href: "#" },
];

const DEFAULT_SECONDARY_NAV: Sidebar08SecondaryNavItem[] = [
  { title: "Support", icon: ICON_LIFEBUOY, href: "#" },
  { title: "Feedback", icon: ICON_MESSAGE, href: "#" },
];

const DEFAULT_USER: SidebarUser = {
  name: "Shad Cn",
  email: "shadcn@example.com",
};

/** A de-emphasized secondary-nav row: quieter color than nav-main, no active
 * state, same expanded/collapsed dual-row + collapsed-only-tooltip pattern. */
function renderSecondaryNavRow(
  item: Sidebar08SecondaryNavItem,
  collapsed: ReadableState<boolean>,
): DomphyElement<"li"> {
  // Contrast stays at the same shift-9 floor as every other row (WCAG
  // legibility is never traded away); de-emphasis instead comes from a
  // smaller type scale (small() patch) rather than a dimmer color.
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
          {
            small: item.title,
            style: { flex: "1", textAlign: "left" },
            $: [small({ color: "neutral" })],
          } as unknown as DomphyElement,
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

/**
 * shadcn/ui "sidebar-08" — sidebar07's full feature set plus a de-emphasized
 * secondary nav block and a rounded/shadowed "inset" main content card whose
 * offset from the sidebar tracks the collapse transition. Call with no
 * arguments for a fully working demo.
 */
function sidebar08(props: Sidebar08Props = {}): DomphyElement<"div"> {
  const {
    teams = DEFAULT_TEAMS,
    navMain = DEFAULT_NAV_MAIN,
    projects = DEFAULT_PROJECTS,
    secondaryNav = DEFAULT_SECONDARY_NAV,
    user = DEFAULT_USER,
    breadcrumbItems = [{ label: "Models" }, { label: "Genesis" }],
    children,
  } = props;

  const sidebarOpen = toState(true);
  const collapsed = toState(false);

  const navMainRows = navMain.map((item) =>
    item.items && item.items.length > 0
      ? renderExpandableNavRow(item, collapsed)
      : renderPlainNavRow(item, collapsed),
  );

  const asideElement: DomphyElement<"aside"> = {
    aside: [
      renderTeamSwitcher(teams),
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
                ul: projects.map((project) => renderProjectRow(project, collapsed)),
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
        ],
        style: {
          flex: "1",
          minHeight: "0",
          overflowY: "auto",
          overflowX: "hidden",
          paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
        },
      } as unknown as DomphyElement,
      // Secondary nav — quiet utility links, no accordion/dropdown, no
      // active-state highlighting, always visible above the user footer.
      {
        ul: secondaryNav.map((item) => renderSecondaryNavRow(item, collapsed)),
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
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
      "@media (max-width: 768px)": {
        position: "fixed",
        insetBlock: "0",
        insetInlineStart: "0",
        zIndex: "15",
        width: themeSpacing(72),
        transform: (l: Listener) => (sidebarOpen.get(l) ? "translateX(0)" : "translateX(-100%)"),
        transition: "transform 0.2s ease",
        boxShadow: (l: Listener) => `0 0 ${themeSpacing(6)} ${themeColor(l, "shift-4", "neutral")}`,
      },
    },
  } as unknown as DomphyElement<"aside">;

  // The "inset" look: the main panel is its own rounded, shadowed card
  // (lighter dataTone than the muted root backdrop) with a margin that
  // shrinks — growing the card into the freed space — in step with the
  // sidebar's own collapse transition, using the same timing/easing.
  const mainElement: DomphyElement<"main"> = {
    main: [
      sidebarStickyHeader({
        onToggle: () => {
          sidebarOpen.set(!sidebarOpen.get());
          collapsed.set(!collapsed.get());
        },
        breadcrumbItems,
      }),
      sidebarMainContent(children),
    ],
    dataTone: "shift-0",
    style: {
      display: "flex",
      flexDirection: "column",
      flex: "1",
      minWidth: "0",
      minHeight: "0",
      overflow: "hidden",
      margin: (l: Listener) => (collapsed.get(l) ? themeSpacing(2) : themeSpacing(3)),
      borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 3),
      boxShadow: (l: Listener) => `0 ${themeSpacing(1)} ${themeSpacing(6)} ${themeColor(l, "shift-4", "neutral")}`,
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
      transition: "margin 0.2s linear",
    },
  } as unknown as DomphyElement<"main">;

  return {
    div: [asideElement, mainElement, sidebarBackdrop(sidebarOpen, () => sidebarOpen.set(false))],
    dataTone: "shift-2",
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

export { sidebar08 };
export type { Sidebar08Props, Sidebar08SecondaryNavItem };
export type {
  SidebarNavChild as Sidebar08NavChild,
  SidebarNavMainItem as Sidebar08NavMainItem,
  SidebarProject as Sidebar08Project,
  SidebarTeam as Sidebar08Team,
  SidebarUser as Sidebar08User,
} from "./sidebar05-08-shared.js";
