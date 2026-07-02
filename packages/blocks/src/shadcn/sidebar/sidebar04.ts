// shadcn/ui "sidebar-04" block — clean-room reimplementation.
//
// Same parent/child nav tree as sidebar-03, but the sidebar panel floats:
// inset from the page edge with margin, rounded corners and a border/shadow
// instead of sitting flush against the viewport edge, and noticeably wider
// (~19rem vs ~16rem). The content header is simpler (not sticky). See
// ./sidebar01-04-shared.ts.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import {
  DEFAULT_NAV_GROUPS_WITH_CHILDREN,
  buildSidebarBlock,
  type SidebarBlockOptions,
} from "./sidebar01-04-shared.js";

/**
 * Floating, inset variant of the parent/child-nav sidebar — wider, rounded,
 * bordered card treatment. Call with no arguments for a fully working demo.
 */
function sidebar04(props: SidebarBlockOptions = {}): DomphyElement<"div"> {
  return buildSidebarBlock({
    ...props,
    defaultNavGroups: DEFAULT_NAV_GROUPS_WITH_CHILDREN,
    collapsibleSections: false,
    supportsChildren: true,
    floating: true,
    stickyHeader: false,
    manyContentRows: false,
  });
}

export { sidebar04 };
