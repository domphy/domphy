import type { DomphyElement, PartialElement } from "@domphy/core";
import { row } from "./row.js";

/**
 * A horizontal flex row with vertically centered items. Useful for headers,
 * toolbars, navigation bars, and action strips. A semantic alias of `row()`
 * at its default alignment — reach for `row()` directly for `justify`/`wrap`/
 * `align` beyond this shape.
 *
 * @param props.gap - Spacing multiplier for gap between items (default 4 = 1em).
 * @example { header: [...], $: [toolbar()] }
 * @example { nav: [...], $: [toolbar({ gap: 3 })] }
 */
function toolbar(props: { gap?: number } = {}): PartialElement {
  return row({ gap: props.gap });
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
