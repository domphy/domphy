// shadcn/ui "sidebar-07" — clean-room reimplementation from the public behavior
// description only (no upstream source viewed). The flagship full-featured
// sidebar: team switcher, nested main nav, projects list, user footer, and a
// desktop icon-rail collapse (content re-flows rather than hides) alongside
// the standard off-canvas mobile drawer. Row rendering is shared with
// sidebar08 (which adds a secondary nav block and an inset main panel) via
// sidebar05-08-shared.ts.

import type { DomphyElement, ElementNode, Listener } from "@domphy/core";
import { toState } from "@domphy/core";
import { small } from "@domphy/ui";
import { themeColor, themeDensity, themeSpacing } from "@domphy/theme";
import {
  ICON_BAR_CHART,
  ICON_FOLDER,
  ICON_GRID,
  ICON_INBOX,
  renderExpandableNavRow,
  renderPlainNavRow,
  renderProjectRow,
  renderTeamSwitcher,
  renderUserFooter,
  sidebarBackdrop,
  sidebarMainContent,
  sidebarStickyHeader,
  type SidebarBreadcrumbItem,
  type SidebarNavMainItem,
  type SidebarProject,
  type SidebarTeam,
  type SidebarUser,
} from "./sidebar05-08-shared.js";

type Sidebar07Props = {
  teams?: SidebarTeam[];
  navMain?: SidebarNavMainItem[];
  projects?: SidebarProject[];
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

const DEFAULT_USER: SidebarUser = {
  name: "Shad Cn",
  email: "shadcn@example.com",
};

/**
 * shadcn/ui "sidebar-07" — the flagship full-featured sidebar: team switcher,
 * nested main nav, projects list, and a user footer, collapsing from a full
 * labeled panel down to a narrow icon-only rail. Call with no arguments for a
 * fully working demo.
 */
function sidebar07(props: Sidebar07Props = {}): DomphyElement<"div"> {
  const {
    teams = DEFAULT_TEAMS,
    navMain = DEFAULT_NAV_MAIN,
    projects = DEFAULT_PROJECTS,
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
        onToggle: () => {
          sidebarOpen.set(!sidebarOpen.get());
          collapsed.set(!collapsed.get());
        },
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

export { sidebar07 };
export type { Sidebar07Props };
export type {
  SidebarNavChild as Sidebar07NavChild,
  SidebarNavMainItem as Sidebar07NavMainItem,
  SidebarProject as Sidebar07Project,
  SidebarTeam as Sidebar07Team,
  SidebarUser as Sidebar07User,
} from "./sidebar05-08-shared.js";
