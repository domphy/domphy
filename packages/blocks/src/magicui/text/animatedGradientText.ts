// magicui "Animated Gradient Text" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied).
// Text filled with a gradient that pans continuously and loops via animated
// `background-position` over an oversized, repeating `background-size` and
// `background-clip: text`. Upstream's gradient is a symmetric two-color
// `from -> to -> from` sweep (default orange <-> purple), so the whole word
// reads as a slow oscillation between the two hues rather than a rainbow.
// `speed` scales BOTH the background-size and the per-cycle travel distance
// (`speed * 300%`) over a fixed 8s loop — exactly upstream's `--bg-size`
// technique — so higher speed pans faster without changing the loop period.
//
// By default the text is wrapped in the small pill the upstream *demo*
// (`animated-gradient-text-demo.tsx`) shows it inside: a leading `🎉`, a thin
// vertical divider, the flowing gradient label, and a trailing chevron that
// nudges right on hover, all inside a rounded badge with an inset glow that
// deepens on hover and a 1px animated gradient border (at 50% opacity, per the
// demo). Pass `showPill: false` for the bare inline `<span>` that matches the
// upstream *component* exactly.
//
// The upstream default colors are literal hex (`#ffaa40` orange, `#9c40ff`
// purple) — Domphy's doctor rules forbid raw hex/rgb colors on style props and
// this theme ships no dedicated purple family, so `colorFrom`/`colorTo` are
// exposed as `ThemeColor` roles instead, defaulting to `"warning"` (orange)
// and `"secondary"` (this theme's rose/magenta family, the closest built-in
// role to "vivid purple"), which keeps the flow fully theme-aware (it follows
// light/dark swaps) at the cost of not accepting an arbitrary caller hex pair.
// Same tradeoff `glareHover` documents for its own literal-color prop. The
// demo's `#8fdfff` inset glow is likewise approximated with a near-white
// neutral tint via `color-mix`, the same substitution `shimmerButton` already
// makes for that identical shadow value.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface AnimatedGradientTextProps {
  /** Text content. Defaults to `"Animated Gradient Text"`. */
  children?: string;
  /** Pan speed multiplier — scales per-cycle travel over a fixed 8s loop, so
   * higher plays faster. Defaults to `1`. */
  speed?: number;
  /** First/last gradient stop's theme color family (the sweep is symmetric
   * `from -> to -> from`). Defaults to `"warning"` (orange). */
  colorFrom?: ThemeColor;
  /** Middle gradient stop's theme color family. Defaults to `"secondary"`
   * (this theme's closest role to purple). */
  colorTo?: ThemeColor;
  /** Wraps the text in the badge the upstream demo shows (leading emoji,
   * divider, flowing label, hover-nudging chevron, animated gradient border).
   * Pass `false` for the bare inline gradient span. Defaults to `true`. */
  showPill?: boolean;
  style?: StyleObject;
}

let animatedGradientTextInstanceCounter = 0;

/** Lucide `ChevronRight`, hand-authored (matches `animatedShinyText`'s glyph
 * approach), that nudges right when its parent badge is hovered. */
function chevronGlyph(): DomphyElement<"span"> {
  return {
    span: [
      {
        svg: [{ polyline: null, points: "9,18 15,12 9,6" }],
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
    dataGradientChevron: "true",
    ariaHidden: "true",
    style: {
      display: "inline-flex",
      width: themeSpacing(4),
      height: themeSpacing(4),
      marginInlineStart: themeSpacing(1),
      flexShrink: 0,
      color: (listener: Listener) => themeColor(listener, "shift-5", "neutral"),
      transition: "transform 300ms ease-in-out",
    },
  };
}

/**
 * Text filled with a continuously flowing two-color gradient that slides
 * horizontally in an endless loop, wrapped by default in the badge the
 * upstream demo shows (leading emoji, divider, gradient label, hover-nudging
 * chevron, inset glow, animated gradient border). Call with no arguments for
 * a working demo.
 */
function animatedGradientText(
  props: AnimatedGradientTextProps = {},
): DomphyElement {
  const text = props.children ?? "Animated Gradient Text";
  const speed = props.speed ?? 1;
  const colorFrom = props.colorFrom ?? "warning";
  const colorTo = props.colorTo ?? "secondary";
  const showPill = props.showPill ?? true;

  const instanceId = ++animatedGradientTextInstanceCounter;
  // Upstream `--bg-size`: the gradient is `speed * 300%` wide and the pan
  // travels that same distance each cycle, over a fixed 8s loop.
  const backgroundWidth = `${speed * 300}%`;

  // Symmetric two-color sweep: from -> to -> from (no seam, tiles cleanly).
  const gradientStops = (listener: Listener): string => {
    const from = themeColor(listener, "shift-8", colorFrom);
    const to = themeColor(listener, "shift-8", colorTo);
    return `${from}, ${to}, ${from}`;
  };

  const textAnimationName = `animated-gradient-text-flow-${hashString(
    JSON.stringify({ instanceId, colorFrom, colorTo }),
  )}`;
  const textKeyframes = {
    from: { backgroundPosition: "0 0" },
    to: { backgroundPosition: `${backgroundWidth} 0` },
  };

  const gradientSpan: DomphyElement<"span"> = {
    span: text,
    style: {
      backgroundImage: (listener: Listener) =>
        `linear-gradient(90deg, ${gradientStops(listener)})`,
      backgroundSize: `${backgroundWidth} 100%`,
      backgroundRepeat: "repeat",
      backgroundClip: "text",
      WebkitBackgroundClip: "text",
      color: "transparent",
      animation: `${textAnimationName} 8s linear infinite`,
      [`@keyframes ${textAnimationName}`]: textKeyframes,
    } as StyleObject,
  };

  if (!showPill) {
    return {
      ...gradientSpan,
      style: {
        ...(gradientSpan.style as StyleObject),
        ...(props.style ?? {}),
      } as StyleObject,
    };
  }

  // Thin vertical divider (`<hr class="mx-2 h-4 w-px bg-neutral-500">`), drawn
  // as a border rather than a backgroundColor fill so it stays doctor-clean
  // (mirrors `dock.ts`'s `dockSeparator`).
  const divider = {
    div: null,
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    style: {
      height: themeSpacing(4),
      marginInline: themeSpacing(2),
      flexShrink: 0,
      borderInlineStart: (listener: Listener) =>
        `1px solid ${themeColor(listener, "shift-5", "neutral")}`,
    },
  } as DomphyElement<"div">;

  // Gradient border via the dual-background-layer trick (opaque padding-box
  // layer over an animated border-box gradient layer) — simpler and more
  // broadly supported than the demo's `mask-composite`, and it keeps the
  // gradient label as the badge's first `<span>`. The border gradient is at
  // 50% opacity, matching the demo's `/50` stops.
  const pillAnimationName = `animated-gradient-pill-flow-${hashString(
    JSON.stringify({ instanceId, colorFrom, colorTo, ring: true }),
  )}`;
  const pillKeyframes = {
    from: { backgroundPosition: `0 0, 0 0` },
    to: { backgroundPosition: `0 0, ${backgroundWidth} 0` },
  };

  return {
    div: ["🎉 ", divider, gradientSpan, chevronGlyph()],
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      paddingInline: themeSpacing(4),
      paddingBlock: themeSpacing(1.5),
      borderRadius: themeSpacing(20),
      border: "1px solid transparent",
      backgroundImage: (listener: Listener) =>
        `linear-gradient(${themeColor(listener, "inherit")}, ${themeColor(listener, "inherit")}), linear-gradient(90deg, color-mix(in srgb, ${themeColor(listener, "shift-8", colorFrom)} 50%, transparent), color-mix(in srgb, ${themeColor(listener, "shift-8", colorTo)} 50%, transparent), color-mix(in srgb, ${themeColor(listener, "shift-8", colorFrom)} 50%, transparent))`,
      backgroundOrigin: "border-box",
      backgroundClip: "padding-box, border-box",
      backgroundSize: `auto, ${backgroundWidth} 100%`,
      backgroundRepeat: "no-repeat, repeat",
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      boxShadow: (listener: Listener) =>
        `inset 0 -8px 10px color-mix(in srgb, ${themeColor(listener, "shift-0", "neutral")} 12%, transparent)`,
      transition: "box-shadow 500ms ease-out",
      animation: `${pillAnimationName} 8s linear infinite`,
      [`@keyframes ${pillAnimationName}`]: pillKeyframes,
      "&:hover": {
        boxShadow: (listener: Listener) =>
          `inset 0 -5px 10px color-mix(in srgb, ${themeColor(listener, "shift-0", "neutral")} 25%, transparent)`,
      },
      "&:hover [data-gradient-chevron]": {
        transform: `translateX(${themeSpacing(0.5)})`,
      },
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { animatedGradientText };
