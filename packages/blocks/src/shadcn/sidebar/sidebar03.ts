// shadcn/ui "sidebar-03" block — clean-room reimplementation.
//
// Same docked-sidebar chrome as sidebar-01, but top-level nav items can carry
// a `children` array: clicking such a row (a `<details>` disclosure) reveals
// an indented, guide-lined sub-list of links beneath it. Leaf items and child
// links navigate/activate directly. See ./sidebar01-04-shared.ts.
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
 * Docked app sidebar with a two-level (parent/child) nav tree. Call with no
 * arguments for a fully working demo.
 */
function sidebar03(props: SidebarBlockOptions = {}): DomphyElement<"div"> {
  return buildSidebarBlock({
    ...props,
    defaultNavGroups: DEFAULT_NAV_GROUPS_WITH_CHILDREN,
    collapsibleSections: false,
    supportsChildren: true,
    floating: false,
    stickyHeader: true,
    manyContentRows: false,
  });
}

export { sidebar03 };
