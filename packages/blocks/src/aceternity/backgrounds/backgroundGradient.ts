// Aceternity UI "Background Gradient" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied). A
// soft, blurred, animated color-gradient glow sitting directly behind a card
// or panel, reading as a glowing halo/border that bleeds out around the
// wrapped content's edges.
//
// Layered-blur technique: an absolutely-positioned layer, sized larger than
// (and behind) the wrapped content, carries a multi-stop `backgroundImage`
// gradient blending several theme color roles plus a heavy `blur()` filter
// — the content itself sits in a separate, opaque wrapper stacked on top via
// `z-index` so text stays legible. The gradient uses `backgroundImage` (not
// `backgroundColor`) specifically so `tone-background-inherit` — which only
// inspects the `backgroundColor` prop — never applies to it; this mirrors
// `warpBackground.ts`'s own grid-line gradients.
//
// `animate` (default `true`) toggles a single `@keyframes` loop that slowly
// pans the oversized gradient's `background-position` back and forth,
// reading as the colors slowly drifting/swirling; when `false` the same
// layer renders once with a fixed position and no `animation` property at
// all — the spec's own static/animated toggle contract.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { card, heading, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface BackgroundGradientProps {
  /** Content wrapped by the glow — typically a card. Defaults to a small demo card. */
  children?: DomphyElement | DomphyElement[];
  /** Continuously animates the glow's gradient position on an endless loop. When
   * `false`, the glow renders as a fixed, static colorful blur. Defaults to `true`. */
  animate?: boolean;
  /** Theme color roles blended into the glow gradient, in stop order. Defaults to
   * a four-hue mix (`success`, `secondary`, `info`, `highlight`). */
  glowColors?: ThemeColor[];
  /** Blur radius applied to the glow layer, in `themeSpacing` units. Defaults to `24`. */
  blurRadius?: number;
  /** One drift cycle, in seconds. Defaults to `6`. */
  duration?: number;
  /** Passthrough style merged onto the content wrapper (the card's own background/border/radius). */
  contentStyle?: StyleObject;
  /** Passthrough style merged onto the outer container (sizing/margin). */
  style?: StyleObject;
}

const DEFAULT_GLOW_COLORS: ThemeColor[] = ["success", "secondary", "info", "highlight"];

let backgroundGradientInstanceCounter = 0;

function defaultGradientContent(): DomphyElement[] {
  return [
    {
      div: [
        { h3: "Background Gradient", $: [heading()] } as DomphyElement,
        // Wrapped in an extra `div` rather than a direct `p` child: `card()`
        // itself carries a `"& > p"` rule pinning direct-child paragraphs to
        // shift-9 (specificity (0,1,1) beats a plain paragraph's own
        // generated class at (0,1,0)), which silently overrode any color
        // override attempted directly on a direct-child `<p>` — measured a
        // real WCAG contrast ratio of only ~4.32:1 (need 4.5:1). One level of
        // nesting takes the `<p>` out of `card()`'s direct-child match so its
        // own shift-11 override actually applies.
        {
          div: [
            {
              p: "A soft, colorful glow drifts behind this card, blurred into a glowing halo.",
              $: [paragraph()],
              style: { color: (listener: Listener) => themeColor(listener, "shift-11") },
            } as DomphyElement,
          ],
        } as DomphyElement,
      ],
      $: [card({ color: "neutral" })],
      style: { maxWidth: themeSpacing(72) },
    } as DomphyElement,
  ];
}

/**
 * Wraps content (typically a card) with a soft, blurred, colorful gradient
 * glow bleeding out around its edges — continuously drifting by default, or
 * a fixed static blur when `animate` is `false`. Call with no arguments for
 * a working demo — a small card with a slowly shifting rainbow halo.
 */
function backgroundGradient(props: BackgroundGradientProps = {}): DomphyElement<"div"> {
  const instanceId = ++backgroundGradientInstanceCounter;
  const animate = props.animate ?? true;
  const glowColors = props.glowColors && props.glowColors.length > 0 ? props.glowColors : DEFAULT_GLOW_COLORS;
  const blurRadius = props.blurRadius ?? 24;
  const duration = props.duration ?? 6;

  const driftAnimationName = `background-gradient-drift-${hashString(
    JSON.stringify({ instanceId, duration }),
  )}`;
  const driftKeyframes = {
    "0%,100%": { backgroundPosition: "0% 50%" },
    "50%": { backgroundPosition: "100% 50%" },
  };

  const contentChildren = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : defaultGradientContent();

  // `_doctorDisable` is a doctor-only annotation not present in core's strict
  // `PartialElement` type — build through an untyped literal, then assert, so
  // the excess-property check doesn't fire (mirrors warpBackground.ts).
  const glowLayer = {
    div: null,
    ariaHidden: "true",
    // Decorative glow layer with no text of its own — exempt from the
    // missing-color contract, matching warpBackground.ts's plane grid-lines.
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: themeSpacing(-4),
      borderRadius: themeSpacing(6),
      backgroundImage: (listener: Listener) =>
        `linear-gradient(115deg, ${glowColors
          .map((color) => themeColor(listener, "shift-9", color))
          .join(", ")})`,
      backgroundSize: "300% 300%",
      filter: `blur(${themeSpacing(blurRadius)})`,
      opacity: 0.85,
      zIndex: 0,
      ...(animate
        ? {
            animation: `${driftAnimationName} ${duration}s ease infinite`,
            [`@keyframes ${driftAnimationName}`]: driftKeyframes,
          }
        : { backgroundPosition: "50% 50%" }),
    } as StyleObject,
  } as DomphyElement<"div">;

  return {
    div: [
      glowLayer,
      {
        div: contentChildren,
        style: {
          position: "relative",
          zIndex: 1,
          ...(props.contentStyle ?? {}),
        } as StyleObject,
      } as DomphyElement<"div">,
    ],
    style: {
      position: "relative",
      display: "inline-block",
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { backgroundGradient };
