import type { PartialElement } from "@domphy/core";
import { themeDensity, themeSpacing } from "@domphy/theme";
import type { FlexAlign } from "./stack.js";

/**
 * A CSS grid with a column template and spacing between cells — the
 * general-purpose primitive for card/property/stat grids instead of
 * hand-rolling `display: "grid"; gridTemplateColumns: ...; gap: ...`.
 * Mirrors `row()`'s contract. Styles the host only; apply to any block
 * element.
 *
 * @param props.columns - Column count (expanded to `repeat(N, minmax(0, 1fr))`)
 *   or a raw `grid-template-columns` value. Defaults to `1`.
 * @param props.gap - Spacing multiplier for gap between cells (default 4 = 1em at density 1).
 * @param props.align - Block-axis alignment of items (`alignItems`). Unset by default.
 * @example { div: [{ div: "A" }, { div: "B" }], $: [grid({ columns: 2 })] }
 * @example { div: [...], $: [grid({ columns: "repeat(auto-fill, minmax(12em, 1fr))", gap: 6 })] }
 */
function grid(
  props: { columns?: number | string; gap?: number; align?: FlexAlign } = {},
): PartialElement {
  const { columns = 1, gap = 4, align } = props;
  return {
    style: {
      display: "grid",
      gridTemplateColumns:
        typeof columns === "number"
          ? `repeat(${columns}, minmax(0, 1fr))`
          : columns,
      gap: (listener) => themeSpacing(themeDensity(listener) * gap),
      ...(align ? { alignItems: align } : {}),
    },
  };
}

export { grid };
