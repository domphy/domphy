// magicui "Aurora Text" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). Display
// text filled with a diagonal multi-color gradient that pans back and forth
// across the glyphs on an endless ease-in-out loop — the same
// `background-clip: text` panning technique this package's
// `animatedGradientText`/`animatedShinyText` use, but alternating direction
// each cycle (CSS `animation-direction: alternate`) instead of resetting
// abruptly, and repeating the first color at the gradient's end so the pan
// never shows a visible seam.
//
// The upstream spec's default four-color palette is literal hex
// (pink/magenta, purple, blue, cyan) — Domphy's doctor rules forbid raw
// hex/rgb colors on style props, so the palette is exposed as `ThemeColor`
// roles instead, defaulting to `["secondary", "highlight", "primary", "info"]`
// (this theme's closest four distinct built-in families to that hue spread).
// Same tradeoff `animatedGradientText` documents for its own default colors.
//
// Accessibility: the visible gradient-filled copy is `aria-hidden`, paired
// with a visually-hidden duplicate carrying the plain text — the same
// sr-only-text + aria-hidden-decoration pattern used by this package's
// `sidebarInDialog` block, generalized here to a public component per the
// spec's own DOM sketch.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { type ThemeColor, themeColor } from "@domphy/theme";

export type AuroraTextTag = "span" | "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export interface AuroraTextProps {
  /** Text content. Defaults to `"Aurora Text"`. */
  children?: string;
  /** Gradient color families the sweep cycles through. Defaults to four theme
   * roles standing in for magic UI's pink/purple/blue/cyan palette. */
  colors?: ThemeColor[];
  /** Speed multiplier — `2` sweeps twice as fast, `0.5` half as fast. Defaults to `1`. */
  speed?: number;
  /** Wrapping element tag. Defaults to `"span"`. */
  as?: AuroraTextTag;
  style?: StyleObject;
}

const SR_ONLY_STYLE = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: "0",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: "0",
} as const;

let auroraTextInstanceCounter = 0;

/**
 * Display text filled with a continuously panning multicolor gradient
 * (an "aurora" sweep), alternating direction on an endless ease-in-out loop.
 * Call with no arguments for a working demo.
 */
function auroraText(props: AuroraTextProps = {}): DomphyElement {
  const text = props.children ?? "Aurora Text";
  const colors = props.colors ?? (["secondary", "highlight", "primary", "info"] as ThemeColor[]);
  const speed = Math.max(props.speed ?? 1, 0.01);
  const wrapperTag = props.as ?? "span";

  const instanceId = ++auroraTextInstanceCounter;
  const durationSeconds = Math.max(0.5, 8 / speed);

  const gradientStops = (listener: Listener): string => {
    const roles = colors.length > 0 ? colors : (["primary"] as ThemeColor[]);
    // Repeat the first stop at the end so the alternating pan never shows a seam.
    const stops = [...roles, roles[0]];
    return stops.map((role) => themeColor(listener, "shift-8", role)).join(", ");
  };

  const animationName = `aurora-text-sweep-${hashString(JSON.stringify({ instanceId, colors }))}`;
  const keyframes = {
    "0%": { backgroundPosition: "0% 50%" },
    "100%": { backgroundPosition: "100% 50%" },
  };

  const auroraSpan: DomphyElement<"span"> = {
    span: text,
    ariaHidden: "true",
    _key: "aurora-fill",
    style: {
      backgroundImage: (listener: Listener) => `linear-gradient(135deg, ${gradientStops(listener)})`,
      backgroundSize: "200% 200%",
      backgroundClip: "text",
      WebkitBackgroundClip: "text",
      color: "transparent",
      WebkitTextFillColor: "transparent",
      animation: `${animationName} ${durationSeconds}s ease-in-out infinite alternate`,
      [`@keyframes ${animationName}`]: keyframes,
    } as StyleObject,
  };

  const outer = {
    [wrapperTag]: [{ span: text, _key: "sr-only-text", style: SR_ONLY_STYLE }, auroraSpan],
    style: {
      position: "relative",
      display: "inline-block",
      ...(props.style ?? {}),
    } as StyleObject,
  } as unknown as DomphyElement;

  return outer;
}

export { auroraText };
