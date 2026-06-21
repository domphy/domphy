import {
  merge,
  type PartialElement,
  toState,
  type ValueOrState,
} from "@domphy/core";
import { type ThemeColor, themeSpacing } from "@domphy/theme";

/**
 * Container patch for a step-progress indicator. Establishes `steps` context
 * with a reactive `current` index. Use with `stepItem` patches on child elements.
 *
 * @param props.current - Zero-based index of the active step. Accepts a value or state. Defaults to `0`.
 * @param props.direction - `"horizontal"` (default) or `"vertical"` layout.
 * @param props.color - Theme color for pending/track elements. Defaults to `"neutral"`.
 * @param props.accentColor - Theme color for active/completed elements. Defaults to `"primary"`.
 * @example { ol: null, $: [steps({ current: 1 })] }
 */
function steps(
  props: {
    current?: ValueOrState<number>;
    direction?: "horizontal" | "vertical";
    color?: ThemeColor;
    accentColor?: ThemeColor;
  } = {},
): PartialElement {
  const direction = props.direction ?? "horizontal";
  const color = props.color ?? "neutral";
  const accentColor = props.accentColor ?? "primary";

  const partial: PartialElement = {
    _onSchedule: (_node, element) => {
      const contextPartial = {
        _context: {
          steps: {
            current: toState(props.current ?? 0),
            direction,
            color,
            accentColor,
          },
        },
      };
      merge(element, contextPartial);
    },
    style: {
      display: "flex",
      flexDirection: direction === "vertical" ? "column" : "row",
      alignItems: direction === "vertical" ? "flex-start" : "center",
      gap: themeSpacing(2),
      listStyle: "none",
      margin: "0",
      padding: "0",
    },
  };
  return partial;
}

export { steps };
