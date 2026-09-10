import type { DomphyElement, PartialElement } from "@domphy/core";
import { row } from "./row.js";
import type { FlexAlign, FlexJustify } from "./stack.js";

/**
 * A horizontal flex row with vertically centered items. Useful for headers,
 * toolbars, navigation bars, and action strips. A semantic alias of `row()`;
 * wrap/justify/align/density are forwarded so callers do not drop down to
 * hand-rolled flex.
 *
 * @param props.gap - Spacing multiplier for gap between items (default 4).
 *   Bounded-control mode (`density: true`, default): `themeSpacing(themeDensity(l) * gap)`.
 *   Structural mode (`density: false`): bare `themeSpacing(gap)`.
 * @param props.wrap - Allow items to wrap onto multiple lines. Defaults to `false`.
 * @param props.justify - Main-axis distribution (`justifyContent`). Unset by default.
 * @param props.align - Cross-axis alignment (`alignItems`). Defaults to `"center"` (row default).
 * @param props.density - When true (default), gap is multiplied by theme density.
 *   When false, gap is structural `themeSpacing(n)`.
 * @example { header: [...], $: [toolbar()] }
 * @example { nav: [...], $: [toolbar({ gap: 3 })] }
 * @example { header: [...], $: [toolbar({ wrap: true, justify: "space-between" })] }
 */
function toolbar(
  props: {
    gap?: number;
    wrap?: boolean;
    justify?: FlexJustify;
    align?: FlexAlign;
    density?: boolean;
  } = {},
): PartialElement {
  return row(props);
}

/**
 * A flex spacer that expands to fill available space in a toolbar, pushing
 * subsequent items to the far end.
 *
 * @example { header: [logo, toolbarSpacer(), nav, actions], $: [toolbar()] }
 */
function toolbarSpacer(): DomphyElement {
  return { div: null, style: { flex: "1 1 0" } };
}

export { toolbar, toolbarSpacer };
