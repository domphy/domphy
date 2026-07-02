// magicui "Animated Gradient Text" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied).
// Text filled with a multi-stop gradient that pans continuously and loops
// via animated `background-position` over an oversized `background-size`
// (300%) — the same `background-clip: text` panning technique as
// `animatedShinyText`, but here the gradient is fully opaque everywhere (no
// muted/bright alternation), so the whole word reads as a slow color flow
// rather than a single glint. Optionally wraps the text in a pill whose OWN
// border is filled with the identical panning gradient via the classic
// dual-background-layer "gradient border" trick (an opaque surface layer
// clipped to the padding-box, the gradient layer clipped to the
// border-box) — no `mask-composite`/pseudo-element needed.
//
// The upstream spec's default colors are literal hex (`#ffaa40` orange to
// `#9c40ff` purple) — Domphy's doctor rules forbid raw hex/rgb colors on
// style props, and this theme ships no dedicated purple family, so
// `colorFrom`/`colorVia`/`colorTo` are exposed as `ThemeColor` roles instead,
// defaulting to `"warning"` (matches upstream's orange) → `"secondary"`
// (this theme's rose/magenta family — the closest built-in role to
// "vivid purple") → `"primary"` (blue), which keeps the flow fully
// theme-aware (it follows light/dark theme swaps) at the cost of not
// accepting an arbitrary caller-supplied hex pair. Same tradeoff
// `glareHover` documents for its own literal-color prop.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface AnimatedGradientTextProps {
  /** Text content. Defaults to `"Animated Gradient Text"`. */
  children?: string;
  /** Flow speed multiplier — higher plays faster. Defaults to `1`. */
  speed?: number;
  /** First gradient stop's theme color family. Defaults to `"warning"` (orange). */
  colorFrom?: ThemeColor;
  /** Middle gradient stop's theme color family. Defaults to `"secondary"` (this theme's closest role to purple). */
  colorVia?: ThemeColor;
  /** Last gradient stop's theme color family. Defaults to `"primary"` (blue). */
  colorTo?: ThemeColor;
  /** Wraps the text in a pill whose border is filled with the same flowing
   * gradient (a subtle ring/glow around the label). Defaults to `true`. */
  showPill?: boolean;
  style?: StyleObject;
}

let animatedGradientTextInstanceCounter = 0;

/**
 * Text filled with a continuously flowing multi-color gradient that slides
 * horizontally in an endless loop, optionally wrapped in a pill whose own
 * border carries the identical flowing gradient. Call with no arguments for
 * a working demo.
 */
function animatedGradientText(
  props: AnimatedGradientTextProps = {},
): DomphyElement {
  const text = props.children ?? "Animated Gradient Text";
  const speed = props.speed ?? 1;
  const colorFrom = props.colorFrom ?? "warning";
  const colorVia = props.colorVia ?? "secondary";
  const colorTo = props.colorTo ?? "primary";
  const showPill = props.showPill ?? true;

  const instanceId = ++animatedGradientTextInstanceCounter;
  // Base loop is 8s at speed=1; higher speed plays faster (shorter duration).
  const durationSeconds = Math.max(0.5, 8 / Math.max(speed, 0.01));

  const gradientStops = (listener: Listener): string =>
    `${themeColor(listener, "shift-8", colorFrom)}, ${themeColor(listener, "shift-8", colorVia)}, ${themeColor(listener, "shift-8", colorTo)}, ${themeColor(listener, "shift-8", colorFrom)}`;

  const textAnimationName = `animated-gradient-text-flow-${hashString(
    JSON.stringify({ instanceId, colorFrom, colorVia, colorTo }),
  )}`;
  const textKeyframes = {
    from: { backgroundPosition: "0% 50%" },
    to: { backgroundPosition: "300% 50%" },
  };

  const gradientSpan: DomphyElement<"span"> = {
    span: text,
    style: {
      backgroundImage: (listener: Listener) =>
        `linear-gradient(90deg, ${gradientStops(listener)})`,
      backgroundSize: "300% 100%",
      backgroundRepeat: "repeat",
      backgroundClip: "text",
      WebkitBackgroundClip: "text",
      color: "transparent",
      animation: `${textAnimationName} ${durationSeconds}s linear infinite`,
      [`@keyframes ${textAnimationName}`]: textKeyframes,
    } as StyleObject,
  };

  if (!showPill) return gradientSpan;

  const pillAnimationName = `animated-gradient-pill-flow-${hashString(
    JSON.stringify({ instanceId, colorFrom, colorVia, colorTo, ring: true }),
  )}`;
  const pillKeyframes = {
    from: { backgroundPosition: "0 0, 0% 50%" },
    to: { backgroundPosition: "0 0, 300% 50%" },
  };

  return {
    div: [gradientSpan],
    style: {
      display: "inline-flex",
      alignItems: "center",
      paddingInline: themeSpacing(4),
      paddingBlock: themeSpacing(2),
      borderRadius: themeSpacing(20),
      border: "1px solid transparent",
      backgroundImage: (listener: Listener) =>
        `linear-gradient(${themeColor(listener, "inherit")}, ${themeColor(listener, "inherit")}), linear-gradient(90deg, ${gradientStops(listener)})`,
      backgroundOrigin: "border-box",
      backgroundClip: "padding-box, border-box",
      backgroundSize: "auto, 300% 100%",
      backgroundRepeat: "no-repeat, repeat",
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      animation: `${pillAnimationName} ${durationSeconds}s linear infinite`,
      [`@keyframes ${pillAnimationName}`]: pillKeyframes,
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { animatedGradientText };
