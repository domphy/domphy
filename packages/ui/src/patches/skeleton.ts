import {
  hashString,
  type PartialElement,
  type StyleObject,
  toState,
  type ValueOrState,
} from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

/**
 * A loading placeholder block with a pulsing opacity animation. Marked `aria-hidden`, themed
 * background/foreground, fixed height, slight rounding. No host-tag check; typically applied
 * to a block-level element such as a `div` or `span`.
 *
 * @param props.color - Theme color tone for the placeholder. Accepts a value or reactive state.
 *   Defaults to `"neutral"`.
 * @example { div: null, $: [skeleton()] }
 */
function skeleton(
  props: { color?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");

  const keyframes = {
    "0%,100%": { opacity: 1 },
    "50%": { opacity: 0.4 },
  };
  const animationName = hashString(JSON.stringify(keyframes));
  return {
    ariaHidden: "true",
    dataTone: "shift-2",
    style: {
      fontSize: (listener) => themeSize(listener),
      color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
      height: themeSpacing(6),
      display: "block",
      borderRadius: themeSpacing(1),
      backgroundColor: (listener) =>
        themeColor(listener, "inherit", color.get(listener)),
      animation: `${animationName} 1.5s ease-in-out infinite`,
      [`@keyframes ${animationName}`]: keyframes,
    } as StyleObject,
  };
}

export { skeleton };
