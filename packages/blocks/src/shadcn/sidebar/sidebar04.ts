// shadcn/ui "sidebar-04" block — Domphy reimplementation.
//
// Structurally identical to sidebar-03 (static docs identity header, a flat
// bold-link nav with always-visible sub-lists, a <SidebarRail/>, and NO footer)
// but rendered as a FLOATING inset card (upstream `Sidebar variant="floating"`)
// rather than a flush standard panel. Both variants share
// `buildDocsSidebarBlock()`; `floating: true` is the only difference.

import type { DomphyElement } from "@domphy/core";
import {
  buildDocsSidebarBlock,
  DEFAULT_BREADCRUMB,
  type SidebarBlockOptions,
  type SidebarNavItem,
} from "./sidebar01-04-shared.js";

// Upstream sidebar-04's sample nav: a single flat list of top-level sections,
// each with an always-visible sub-list. No group labels, no icons.
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

/**
 * Floating, inset docs sidebar (shadcn "sidebar-04"): a static docs identity
 * header, a flat bold-link nav with always-visible sub-lists, and no footer.
 * Call with no arguments for a fully working demo.
 */
function sidebar04(props: SidebarBlockOptions = {}): DomphyElement<"div"> {
  const navItems = props.navGroups
    ? props.navGroups.flatMap((group) => group.items)
    : DOCS_NAV;
  return buildDocsSidebarBlock({
    title: props.header?.workspaceName ?? "Documentation",
    subtitle: props.header?.workspacePlan ?? "v1.0.0",
    navItems,
    breadcrumb: props.breadcrumb ?? DEFAULT_BREADCRUMB,
    defaultCollapsed: props.defaultCollapsed,
    side: props.side,
    floating: true,
  });
}

export { sidebar04 };
