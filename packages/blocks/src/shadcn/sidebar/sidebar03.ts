// shadcn/ui "sidebar-03" block — Domphy reimplementation.
//
// Docs-style docked sidebar. Upstream sidebar-03 is structurally identical to
// sidebar-04 except it renders flush (standard variant) rather than as a
// floating inset card: a STATIC "Documentation / v1.0.0" branding header, a
// single flat nav (no group labels, no per-row icons) whose top-level entries
// are bold `<a>` links each followed by an ALWAYS-VISIBLE sub-list, a
// <SidebarRail/>, and NO footer. All of that lives in the shared
// `buildDocsSidebarBlock()` helper, shared with sidebar04.

import type { DomphyElement } from "@domphy/core";
import {
  buildDocsSidebarBlock,
  type SidebarBlockOptions,
  type SidebarBreadcrumbItem,
  type SidebarNavItem,
} from "./sidebar01-04-shared.js";

// Upstream sidebar-03's `data.navMain`: a single flat list of top-level
// sections, each with an always-visible sub-list. No group labels, no icons.
const DOCS_NAV: SidebarNavItem[] = [
  {
    label: "Getting Started",
    href: "#",
    children: [
      { label: "Installation", href: "#" },
      { label: "Project Structure", href: "#" },
    ],
  },
  {
    label: "Build Your Application",
    href: "#",
    children: [
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
    href: "#",
    children: [
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
    href: "#",
    children: [
      { label: "Accessibility", href: "#" },
      { label: "Fast Refresh", href: "#" },
      { label: "Next.js Compiler", href: "#" },
      { label: "Supported Browsers", href: "#" },
      { label: "Turbopack", href: "#" },
    ],
  },
  {
    label: "Community",
    href: "#",
    children: [{ label: "Contribution Guide", href: "#" }],
  },
];

// Upstream page.tsx breadcrumb: "Build Your Application" > "Data Fetching".
const SIDEBAR_03_BREADCRUMB: SidebarBreadcrumbItem[] = [
  { label: "Build Your Application" },
  { label: "Data Fetching", current: true },
];

/**
 * Flush docs sidebar (shadcn "sidebar-03"): a static docs identity header, a
 * flat bold-link nav with always-visible sub-lists, and no footer. Call with no
 * arguments for a fully working demo.
 */
function sidebar03(props: SidebarBlockOptions = {}): DomphyElement<"div"> {
  const navItems = props.navGroups
    ? props.navGroups.flatMap((group) => group.items)
    : DOCS_NAV;
  return buildDocsSidebarBlock({
    title: props.header?.workspaceName ?? "Documentation",
    subtitle: props.header?.workspacePlan ?? "v1.0.0",
    navItems,
    breadcrumb: props.breadcrumb ?? SIDEBAR_03_BREADCRUMB,
    defaultCollapsed: props.defaultCollapsed,
    side: props.side,
    floating: false,
  });
}

export { sidebar03 };
