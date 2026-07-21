import type { PartialElement, StyleObject } from "@domphy/core";
import { toState, type ValueOrState } from "@domphy/core";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

/**
 * Circular ring progress indicator rendered via CSS `conic-gradient` and a
 * circular `mask`. Progress starts at 12 o'clock and advances clockwise.
 * Exposes `role="progressbar"` with `aria-valuenow/min/max`. Apply to a `<div>`.
 *
 * @hostTag div
 * @param props.value - Progress percentage 0–100. Accepts a value or reactive state. Defaults to `0`.
 * @param props.color - Theme color for the filled arc. Accepts a value or reactive state. Defaults to `"primary"`.
 * @param props.trackColor - Theme color for the background track. Accepts a value or reactive state. Defaults to `"neutral"`.
 * @param props.size - Diameter in `themeSpacing` units. Defaults to `16` (= `4em`).
 * @param props.thickness - Ring stroke as a fraction of the radius (0–0.5). Defaults to `0.25`.
 * @example { div: null, $: [ringProgress({ value: 65 })] }
 * @example { div: null, $: [ringProgress({ value: loadingState, color: "success", size: 20 })] }
 */
function ringProgress(
  props: {
    value?: ValueOrState<number>;
    color?: ValueOrState<ThemeColor>;
    trackColor?: ValueOrState<ThemeColor>;
    size?: number;
    thickness?: number;
  } = {},
): PartialElement {
  const { size = 16, thickness = 0.25 } = props;
  const value = toState(props.value ?? 0, "value");
  const color = toState(props.color ?? "primary", "color");
  const trackColor = toState(props.trackColor ?? "neutral", "trackColor");

  // Mask cuts the center to create a donut shape.
  // Uses `closest-side` so the gradient circle matches the visible element circle
  // exactly, making `holePercent` directly represent the fraction of outer radius.
  const holePercent = Math.round((1 - thickness) * 100);
  const mask = `radial-gradient(circle closest-side, transparent ${holePercent}%, black ${holePercent}%)`;

  return {
    role: "progressbar",
    ariaValuenow: (l) => String(Math.round(value.get(l))),
    ariaValuemin: "0",
    ariaValuemax: "100",
    _onInsert: (node) => {
      if (node.tagName !== "div") {
        console.warn('"ringProgress" patch must use div tag');
      }
    },
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: themeSpacing(size),
      height: themeSpacing(size),
      borderRadius: "50%",
      // Text color tracks the filled arc so any overlay label inherits it.
      color: (l) => themeColor(l, "shift-9", color.get(l)),
      // Fill arc from 12 o'clock clockwise; `from -90deg` rotates the start point.
      background: (l) =>
        `conic-gradient(from -90deg, ${themeColor(l, "shift-9", color.get(l))} ${value.get(l)}%, ${themeColor(l, "shift-3", trackColor.get(l))} 0%)`,
      WebkitMask: mask,
      mask,
    } as StyleObject,
  };
}

export { ringProgress };
