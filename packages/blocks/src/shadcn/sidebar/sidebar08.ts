// shadcn/ui "sidebar-08" — same full-featured sidebar as sidebar07 (nested
// nav-main, projects) minus its team-switcher dropdown (a single static
// brand link here, matching upstream's app-sidebar.tsx), plus a
// de-emphasized secondary nav block near the bottom, and a main content area
// rendered as a rounded, shadowed "inset" card offset from the sidebar and
// viewport edges — the inset gap shrinks in step with the sidebar's own
// collapse transition.

import type {
  DomphyElement,
  ElementNode,
  Listener,
  ReadableState,
} from "@domphy/core";
import { toState } from "@domphy/core";
import { themeColor, themeDensity, themeSpacing } from "@domphy/theme";
import { small, strong, tooltip } from "@domphy/ui";
import {
  ICON_BAR_CHART,
  ICON_GRID,
  ICON_INBOX,
  ICON_LIFEBUOY,
  ICON_MARK,
  ICON_MESSAGE,
  renderExpandableNavRow,
  renderPlainNavRow,
  renderProjectRow,
  renderProjectsMoreRow,
  renderUserFooter,
  type SidebarBreadcrumbItem,
  type SidebarNavMainItem,
  type SidebarProject,
  type SidebarTeam,
  type SidebarUser,
  sidebarBackdrop,
  sidebarIcon,
  sidebarMainContent,
  sidebarStickyHeader,
} from "./sidebar05-08-shared.js";

/** shadcn's real sidebar-08 has no team-switcher dropdown (that's sidebar07's
 * feature) — just a single static brand link. Hand-authored generic "gear"
 * glyph for the upstream "Settings" nav-main group (not sourced from any icon
 * set, same convention as sidebar05-08-shared.ts's icons). */
const ICON_GEAR =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>';

/** Three distinct project glyphs — upstream nav-projects gives each project its
 * own icon (Frame / PieChart / Map), not a single shared folder. Hand-authored
 * generic geometric shapes (frame outline, quarter-slice pie, folded map), not
 * sourced from any icon set — same convention as ICON_GEAR above. */
const ICON_FRAME =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M22 6H2M22 18H2M6 2v20M18 2v20"/></svg>';

const ICON_PIE_CHART =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><circle cx="12" cy="12" r="9"/><path d="M12 3v9h9"/></svg>';

const ICON_MAP =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/></svg>';

/** A quiet utility link (support/feedback) — no active-state styling, always
 * visible (collapses to just its icon like the other rows). */
type Sidebar08SecondaryNavItem = {
  title: string;
  href?: string;
  icon?: string;
};

/** Static brand link at the top of the aside: icon badge + two-line label, no
 * dropdown/chevron/popover. Upstream's sidebar-08 app-sidebar.tsx renders a
 * single hardcoded `<a href="#">` here (no TeamSwitcher import at all) —
 * unlike sidebar07, which genuinely has a team-switcher dropdown that
 * sidebar05-08-shared.ts's renderTeamSwitcher() models. */
function renderBrandHeader(team: SidebarTeam): DomphyElement<"div"> {
  return {
    div: [
      {
        a: [
          {
            span: team.logo ?? ICON_MARK,
            dataTone: "shift-0",
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: themeSpacing(8),
              height: themeSpacing(8),
              flexShrink: "0",
              borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 2),
              backgroundColor: (l: Listener) =>
                themeColor(l, "inherit", "primary"),
              color: (l: Listener) => themeColor(l, "shift-10", "primary"),
            },
          } as unknown as DomphyElement,
          {
            div: [
              {
                strong: team.name,
                $: [strong({ color: "neutral" })],
              } as unknown as DomphyElement,
              {
                small: team.plan,
                $: [small({ color: "neutral" })],
              } as unknown as DomphyElement,
            ],
            style: {
              display: "flex",
              flexDirection: "column",
              gap: themeSpacing(0.5),
              minWidth: "0",
              overflow: "hidden",
              whiteSpace: "nowrap",
            },
          } as unknown as DomphyElement,
        ],
        href: "#",
        style: {
          display: "flex",
          alignItems: "center",
          width: "100%",
          gap: (l: Listener) => themeSpacing(themeDensity(l) * 2),
          padding: (l: Listener) => themeSpacing(themeDensity(l) * 2),
          borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
          textDecoration: () => "none",
          overflow: "hidden",
          color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
          backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
          "&:hover": {
            backgroundColor: (l: Listener) =>
              themeColor(l, "shift-2", "neutral"),
          },
        },
      } as unknown as DomphyElement,
    ],
    style: { padding: (l: Listener) => themeSpacing(themeDensity(l) * 2) },
  } as unknown as DomphyElement<"div">;
}

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
    // Upstream marks the parent "Playground" isActive:true — its only effect is
    // defaultOpen on the collapsible; no nav item is ever highlighted as
    // current (matches sidebar07's data, and app-sidebar.tsx's `isActive: true`
    // on the parent rather than any sub-item).
    title: "Playground",
    icon: ICON_GRID,
    active: true,
    items: [{ title: "History" }, { title: "Starred" }, { title: "Settings" }],
  },
  {
    title: "Models",
    icon: ICON_INBOX,
    items: [{ title: "Genesis" }, { title: "Explorer" }, { title: "Quantum" }],
  },
  {
    title: "Documentation",
    icon: ICON_BAR_CHART,
    items: [
      { title: "Introduction" },
      { title: "Get Started" },
      { title: "Tutorials" },
      { title: "Changelog" },
    ],
  },
  {
    title: "Settings",
    icon: ICON_GEAR,
    items: [
      { title: "General" },
      { title: "Team" },
      { title: "Billing" },
      { title: "Limits" },
    ],
  },
];

const DEFAULT_PROJECTS: SidebarProject[] = [
  { title: "Design Engineering", icon: ICON_FRAME, href: "#" },
  { title: "Sales & Marketing", icon: ICON_PIE_CHART, href: "#" },
  { title: "Travel", icon: ICON_MAP, href: "#" },
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
    "&:hover": {
      backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral"),
    },
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
        style: {
          ...rowStyle,
          display: (l: Listener) => (collapsed.get(l) ? "none" : "flex"),
        },
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
      renderBrandHeader(teams[0] ?? DEFAULT_TEAMS[0]),
      {
        nav: [
          {
            small: "Platform",
            style: {
              display: (l: Listener) => (collapsed.get(l) ? "none" : "block"),
              paddingInline: themeSpacing(3),
            },
            $: [small({ color: "neutral" })],
          } as unknown as DomphyElement,
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
                  display: (l: Listener) =>
                    collapsed.get(l) ? "none" : "block",
                  paddingInline: themeSpacing(3),
                },
                $: [small({ color: "neutral" })],
              } as unknown as DomphyElement,
              {
                ul: [
                  ...projects.map((project) =>
                    renderProjectRow(project, collapsed),
                  ),
                  renderProjectsMoreRow(),
                ],
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
            // Upstream hides the whole projects group in icon-rail mode
            // (`group-data-[collapsible=icon]:hidden`).
            style: {
              display: (l: Listener) => (collapsed.get(l) ? "none" : "flex"),
              flexDirection: "column",
              gap: themeSpacing(1),
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
        if (
          (event.metaKey || event.ctrlKey) &&
          event.key.toLowerCase() === "b"
        ) {
          event.preventDefault();
          collapsed.set(!collapsed.get());
        }
      };
      window.addEventListener("keydown", onKeyDown);
      node.addHook("Remove", () =>
        window.removeEventListener("keydown", onKeyDown),
      );
    },
    style: {
      position: "relative",
      display: "flex",
      flexDirection: "column",
      flexShrink: "0",
      width: (l: Listener) =>
        collapsed.get(l) ? themeSpacing(12) : themeSpacing(64),
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
        transform: (l: Listener) =>
          sidebarOpen.get(l) ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.2s ease",
        boxShadow: (l: Listener) =>
          `0 0 ${themeSpacing(6)} ${themeColor(l, "shift-4", "neutral")}`,
      },
    },
  } as unknown as DomphyElement<"aside">;

  // The "inset" look: the main panel is its own rounded, shadowed card
  // (lighter dataTone than the muted root backdrop) with a margin that
  // shrinks — growing the card into the freed space — in step with the
  // sidebar's own collapse transition, using the same timing/easing.
  // Upstream sidebar-08's page header is a bare `flex h-16 shrink-0
  // items-center gap-2` bar with no border-bottom (unlike sidebar05/06, whose
  // upstream headers carry `border-b`). The shared sidebarStickyHeader always
  // draws that border, so strip it on this variant's header instance only.
  const stickyHeader = sidebarStickyHeader({
    onToggle: () => {
      sidebarOpen.set(!sidebarOpen.get());
      collapsed.set(!collapsed.get());
    },
    breadcrumbItems,
  });
  delete (stickyHeader as unknown as { style: Record<string, unknown> }).style
    .borderBottom;

  const mainElement: DomphyElement<"main"> = {
    main: [stickyHeader, sidebarMainContent(children)],
    dataTone: "shift-0",
    style: {
      display: "flex",
      flexDirection: "column",
      flex: "1",
      minWidth: "0",
      minHeight: "0",
      overflow: "hidden",
      margin: (l: Listener) =>
        collapsed.get(l) ? themeSpacing(2) : themeSpacing(3),
      borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 3),
      boxShadow: (l: Listener) =>
        `0 ${themeSpacing(1)} ${themeSpacing(6)} ${themeColor(l, "shift-4", "neutral")}`,
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
      transition: "margin 0.2s linear",
    },
  } as unknown as DomphyElement<"main">;

  return {
    div: [
      asideElement,
      mainElement,
      sidebarBackdrop(sidebarOpen, () => sidebarOpen.set(false)),
    ],
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
