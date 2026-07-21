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

  // Shimmer sweeps left→right over a mid-ramp base (reads as loading, not
  // a flat opacity blink). Base + highlight are both theme tokens so the
  // effect adapts to light/dark surfaces.
  const keyframes = {
    "0%": { backgroundPosition: "200% 0" },
    "100%": { backgroundPosition: "-200% 0" },
  };
  const animationName = hashString(JSON.stringify(keyframes));
  return {
    ariaHidden: "true",
    dataTone: "shift-2",
    style: {
      fontSize: (listener) => themeSize(listener),
      color: (listener) => themeColor(listener, "text", color.get(listener)),
      height: themeSpacing(6),
      display: "block",
      borderRadius: themeSpacing(1),
      backgroundColor: (listener) =>
        themeColor(listener, "inherit", color.get(listener)),
      backgroundImage: (listener) =>
        `linear-gradient(90deg, ${themeColor(listener, "inherit", color.get(listener))} 0%, ${themeColor(listener, "shift-4", color.get(listener))} 50%, ${themeColor(listener, "inherit", color.get(listener))} 100%)`,
      backgroundSize: "200% 100%",
      animation: `${animationName} 1.6s ease-in-out infinite`,
      [`@keyframes ${animationName}`]: keyframes,
    } as StyleObject,
  };
}

export { skeleton };
