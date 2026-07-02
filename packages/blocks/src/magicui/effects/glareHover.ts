// Magic UI "Glare Hover" — clean-room reimplementation.
//
// A wrapper that adds a soft diagonal light-streak sweeping across its child
// content on pointer-hover, mimicking a glare/reflection passing over a
// glossy surface. Implemented purely from the block's public
// functional/visual spec — no upstream Magic UI source was viewed or copied.
//
// The upstream spec asks for a literal hex/CSS glare color, but Domphy's
// doctor rules forbid raw hex/rgb colors on style props — so the color is
// expressed as a `ThemeColor` family instead, and the streak's alpha is
// applied with `color-mix()` (a CSS function, not a raw color literal) rather
// than converting a hex string to `rgba()`. This keeps the effect fully
// theme-aware (it now follows light/dark theme swaps) at the cost of not
// accepting an arbitrary caller-supplied hex value.

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface GlareHoverProps {
  /** Content wrapped by the glare surface. Defaults to a small demo panel. */
  children?: DomphyElement | DomphyElement[];
  /** Theme color family for the streak. Defaults to `"neutral"` (a bright/white-reading sweep). */
  glareColor?: ThemeColor;
  /** Streak alpha, 0–1. Defaults to `0.35`. */
  glareOpacity?: number;
  /** Sweep angle in degrees. Defaults to `-45`. */
  angle?: number;
  /** Streak band size, as a percentage of the container's own box. Defaults to `220`. */
  size?: number;
  /** Sweep duration in ms. Defaults to `650`. */
  duration?: number;
  /** When true, the sweep only ever plays on the first pointer-enter. Defaults to `false`. */
  playOnce?: boolean;
  /** Edge-anchor surface tone for the container background. Defaults to `"dark"`. */
  surface?: "light" | "dark";
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

let glareHoverInstanceCounter = 0;

/**
 * A wrapper that sweeps a soft diagonal light streak across its child content
 * on pointer-hover, mimicking a glare/reflection over a glossy surface. Call
 * with no arguments for a working demo — a dark panel that sweeps on hover.
 */
function glareHover(props: GlareHoverProps = {}): DomphyElement<"div"> {
  const instanceId = ++glareHoverInstanceCounter;
  const glareColor = props.glareColor ?? "neutral";
  const glareOpacity = props.glareOpacity ?? 0.35;
  const angle = props.angle ?? -45;
  const size = props.size ?? 220;
  const duration = props.duration ?? 650;
  const playOnce = props.playOnce ?? false;
  const surfaceTone = (props.surface ?? "dark") === "dark" ? "shift-15" : "shift-1";

  // The streak is a diagonal gradient band baked into `backgroundImage`, sized
  // larger than the box and swept via `backgroundPosition` — cheaper and
  // simpler than transforming/rotating a separate overlay element, and reads
  // identically as a soft light streak moving across the surface's diagonal.
  const keyframes = {
    from: { backgroundPosition: "-160% -160%" },
    to: { backgroundPosition: "160% 160%" },
  };
  const animationName = `glare-hover-sweep-${hashString(JSON.stringify({ keyframes, instanceId }))}`;

  const contentChildren: DomphyElement[] = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : [
        { h3: "Glare Hover", $: [heading()] } as DomphyElement,
        {
          p: "Hover to see the light sweep pass over this surface.",
          $: [paragraph()],
        } as DomphyElement,
      ];

  // `_doctorDisable` is a doctor-only annotation not present in core's strict
  // `PartialElement` type — build through an untyped literal, then assert, so
  // the excess-property check doesn't fire (mirrors fadeOverlay() in the
  // marquee block).
  const glareBand = {
    div: null,
    dataGlareBand: "true",
    ariaHidden: "true",
    // Decorative gradient streak with no text of its own — exempt from the
    // missing-color contract.
    _doctorDisable: "missing-color",
    _onMount: (node: ElementNode) => {
      if (!playOnce) return;
      const bandElement = node.domElement as HTMLElement;
      const containerElement = bandElement.parentElement;
      if (!containerElement) return;
      const onAnimationEnd = () => {
        containerElement.setAttribute("data-glare-armed", "false");
      };
      bandElement.addEventListener("animationend", onAnimationEnd);
      node.addHook("Remove", () => {
        bandElement.removeEventListener("animationend", onAnimationEnd);
      });
    },
    style: {
      position: "absolute",
      inset: 0,
      zIndex: 0,
      pointerEvents: "none",
      // shift-11 (not a small shift-1) so the streak reads as a bright
      // highlight against the container's own surface tone — a small shift
      // only nudges a couple of ramp steps toward the opposite edge and
      // would barely be distinguishable from the surrounding background.
      backgroundImage: (listener) =>
        `linear-gradient(${angle}deg, transparent 35%, color-mix(in srgb, ${themeColor(listener, "shift-11", glareColor)} ${Math.round(glareOpacity * 100)}%, transparent) 50%, transparent 65%)`,
      backgroundSize: `${size}% ${size}%`,
      backgroundRepeat: "no-repeat",
      backgroundPosition: "-160% -160%",
    } as StyleObject,
  } as DomphyElement<"div">;

  return {
    div: [
      { div: contentChildren, style: { position: "relative", zIndex: 1 } },
      glareBand,
    ],
    // Armed by default; playOnce disarms it (via the band's animationend
    // handler above) after the first sweep finishes.
    dataGlareArmed: "true",
    dataTone: surfaceTone,
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      padding: themeSpacing(6),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-9"),
      "&[data-glare-armed=true]:hover [data-glare-band]": {
        animation: `${animationName} ${duration}ms linear forwards`,
      },
      [`@keyframes ${animationName}`]: keyframes,
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { glareHover };
