import type { PartialElement, StyleObject } from "@domphy/core";
import { hashString, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

const keyframes = { to: { transform: "rotate(360deg)" } };
const animationName = hashString(JSON.stringify(keyframes));

/**
 * A circular loading spinner: a themed ring with a contrasting top border that rotates
 * continuously. Marked `role="status"` with `aria-label="loading"`.
 *
 * @hostTag span
 * @param props.color - Theme color tone for the ring/highlight. Accepts a value or reactive
 *   state. Defaults to `"neutral"`.
 * @example { span: null, $: [spinner()] }
 */
function spinner(
  props: { color?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");

  return {
    role: "status",
    ariaLabel: "loading",
    _onInsert: (node) => {
      if (node.tagName !== "span") {
        console.warn(`"spinner" patch must use span tag`);
      }
    },
    style: {
      fontSize: (listener) => themeSize(listener),
      backgroundColor: (listener) => themeColor(listener),
      color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
      display: "inline-block",
      margin: 0,
      flexShrink: 0,
      width: themeSpacing(6),
      height: themeSpacing(6),
      borderRadius: "50%",
      border: (listener) =>
        `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-4", color.get(listener))}`,
      borderTopColor: (listener) =>
        themeColor(listener, "shift-9", color.get(listener)),
      boxSizing: "border-box",
      padding: 0,
      animation: `${animationName} 0.7s linear infinite`,
      [`@keyframes ${animationName}`]: keyframes,
    } as StyleObject,
  };
}

export { spinner };
