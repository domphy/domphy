// magicui "Animated Shiny Text" — a muted neutral text label with a bright
// light-glare band that continuously sweeps across it. The glyphs carry a
// muted, semi-transparent base text `color`, and a narrow high-contrast band
// (`background-clip: text`, transparent flanks, strong middle stop) is slid
// across them by animating `background-position` from off the left edge to
// off the right and back. Where the band's peak passes it briefly RAISES the
// glyph's contrast — a glint that makes the text pop — purely via CSS
// keyframes (no JS per-frame work). Timing mirrors upstream: the band sweeps
// left→right over 0–30%, dwells off the RIGHT until 60%, sweeps back to the
// left by 90%, then holds off-left. Ships wrapped in the small rounded
// pill/badge the spec's demo shows it inside, with a trailing arrow glyph
// that nudges right on badge hover — a separate, non-looping hover
// interaction, independent of the shimmer's constant loop.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface AnimatedShinyTextProps {
  /** Label text. Defaults to `"Introducing Domphy Blocks"`. */
  children?: string;
  /** Pixel width of the bright sweeping band. Narrower reads as a sharp glint,
   * wider as a soft glow. Defaults to `100`. */
  shimmerWidth?: number;
  /** One full sweep loop, in ms. Defaults to `8000`. */
  duration?: number;
  /** Theme color family for the muted resting text. Defaults to `"neutral"`. */
  color?: ThemeColor;
  /** Wraps the text in the rounded pill/badge shown in the spec's demo, with a
   * trailing arrow that nudges right on hover. Defaults to `true`. */
  showBadge?: boolean;
  /** Optional leading icon/glyph rendered before the text inside the badge. */
  icon?: DomphyElement;
  style?: StyleObject;
}

let animatedShinyTextInstanceCounter = 0;

function arrowGlyph(): DomphyElement<"span"> {
  return {
    span: [
      {
        svg: [
          { line: null, x1: "5", y1: "12", x2: "19", y2: "12" },
          { polyline: null, points: "12,5 19,12 12,19" },
        ],
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        role: "img",
        ariaHidden: "true",
        style: { width: "100%", height: "100%" },
      } as DomphyElement<"svg">,
    ],
    dataShinyArrow: "true",
    ariaHidden: "true",
    style: {
      display: "inline-flex",
      width: themeSpacing(3),
      height: themeSpacing(3),
      flexShrink: 0,
      transition: "transform 200ms ease",
    },
  };
}

/**
 * Muted neutral text with a bright light-glare band continuously sweeping
 * across it — shimmering/metallic highlight effect, shown by default inside
 * a small rounded badge with a hover-nudging trailing arrow. Call with no
 * arguments for a working demo.
 */
function animatedShinyText(props: AnimatedShinyTextProps = {}): DomphyElement {
  const text = props.children ?? "Introducing Domphy Blocks";
  const shimmerWidth = props.shimmerWidth ?? 100;
  const duration = props.duration ?? 8000;
  const color = props.color ?? "neutral";
  const showBadge = props.showBadge ?? true;
  const icon = props.icon;

  const instanceId = ++animatedShinyTextInstanceCounter;
  // Band parked fully off the left / fully off the right, mirroring upstream's
  // `calc(-100% - var(--shiny-width))` / `calc(100% + var(--shiny-width))`.
  const parkLeft = `calc(-100% - ${shimmerWidth}px) 0`;
  const parkRight = `calc(100% + ${shimmerWidth}px) 0`;
  const keyframes = {
    "0%": { backgroundPosition: parkLeft },
    "30%": { backgroundPosition: parkRight },
    "60%": { backgroundPosition: parkRight },
    "90%": { backgroundPosition: parkLeft },
    "100%": { backgroundPosition: parkLeft },
  };
  const animationName = `animated-shiny-text-sweep-${hashString(
    JSON.stringify({ instanceId, duration, shimmerWidth }),
  )}`;

  // Muted, semi-transparent base text tone (theme/dark-mode aware). shift-9 is
  // the strongest text role, so a fractional mix reads as a faded label; the
  // sweeping band raises it toward full strength where it passes.
  const baseText = (listener: Listener, percent: number) =>
    `color-mix(in srgb, ${themeColor(listener, "shift-9", color)} ${percent}%, transparent)`;

  const shinySpan: DomphyElement<"span"> = {
    span: text,
    dataShinyText: "true",
    style: {
      color: (listener: Listener) => baseText(listener, 60),
      backgroundImage: (listener: Listener) => {
        const peak = themeColor(listener, "shift-9", color);
        return `linear-gradient(90deg, transparent 0%, ${peak} 50%, transparent 100%)`;
      },
      backgroundSize: `${shimmerWidth}px 100%`,
      backgroundPosition: parkLeft,
      backgroundRepeat: "no-repeat",
      backgroundClip: "text",
      WebkitBackgroundClip: "text",
      animation: `${animationName} ${duration}ms ease infinite`,
      [`@keyframes ${animationName}`]: keyframes,
    } as StyleObject,
  };

  if (!showBadge) return shinySpan;

  return {
    div: [...(icon ? [icon] : []), shinySpan, arrowGlyph()],
    dataTone: "shift-1",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: themeSpacing(2),
      paddingInline: themeSpacing(4),
      paddingBlock: themeSpacing(1),
      borderRadius: themeSpacing(20),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      outline: (listener: Listener) =>
        `1px solid ${themeColor(listener, "shift-3")}`,
      outlineOffset: "-1px",
      transition: "background-color 200ms ease",
      "&:hover": {
        cursor: "pointer",
        backgroundColor: (listener: Listener) =>
          themeColor(listener, "shift-2"),
      },
      // Solidify the shiny text on badge hover (upstream demo:
      // hover:text-neutral-600 dark:hover:text-neutral-400).
      "&:hover [data-shiny-text]": {
        color: (listener: Listener) => baseText(listener, 100),
      },
      "&:hover [data-shiny-arrow]": {
        transform: `translateX(${themeSpacing(0.5)})`,
      },
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { animatedShinyText };
