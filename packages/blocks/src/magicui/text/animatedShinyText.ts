// magicui "Animated Shiny Text" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied). A
// muted neutral text label with a bright light-glare band that continuously
// sweeps across it. The whole effect is a single `background-clip: text`
// gradient whose "resting" flanks are a semi-transparent muted gray (so the
// label always reads as plain neutral text) and whose middle stop is a
// brighter, more opaque tone — animating `background-position` across an
// oversized `background-size` sweeps that brighter point through the
// glyphs on a constant loop, purely via CSS keyframes (no JS per-frame
// work). Ships wrapped in the small rounded pill/badge the spec's demo
// shows it inside, with a trailing arrow glyph that nudges right on badge
// hover — a separate, non-looping hover interaction, independent of the
// shimmer's constant loop.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface AnimatedShinyTextProps {
  /** Label text. Defaults to `"Introducing Domphy Blocks"`. */
  children?: string;
  /** Pixel width of the bright sweeping band. Narrower reads as a sharp glint,
   * wider as a soft glow. Defaults to `100`. */
  shimmerWidth?: number;
  /** One full sweep loop, in ms. Defaults to `2500`. */
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
      width: themeSpacing(3.5),
      height: themeSpacing(3.5),
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
  const duration = props.duration ?? 2500;
  const color = props.color ?? "neutral";
  const showBadge = props.showBadge ?? true;
  const icon = props.icon;

  const instanceId = ++animatedShinyTextInstanceCounter;
  const keyframes = {
    from: { backgroundPosition: "-150% 0" },
    to: { backgroundPosition: "150% 0" },
  };
  const animationName = `animated-shiny-text-sweep-${hashString(
    JSON.stringify({ instanceId, duration, shimmerWidth }),
  )}`;

  const shinySpan: DomphyElement<"span"> = {
    span: text,
    style: {
      backgroundImage: (listener: Listener) => {
        const resting = `color-mix(in srgb, ${themeColor(listener, "shift-9", color)} 60%, transparent)`;
        const peak = themeColor(listener, "shift-1", "neutral");
        return `linear-gradient(90deg, ${resting} 0%, ${resting} calc(50% - ${shimmerWidth}px), ${peak} 50%, ${resting} calc(50% + ${shimmerWidth}px), ${resting} 100%)`;
      },
      backgroundSize: "200% 100%",
      backgroundRepeat: "no-repeat",
      backgroundClip: "text",
      WebkitBackgroundClip: "text",
      color: "transparent",
      animation: `${animationName} ${duration}ms linear infinite`,
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
      paddingBlock: themeSpacing(2),
      borderRadius: themeSpacing(20),
      cursor: "default",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      outline: (listener: Listener) =>
        `1px solid ${themeColor(listener, "shift-3")}`,
      outlineOffset: "-1px",
      transition: "background-color 200ms ease",
      "&:hover": {
        backgroundColor: (listener: Listener) =>
          themeColor(listener, "shift-2"),
      },
      "&:hover [data-shiny-arrow]": {
        transform: `translateX(${themeSpacing(1)})`,
      },
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { animatedShinyText };
