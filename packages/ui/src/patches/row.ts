import type { PartialElement } from "@domphy/core";
import { themeDensity, themeSpacing } from "@domphy/theme";
import type { FlexAlign } from "./stack.js";

type FlexJustify =
  | "flex-start"
  | "center"
  | "flex-end"
  | "space-between"
  | "space-around"
  | "space-evenly";

/**
 * A horizontal flex row with spacing between children, vertically centered by
 * default. The general-purpose primitive for icon+label rows, field rows,
 * and button groups — instead of hand-rolling `display: flex; alignItems:
 * center; gap: ...`. `toolbar()` is a semantic alias of this same shape for
 * headers/nav bars. Styles the host only; apply to any block element.
 *
 * @param props.gap - Spacing multiplier for gap between items (default 4 = 1em at density 1).
 * @param props.align - Cross-axis alignment (`alignItems`). Defaults to `"center"`.
 * @param props.justify - Main-axis distribution (`justifyContent`). Unset by default (flex-start).
 * @param props.wrap - Allow items to wrap onto multiple lines. Defaults to `false`.
 * @example { div: [{ span: "Icon" }, { span: "Label" }], $: [row()] }
 * @example { div: [...], $: [row({ justify: "space-between", wrap: true })] }
 */
function row(
  props: {
    gap?: number;
    align?: FlexAlign;
    justify?: FlexJustify;
    wrap?: boolean;
  } = {},
): PartialElement {
  const { gap = 4, align = "center", justify, wrap = false } = props;
  return {
    style: {
      display: "flex",
      alignItems: align,
      gap: (listener) => themeSpacing(themeDensity(listener) * gap),
      ...(justify ? { justifyContent: justify } : {}),
      ...(wrap ? { flexWrap: "wrap" } : {}),
    },
  };
}

export { row };
export type { FlexJustify };
