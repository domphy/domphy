import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

/**
 * Container patch that establishes a `segmented` context for single-select navigation.
 * Style: inline pill-shaped control with muted background. Use with `segmentedItem` patches on child `<button>` elements.
 *
 * @param props.value - Initially selected item key. Accepts a value or state. Defaults to `""`.
 * @param props.color - Theme color for the control background. Defaults to `"neutral"`.
 * @example { div: null, $: [segmented({ value: "month" })] }
 */
function segmented(
  props: { value?: ValueOrState<string>; color?: ThemeColor } = {},
): PartialElement {
  const { color = "neutral" } = props;
  return {
    role: "radiogroup",
    _context: {
      segmented: { value: toState(props.value ?? "") },
    },
    style: {
      display: "inline-flex",
      paddingBlock: themeSpacing(1),
      paddingInline: themeSpacing(1),
      gap: themeSpacing(0.5),
      borderRadius: themeSpacing(10),
      backgroundColor: (listener) => themeColor(listener, "shift-2", color),
    },
  };
}

export { segmented };
