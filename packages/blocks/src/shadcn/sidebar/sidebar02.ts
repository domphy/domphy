// shadcn/ui "sidebar-02" block — clean-room reimplementation.
//
// Same docked-sidebar chrome as sidebar-01, but each nav section header is
// itself a `<details>` disclosure: the section label + chevron toggle that
// group's item list open/closed independently of its siblings. The content
// pane is filled with many stacked placeholder rows to demonstrate scrolling
// independently under the pinned header. See ./sidebar01-04-shared.ts.
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
 * Docked app sidebar whose nav groups are individually collapsible
 * accordions. Call with no arguments for a fully working demo.
 */
function sidebar02(props: SidebarBlockOptions = {}): DomphyElement<"div"> {
  return buildSidebarBlock({
    ...props,
    defaultNavGroups: DEFAULT_NAV_GROUPS,
    collapsibleSections: true,
    supportsChildren: false,
    floating: false,
    stickyHeader: true,
    manyContentRows: true,
    showSearch: true,
  });
}

export { sidebar02 };
