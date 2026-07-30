import type { PartialElement } from "@domphy/core";

/**
 * Visually hides an element while keeping it in the accessibility tree — the
 * classic "sr-only" recipe for screen-reader-only labels, live-region text,
 * and skip links (before focus). Styles the host only; apply to any element.
 *
 * @example { span: "Opens in a new tab", $: [visuallyHidden()] }
 */
function visuallyHidden(): PartialElement {
  return {
    style: {
      position: "absolute",
      width: "1px",
      height: "1px",
      padding: "0",
      margin: "-1px",
      overflow: "hidden",
      clip: "rect(0, 0, 0, 0)",
      whiteSpace: "nowrap",
      border: "0",
    },
  };
}

export { visuallyHidden };
