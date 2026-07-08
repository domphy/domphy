// shadcn/ui "sidebar-02" block — Domphy reimplementation.
//
// Same docked-sidebar chrome as sidebar-01, but each nav section header is
// itself a `<details>` disclosure: the section label + chevron toggle that
// group's item list open/closed independently of its siblings. Structure/
// behavior of the header switcher, footer, nav-row rendering, rail and collapse
// mode live in the shared helper (./sidebar01-04-shared.ts).
//
// The nav tree and breadcrumb below mirror upstream sidebar-02's
// `app-sidebar.tsx` `data.navMain` and `page.tsx` breadcrumb verbatim: five
// docs groups of plain-text links (Getting Started / Build Your Application /
// API Reference / Architecture / Community) with "Data Fetching" (under "Build
// Your Application") marked active, so the breadcrumb points at a real nav
// target.

import type { DomphyElement } from "@domphy/core";
import {
  buildSidebarBlock,
  type SidebarBlockOptions,
  type SidebarBreadcrumbItem,
  type SidebarNavGroup,
} from "./sidebar01-04-shared.js";

// Upstream `data.navMain` (app-sidebar.tsx). Plain-text items, no per-item
// icon and no count badge — rendered icon-free via the shell's `showIcons: false`.
const SIDEBAR_02_NAV_GROUPS: SidebarNavGroup[] = [
  {
    label: "Getting Started",
    items: [
      { label: "Installation", href: "#" },
      { label: "Project Structure", href: "#" },
    ],
  },
  {
    label: "Build Your Application",
    items: [
      { label: "Routing", href: "#" },
      { label: "Data Fetching", href: "#", active: true },
      { label: "Rendering", href: "#" },
      { label: "Caching", href: "#" },
      { label: "Styling", href: "#" },
      { label: "Optimizing", href: "#" },
      { label: "Configuring", href: "#" },
      { label: "Testing", href: "#" },
      { label: "Authentication", href: "#" },
      { label: "Deploying", href: "#" },
      { label: "Upgrading", href: "#" },
      { label: "Examples", href: "#" },
    ],
  },
  {
    label: "API Reference",
    items: [
      { label: "Components", href: "#" },
      { label: "File Conventions", href: "#" },
      { label: "Functions", href: "#" },
      { label: "next.config.js Options", href: "#" },
      { label: "CLI", href: "#" },
      { label: "Edge Runtime", href: "#" },
    ],
  },
  {
    label: "Architecture",
    items: [
      { label: "Accessibility", href: "#" },
      { label: "Fast Refresh", href: "#" },
      { label: "Next.js Compiler", href: "#" },
      { label: "Supported Browsers", href: "#" },
      { label: "Turbopack", href: "#" },
    ],
  },
  {
    label: "Community",
    items: [{ label: "Contribution Guide", href: "#" }],
  },
];

// Upstream page.tsx breadcrumb: "Build Your Application" > "Data Fetching".
const SIDEBAR_02_BREADCRUMB: SidebarBreadcrumbItem[] = [
  { label: "Build Your Application" },
  { label: "Data Fetching", current: true },
];

/**
 * Docked app sidebar whose nav groups are individually collapsible
 * accordions. Call with no arguments for a fully working demo. Caller-supplied
 * `navGroups` / `breadcrumb` still override the upstream defaults.
 */
function sidebar02(props: SidebarBlockOptions = {}): DomphyElement<"div"> {
  return buildSidebarBlock({
    breadcrumb: SIDEBAR_02_BREADCRUMB,
    ...props,
    defaultNavGroups: SIDEBAR_02_NAV_GROUPS,
    collapsibleSections: true,
    supportsChildren: false,
    floating: false,
    stickyHeader: true,
    manyContentRows: true,
    showSearch: true,
    // Upstream sidebar-02: VersionSwitcher header, text-only nav, no footer.
    headerVariant: "version",
    showIcons: false,
    showFooter: false,
  });
}

export { sidebar02 };
