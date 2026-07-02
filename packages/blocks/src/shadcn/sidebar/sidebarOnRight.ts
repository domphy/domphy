// shadcn/ui "sidebar-on-right" block — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed). The standard
// docked app sidebar mirrored to the right viewport edge, with the main
// content column rendered as a rounded/shadowed inset card (sidebar08-style)
// instead of a flush full-bleed panel, and the header's collapse toggle
// pushed to the header's right edge, adjacent to the sidebar. Shares its nav
// tree, collapse mechanics and mobile drawer with the rest of the sidebar-0N
// family via ./sidebar01-04-shared.ts — the `side`/`insetMain` options there
// are the only pieces of shared logic this variant needed added.
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
 * Docked app sidebar mirrored to the right viewport edge, with an inset main
 * content card and the collapse toggle on the header's right edge. Pass
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
    insetMain: true,
    stickyHeader: true,
    manyContentRows: false,
  });
}

export { sidebarOnRight };
