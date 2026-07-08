// shadcn/ui "sidebar-01" block — Domphy reimplementation.
//
// A left-docked application sidebar with a header switcher, docs-style search
// field, nav split into labeled groups, and a main content column with a
// sticky toggle+breadcrumb header. Structure/behavior of the header switcher,
// footer, nav-row rendering, rail and collapse mode live in the shared helper
// (./sidebar01-04-shared.ts) and are reused across sidebar01–04.
//
// The nav tree and breadcrumb below mirror upstream sidebar-01's
// `app-sidebar.tsx` `data.navMain` and `page.tsx` breadcrumb verbatim: four
// docs groups of plain-text links with "Data Fetching" (under "Build Your
// Application") marked active, so the breadcrumb points at a real nav target.

import type { DomphyElement } from "@domphy/core";
import {
  buildSidebarBlock,
  type SidebarBlockOptions,
  type SidebarBreadcrumbItem,
  type SidebarNavGroup,
} from "./sidebar01-04-shared.js";

// Upstream `data.navMain` (app-sidebar.tsx). Plain-text items, no per-item
// icon and no count badge — rendered icon-free via the shell's `showIcons: false`.
const SIDEBAR_01_NAV_GROUPS: SidebarNavGroup[] = [
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
];

// Upstream page.tsx breadcrumb: "Build Your Application" > "Data Fetching".
const SIDEBAR_01_BREADCRUMB: SidebarBreadcrumbItem[] = [
  { label: "Build Your Application" },
  { label: "Data Fetching", current: true },
];

/**
 * Docked app sidebar with grouped docs nav and a mobile overlay drawer. Call
 * with no arguments for a fully working demo. Caller-supplied `navGroups` /
 * `breadcrumb` still override the upstream defaults.
 */
function sidebar01(props: SidebarBlockOptions = {}): DomphyElement<"div"> {
  return buildSidebarBlock({
    breadcrumb: SIDEBAR_01_BREADCRUMB,
    ...props,
    defaultNavGroups: SIDEBAR_01_NAV_GROUPS,
    collapsibleSections: false,
    supportsChildren: false,
    floating: false,
    stickyHeader: true,
    manyContentRows: false,
    showSearch: true,
    // Upstream sidebar-01: VersionSwitcher header, text-only nav, no footer.
    headerVariant: "version",
    showIcons: false,
    showFooter: false,
  });
}

export { sidebar01 };
