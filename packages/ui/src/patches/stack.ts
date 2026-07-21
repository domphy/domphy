import type { PartialElement } from "@domphy/core";
import { themeDensity, themeSpacing } from "@domphy/theme";

type FlexAlign = "flex-start" | "center" | "flex-end" | "stretch" | "baseline";

/**
 * A vertical flex column with spacing between children. The general-purpose
 * primitive for stacking blocks — form sections, panel content, card bodies —
 * instead of hand-rolling `display: flex; flexDirection: column; gap: ...`.
 * Styles the host only; apply to any block element.
 *
 * @param props.gap - Spacing multiplier for gap between children (default 3 = 0.75em at density 1).
 * @param props.align - Cross-axis alignment (`alignItems`). Unset by default (flex default, stretch).
 * @example { div: [{ h3: "Title" }, { p: "Body" }], $: [stack()] }
 * @example { div: [...], $: [stack({ gap: 2, align: "center" })] }
 */
function stack(
  props: { gap?: number; align?: FlexAlign } = {},
): PartialElement {
  const { gap = 3, align } = props;
  return {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: (listener) => themeSpacing(themeDensity(listener) * gap),
      ...(align ? { alignItems: align } : {}),
    },
  };
}

export { stack };
export type { FlexAlign };
