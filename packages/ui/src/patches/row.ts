import type { PartialElement } from "@domphy/core";
import { themeDensity, themeSpacing } from "@domphy/theme";
import type { FlexAlign, FlexJustify } from "./stack.js";

/**
 * A horizontal flex row with spacing between children, vertically centered by
 * default. The general-purpose primitive for icon+label rows, field rows,
 * and button groups — instead of hand-rolling `display: flex; alignItems:
 * center; gap: ...`. `toolbar()` is a semantic alias of this same shape for
 * headers/nav bars. Styles the host only; apply to any block element.
 *
 * @param props.gap - Spacing multiplier for gap between items (default 4).
 *   Bounded-control mode (`density: true`, default): `themeSpacing(themeDensity(l) * gap)`
 *   — at default density 1.5, gap 4 = 1.5em.
 *   Structural/page-column mode (`density: false`): bare `themeSpacing(gap)` with no
 *   density multiply — gap 4 = 1em, matching AGENTS.md "bare themeSpacing(n)".
 * @param props.align - Cross-axis alignment (`alignItems`). Defaults to `"center"`.
 * @param props.justify - Main-axis distribution (`justifyContent`). Unset by default (flex-start).
 * @param props.wrap - Allow items to wrap onto multiple lines. Defaults to `false`.
 * @param props.density - When true (default), gap is multiplied by theme density
 *   (bounded controls). When false, gap is structural `themeSpacing(n)` — use this
 *   for page/form columns.
 * @example { div: [{ span: "Icon" }, { span: "Label" }], $: [row()] }
 * @example { div: [...], $: [row({ justify: "space-between", wrap: true })] }
 * @example { div: [...], $: [row({ gap: 4, density: false })] }
 */
function row(
  props: {
    gap?: number;
    align?: FlexAlign;
    justify?: FlexJustify;
    wrap?: boolean;
    density?: boolean;
  } = {},
): PartialElement {
  const { gap = 4, align = "center", justify, wrap = false, density = true } =
    props;
  return {
    style: {
      display: "flex",
      alignItems: align,
      gap: density
        ? (listener) => themeSpacing(themeDensity(listener) * gap)
        : () => themeSpacing(gap),
      ...(justify ? { justifyContent: justify } : {}),
      ...(wrap ? { flexWrap: "wrap" } : {}),
    },
  };
}

export { row };
export type { FlexJustify };
