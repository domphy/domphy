// shadcn/ui "sidebar-16" block ("A sidebar with a header and a search form").
// A full-featured sidebar (plain brand link, nested Platform nav, Projects
// list, bottom-pinned secondary nav, user footer) paired with a full-width
// site header that is a SIBLING of the sidebar rather than nested inside its
// own `<main>` scroll container. The header sits `position: fixed` above
// everything, and a `--siteHeaderHeight` custom property on the page wrapper
// lets the sidebar/content row offset correctly beneath it.
//
// Collapse is OFFCANVAS (upstream `<Sidebar>` default `collapsible="offcanvas"`,
// AppSidebar passes no override): the header toggle slides the whole panel off
// the left edge and collapses its layout gap to zero — NOT the icon-rail mode
// of sidebar-07. The panel is `position: fixed` and a sibling spacer div
// reserves its width in the flow, mirroring shadcn's gap + fixed-container pair.
//
// A handful of details live in the shared ./sidebar05-08-shared.ts renderers
// (user-footer menu items, project-row "more" menu items, default main-content
// grid) and so are shared across sidebar variants rather than owned here.

import type { DomphyElement, ElementNode, Listener } from "@domphy/core";
import { toState } from "@domphy/core";
import { breadcrumb, buttonGhost, inputSearch, link, small, strong } from "@domphy/ui";
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
  renderProjectsMoreRow,
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
    // Upstream marks the PARENT active (drives `defaultOpen`); no sub-item is
    // highlighted.
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
    items: [{ title: "Introduction" }, { title: "Get Started" }, { title: "Tutorials" }, { title: "Changelog" }],
  },
  {
    title: "Settings",
    icon: ICON_FOLDER,
    items: [{ title: "General" }, { title: "Team" }, { title: "Billing" }, { title: "Limits" }],
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

/** A de-emphasized secondary-nav row (upstream `SidebarMenuButton size="sm"`):
 * a small icon + label link, no active-state styling, no tooltip. */
function renderSecondaryNavRow(item: SidebarStickyHeaderSecondaryItem): DomphyElement<"li"> {
  return {
    li: [
      {
        a: [
          ...(item.icon ? [sidebarIcon(item.icon)] : []),
          { span: item.title, style: { flex: "1", textAlign: "left" } } as unknown as DomphyElement,
        ],
        href: item.href ?? "#",
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
          whiteSpace: "nowrap",
          color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
          backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
          "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
        },
      } as unknown as DomphyElement,
    ],
    _key: item.title,
  } as DomphyElement<"li">;
}

/** Brand header — a plain `<a>` link (icon badge + name/plan two-line label),
 * matching upstream `SidebarHeader`: no chevron and no team-switcher dropdown. */
function renderBrandHeader(brand: SidebarTeam): DomphyElement<"div"> {
  return {
    div: [
      {
        a: [
          {
            span: brand.logo ?? ICON_MARK,
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
              { strong: brand.name, $: [strong({ color: "neutral" })] } as unknown as DomphyElement,
              { small: brand.plan, $: [small({ color: "neutral" })] } as unknown as DomphyElement,
            ],
            style: {
              display: "flex",
              flexDirection: "column",
              gap: themeSpacing(0.5),
              flex: "1",
              minWidth: "0",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textAlign: "left",
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
          "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
        },
      } as unknown as DomphyElement,
    ],
    style: { padding: (l: Listener) => themeSpacing(themeDensity(l) * 2) },
  } as unknown as DomphyElement<"div">;
}

/** Breadcrumb trail; the whole nav hides below a breakpoint, matching
 * upstream's `<Breadcrumb className="hidden sm:block">`. */
function stickyHeaderBreadcrumb(items: SidebarBreadcrumbItem[]): DomphyElement<"nav"> {
  const crumbs: DomphyElement[] = items.map((item, index) => {
    const isLast = index === items.length - 1;
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
    } as unknown as DomphyElement;
  });
  return {
    nav: crumbs,
    $: [breadcrumb({ color: "neutral" })],
    style: { "@media (max-width: 40em)": { display: "none" } },
  } as DomphyElement<"nav">;
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
    searchPlaceholder = "Type to search...",
    navMain = DEFAULT_NAV_MAIN,
    projects = DEFAULT_PROJECTS,
    secondaryNav = DEFAULT_SECONDARY_NAV,
    user = DEFAULT_USER,
    children,
  } = props;

  const sidebarOpen = toState(true);
  // sidebar-16 collapses OFFCANVAS (the whole panel slides away), never to an
  // icon rail. The shared row renderers still take a `collapsed` state to pick
  // their expanded-vs-icon variant; pass a constant `false` so they only ever
  // draw the expanded rows.
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
        onClick: () => sidebarOpen.set(!sidebarOpen.get()),
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
      zIndex: "50",
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
      renderBrandHeader(brand),
      {
        nav: [
          {
            small: "Platform",
            style: { paddingInline: themeSpacing(3) },
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
                style: { paddingInline: themeSpacing(3) },
                $: [small({ color: "neutral" })],
              } as unknown as DomphyElement,
              {
                ul: [...projects.map((project) => renderProjectRow(project, collapsed)), renderProjectsMoreRow()],
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
            style: {
              display: "flex",
              flexDirection: "column",
              gap: themeSpacing(1),
              marginTop: themeSpacing(4),
            },
          } as unknown as DomphyElement,
          {
            // Upstream pins the secondary nav to the bottom of SidebarContent
            // via `className="mt-auto"`; the parent `<nav>` is a flex column so
            // `margin-top: auto` pushes this group to the bottom, above the footer.
            ul: secondaryNav.map((item) => renderSecondaryNavRow(item)),
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
        },
      } as unknown as DomphyElement,
      renderUserFooter(user),
      // Thin edge rail (upstream `SidebarRail`) — a click target to toggle the
      // sidebar. Off-screen with the panel when closed; reopen via the header.
      {
        div: null,
        ariaHidden: "true",
        onClick: () => sidebarOpen.set(!sidebarOpen.get()),
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
          sidebarOpen.set(!sidebarOpen.get());
        }
      };
      window.addEventListener("keydown", onKeyDown);
      node.addHook("Remove", () => window.removeEventListener("keydown", onKeyDown));
    },
    // Offcanvas panel: a fixed-position sibling of the layout spacer below.
    // Toggling `sidebarOpen` slides the whole panel off the left edge (upstream
    // `collapsible="offcanvas"` → fixed container `left: -sidebar-width`) while
    // the spacer collapses its reserved width to zero (upstream gap `w-0`).
    style: {
      position: "fixed",
      insetBlockStart: "var(--siteHeaderHeight)",
      insetBlockEnd: "0",
      insetInlineStart: "0",
      zIndex: "15",
      display: "flex",
      flexDirection: "column",
      width: themeSpacing(64),
      overflow: "hidden",
      transform: (l: Listener) => (sidebarOpen.get(l) ? "translateX(0)" : "translateX(-100%)"),
      transition: "transform 0.2s ease",
      borderInlineEnd: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
      "@media (max-width: 768px)": {
        width: themeSpacing(72),
        boxShadow: (l: Listener) => `0 0 ${themeSpacing(6)} ${themeColor(l, "shift-3", "neutral")}`,
      },
    },
  } as unknown as DomphyElement<"aside">;

  // Layout spacer that reserves the panel's width in the flex row on desktop and
  // collapses to zero when closed (or on mobile, where the panel is an overlay).
  const sidebarSpacer: DomphyElement<"div"> = {
    div: null,
    ariaHidden: "true",
    style: {
      flexShrink: "0",
      width: (l: Listener) => (sidebarOpen.get(l) ? themeSpacing(64) : "0"),
      transition: "width 0.2s ease",
      "@media (max-width: 768px)": { width: "0" },
    },
  } as unknown as DomphyElement<"div">;

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
        div: [sidebarSpacer, asideElement, mainElement, sidebarBackdrop(sidebarOpen, () => sidebarOpen.set(false))],
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
