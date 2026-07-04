// magicui "Animated Circular Progress Bar" — clean-room reimplementation from
// the public behavior/visual spec only (no upstream source viewed or
// copied). A thick circular ring gauge: a neutral background "track" circle
// drawn first, with a saturated accent "progress" arc drawn on top of it
// starting at 12 o'clock and sweeping clockwise, plus a centered percentage
// readout.
//
// Built from raw SVG `<circle>` elements (100x100 viewBox, radius/stroke
// ratio matching the reference's ~45/~10) rather than `ringProgress()`'s
// `conic-gradient` + circular `mask` technique — the spec explicitly calls
// for a dash-length/gap stroke pattern, and expressing the arc via
// `stroke-dasharray`/`stroke-dashoffset` (rather than a conic-gradient wedge)
// keeps the sweep's start-cap rounded (`stroke-linecap: round`) and lets the
// whole arc animate as one continuous CSS `transition` on `stroke-dashoffset`
// when the value changes.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { toState, type ValueOrState } from "@domphy/core";
import { strong } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface AnimatedCircularProgressBarProps {
  /** Current progress value. Accepts a value or reactive state. When omitted, the
   * component drives its own demo state, cycling upward in 10% steps. */
  value?: ValueOrState<number>;
  /** Lower bound of `value`'s range. Defaults to `0`. */
  min?: number;
  /** Upper bound of `value`'s range. Defaults to `100`. */
  max?: number;
  /** Theme color for the progress arc. Defaults to `"primary"`. */
  primaryColor?: ThemeColor;
  /** Theme color for the background track. Defaults to `"neutral"`. */
  secondaryColor?: ThemeColor;
  /** Ring diameter, in `themeSpacing` units. Defaults to `32`. */
  size?: number;
  /** SVG stroke width, in viewBox user units (0–100 viewBox, so this is roughly a
   * percentage of the ring's own diameter). Defaults to `10`. */
  strokeWidth?: number;
  /** Interval, in ms, between auto-demo steps when `value` is omitted. Defaults to `2000`. */
  autoPlayIntervalMs?: number;
  /** Accessible name for the `role="progressbar"` element. Defaults to `"Progress"`. */
  label?: string;
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

const VIEWBOX_SIZE = 100;
const VIEWBOX_CENTER = VIEWBOX_SIZE / 2;

function clampPercent(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

/**
 * A circular ring gauge whose colored arc smoothly animates to a new
 * percentage whenever its value changes, with the numeric percentage shown
 * centered inside the ring. Call with no arguments for a working demo — the
 * ring auto-cycles upward in 10% steps.
 */
function animatedCircularProgressBar(
  props: AnimatedCircularProgressBarProps = {},
): DomphyElement<"div"> {
  const min = props.min ?? 0;
  const max = props.max ?? 100;
  const primaryColor = props.primaryColor ?? "primary";
  const secondaryColor = props.secondaryColor ?? "neutral";
  const size = props.size ?? 32;
  const strokeWidth = props.strokeWidth ?? 10;
  const autoPlayIntervalMs = props.autoPlayIntervalMs ?? 2000;
  const label = props.label ?? "Progress";
  const hasExternalValue = props.value !== undefined;

  const value = toState(props.value ?? min, "value");
  const radius = VIEWBOX_CENTER - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;

  const percent = (listener: Listener) => clampPercent(value.get(listener), min, max);

  const trackCircle: DomphyElement<"circle"> = {
    circle: null,
    cx: String(VIEWBOX_CENTER),
    cy: String(VIEWBOX_CENTER),
    r: String(radius),
    fill: "none",
    strokeWidth: String(strokeWidth),
    ariaHidden: "true",
    // Decorative background ring with no text of its own — exempt from the
    // missing-color contract, matching meteors.ts's tail-gradient spans.
    _doctorDisable: "missing-color",
    style: {
      stroke: (listener: Listener) => themeColor(listener, "shift-3", secondaryColor),
    } as StyleObject,
  } as DomphyElement<"circle">;

  const progressCircle: DomphyElement<"circle"> = {
    circle: null,
    cx: String(VIEWBOX_CENTER),
    cy: String(VIEWBOX_CENTER),
    r: String(radius),
    fill: "none",
    strokeWidth: String(strokeWidth),
    strokeLinecap: "round",
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    style: {
      stroke: (listener: Listener) => themeColor(listener, "shift-9", primaryColor),
      strokeDasharray: `${circumference} ${circumference}`,
      strokeDashoffset: (listener: Listener) =>
        `${(circumference - (percent(listener) / 100) * circumference).toFixed(2)}`,
      transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)",
    } as StyleObject,
  } as DomphyElement<"circle">;

  const percentReadout: DomphyElement<"strong"> = {
    strong: (listener: Listener) => `${Math.round(percent(listener))}%`,
    $: [strong({ color: primaryColor })],
    dataSize: "increase-2",
    style: { margin: 0 } as StyleObject,
    // Briefly replays a fade whenever the underlying value changes, so the
    // number reads as updating rather than silently jumping — the light
    // "fade-in on update" the spec calls for.
    _onMount: (node) => {
      const element = node.domElement as HTMLElement | null;
      if (!element || typeof element.animate !== "function") return;
      const release = value.addListener(() => {
        element.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 250, easing: "ease-out" });
      });
      node.addHook("Remove", () => release());
    },
  };

  return {
    div: [
      {
        svg: [trackCircle, progressCircle],
        viewBox: `0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`,
        ariaHidden: "true",
        // Rotates the arc's start point from SVG's default 3 o'clock to 12
        // o'clock, matching ringProgress()'s `from -90deg` conic-gradient start.
        style: { display: "block", width: "100%", height: "100%", transform: "rotate(-90deg)" } as StyleObject,
      } as DomphyElement<"svg">,
      {
        div: [percentReadout],
        style: {
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        } as StyleObject,
      } as DomphyElement<"div">,
    ],
    role: "progressbar",
    ariaValuenow: (listener: Listener) => String(Math.round(value.get(listener))),
    ariaValuemin: String(min),
    ariaValuemax: String(max),
    ariaLabel: label,
    _onMount: (node) => {
      if (hasExternalValue || typeof window === "undefined") return;
      const timer = setInterval(() => {
        const next = value.get() + (max - min) / 10;
        value.set(next > max ? min : next);
      }, autoPlayIntervalMs);
      node.addHook("Remove", () => clearInterval(timer));
    },
    style: {
      position: "relative",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: themeSpacing(size),
      height: themeSpacing(size),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { animatedCircularProgressBar };
