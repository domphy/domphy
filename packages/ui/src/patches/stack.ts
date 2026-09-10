import type { PartialElement } from "@domphy/core";
import { themeDensity, themeSpacing } from "@domphy/theme";

type FlexAlign = "flex-start" | "center" | "flex-end" | "stretch" | "baseline";

type FlexJustify =
  | "flex-start"
  | "center"
  | "flex-end"
  | "space-between"
  | "space-around"
  | "space-evenly";

/**
 * A vertical flex column with spacing between children. The general-purpose
 * primitive for stacking blocks — form sections, panel content, card bodies —
 * instead of hand-rolling `display: flex; flexDirection: column; gap: ...`.
 * Styles the host only; apply to any block element.
 *
 * @param props.gap - Spacing multiplier for gap between children (default 3).
 *   Bounded-control mode (`density: true`, default): `themeSpacing(themeDensity(l) * gap)`
 *   — at default density 1.5, gap 3 = 1.125em.
 *   Structural/page-column mode (`density: false`): bare `themeSpacing(gap)` with no
 *   density multiply — gap 3 = 0.75em, matching AGENTS.md "bare themeSpacing(n)".
 * @param props.align - Cross-axis alignment (`alignItems`). Unset by default (flex default, stretch).
 * @param props.justify - Main-axis distribution (`justifyContent`). Unset by default (flex-start).
 * @param props.density - When true (default), gap is multiplied by theme density
 *   (bounded controls). When false, gap is structural `themeSpacing(n)` — use this
 *   for page/form columns.
 * @example { div: [{ h3: "Title" }, { p: "Body" }], $: [stack()] }
 * @example { div: [...], $: [stack({ gap: 2, align: "center" })] }
 * @example { div: [...], $: [stack({ gap: 3, density: false, justify: "space-between" })] }
 */
function stack(
  props: {
    gap?: number;
    align?: FlexAlign;
    justify?: FlexJustify;
    density?: boolean;
  } = {},
): PartialElement {
  const { gap = 3, align, justify, density = true } = props;
  return {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: density
        ? (listener) => themeSpacing(themeDensity(listener) * gap)
        : () => themeSpacing(gap),
      ...(align ? { alignItems: align } : {}),
      ...(justify ? { justifyContent: justify } : {}),
    },
  };
}

export { stack };
export type { FlexAlign, FlexJustify };
