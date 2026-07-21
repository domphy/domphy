import type { PartialElement } from "@domphy/core";
import { toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

/**
 * A semantic alert surface block with a colored inset bar, padding, and
 * `role="alert"`. Typically applied to a `<div>` (any block container).
 *
 * @param props.color - Surface/accent color tone. Optional `ValueOrState<ThemeColor>`, default "primary".
 * @example { div: "Saved successfully", $: [alert({ color: "success" })] }
 */
function alert(
  props: { color?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const color = toState(props.color ?? "primary", "color");

  return {
    role: "alert",
    // Alert is a semantic surface block, so it should shift the local surface context.
    dataTone: "shift-2",
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: themeSpacing(3),
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 2),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 4),
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1.5),
      boxShadow: (listener) =>
        `inset ${themeSpacing(1)} 0 0 0 ${themeColor(listener, "shift-8", color.get(listener))}`,
      backgroundColor: (listener) =>
        themeColor(listener, "inherit", color.get(listener)),
      color: (listener) =>
        themeColor(listener, "shift-10", color.get(listener)),
      fontSize: (listener) => themeSize(listener, "inherit"),
    },
  };
}

export { alert };
