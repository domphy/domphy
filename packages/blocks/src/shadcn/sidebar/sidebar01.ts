// shadcn/ui "sidebar-01" block — clean-room reimplementation.
//
// A left-docked application sidebar: workspace switcher header, nav split
// into labeled groups, pinned account footer, and a main content column with
// a sticky toggle+breadcrumb header. Collapses to an icon-only rail on
// desktop (ctrl/cmd+B or the toggle button) and becomes an overlay drawer on
// narrow viewports. See ./sidebar01-04-shared.ts for the reusable pieces.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import {
  DEFAULT_NAV_GROUPS,
  buildSidebarBlock,
  type SidebarBlockOptions,
} from "./sidebar01-04-shared.js";

/**
 * Docked app sidebar with grouped nav, icon-rail collapse and a mobile
 * overlay drawer. Call with no arguments for a fully working demo.
 */
function sidebar01(props: SidebarBlockOptions = {}): DomphyElement<"div"> {
  return buildSidebarBlock({
    ...props,
    defaultNavGroups: DEFAULT_NAV_GROUPS,
    collapsibleSections: false,
    supportsChildren: false,
    floating: false,
    stickyHeader: true,
    manyContentRows: false,
    showSearch: true,
  });
}

export { sidebar01 };
