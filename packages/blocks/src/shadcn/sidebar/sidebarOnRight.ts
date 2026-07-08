// shadcn/ui "sidebar-on-right" block (registry: sidebar-14). The standard
// docked app sidebar mirrored to the right viewport edge, with a flush
// full-bleed main content panel (upstream's Sidebar variant stays the
// "sidebar" default, not "inset") and a static (non-sticky) content header,
// with the header's collapse toggle pushed to the header's right edge,
// adjacent to the sidebar. Shares its nav tree, collapse mechanics and mobile
// drawer with the rest of the sidebar-0N family via ./sidebar01-04-shared.ts —
// the `side` option there is the only piece of shared logic this variant
// needed added.

import type { DomphyElement } from "@domphy/core";
import {
  DEFAULT_NAV_GROUPS_WITH_CHILDREN,
  buildSidebarBlock,
  type SidebarBlockOptions,
} from "./sidebar01-04-shared.js";

/**
 * Docked app sidebar mirrored to the right viewport edge, with a flush main
 * content panel and a static (non-sticky) content header. Pass
 * `side: "left"` to fall back to the family's standard left-docked layout.
 * Call with no arguments for a fully working demo.
 */
function sidebarOnRight(props: SidebarBlockOptions = {}): DomphyElement<"div"> {
  return buildSidebarBlock({
    ...props,
    side: props.side ?? "right",
    defaultNavGroups: DEFAULT_NAV_GROUPS_WITH_CHILDREN,
    collapsibleSections: false,
    supportsChildren: true,
    floating: false,
    insetMain: false,
    stickyHeader: false,
    manyContentRows: false,
  });
}

export { sidebarOnRight };
