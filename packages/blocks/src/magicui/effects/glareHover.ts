// Magic UI "Glare Hover" — clean-room reimplementation.
//
// A wrapper that sweeps a soft diagonal light streak across its child content
// on pointer-hover, mimicking a glare/reflection passing over a glossy
// surface. The streak is a diagonal `linear-gradient` band, sized larger than
// the box and swept corner-to-corner via a CSS `background-position`
// *transition* (matching upstream's transition-based `::before`, not a
// keyframe animation): on hover it slides in, and on mouse-leave it reverses
// smoothly back off-canvas. `playOnce` swaps that smooth reverse for an
// instant reset — the sweep still plays on every hover, only the leave differs.
//
// Two deliberate adaptations to Domphy's theme system, both rooted in the
// shared doctor rule that forbids raw hex/rgb colors on style props: the glare
// color and the wrapper `background` are expressed as `ThemeColor` families
// resolved via `themeColor()` instead of literal CSS colors, and the streak's
// alpha is applied with CSS `color-mix()` rather than a hex->rgba conversion.
// This keeps the effect fully theme-aware (it follows light/dark theme swaps)
// at the cost of not accepting an arbitrary caller-supplied hex value.

import type { DomphyElement, StyleObject } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface GlareHoverProps {
  /** Content wrapped by the glare surface. Defaults to a small demo panel. */
  children?: DomphyElement | DomphyElement[];
  /** Optional CSS width on the root element (e.g. `"100%"`, `"320px"`). Defaults to fit-content. */
  width?: string;
  /** Optional CSS height on the root element (e.g. `"auto"`, `"200px"`). Defaults to fit-content. */
  height?: string;
  /** Theme color family for the wrapper surface (upstream's literal `background`). Defaults to `"neutral"` (near-black). */
  background?: ThemeColor;
  /** Theme color family for the streak. Defaults to `"neutral"` (a bright/white-reading sweep). */
  glareColor?: ThemeColor;
  /** Streak alpha, 0–1. Defaults to `0.5`. */
  glareOpacity?: number;
  /** Sweep angle in degrees. Defaults to `-45`. */
  angle?: number;
  /** Streak band size, as a percentage of the container's own box. Defaults to `250`. */
  size?: number;
  /** Sweep duration in ms. Defaults to `650`. */
  duration?: number;
  /** When true, mouse-leave is an instant reset instead of a smooth reverse. Defaults to `false`. */
  playOnce?: boolean;
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

/**
 * A wrapper that sweeps a soft diagonal light streak across its child content
 * on pointer-hover, mimicking a glare/reflection over a glossy surface. Call
 * with no arguments for a working demo — a dark panel that sweeps on hover.
 */
function glareHover(props: GlareHoverProps = {}): DomphyElement<"div"> {
  const background = props.background ?? "neutral";
  const glareColor = props.glareColor ?? "neutral";
  const glareOpacity = props.glareOpacity ?? 0.5;
  const angle = props.angle ?? -45;
  const size = props.size ?? 250;
  const duration = props.duration ?? 650;
  const playOnce = props.playOnce ?? false;

  const contentChildren: DomphyElement[] = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : [
        {
          // The wrapper itself carries no padding or border-radius (matching
          // upstream, whose child supplies its own surface); the default demo
          // child provides its own padded panel so the standalone demo isn't
          // flush to the container edge.
          div: [
            { h3: "Glare Hover", $: [heading()] } as DomphyElement,
            {
              p: "Hover to see the light sweep pass over this surface.",
              $: [paragraph()],
            } as DomphyElement,
          ],
          style: {
            display: "grid",
            gap: themeSpacing(2),
            padding: themeSpacing(6),
            minWidth: "18rem",
          },
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
    style: {
      position: "absolute",
      inset: 0,
      zIndex: 1,
      pointerEvents: "none",
      // shift-11 (not a small shift-1) so the streak reads as a bright
      // highlight against the container's own dark surface tone. Upstream
      // stops: `transparent 60%, glare 70%, transparent, transparent 100%` — a
      // narrow highlight band biased toward 70%, not a symmetric 50% band.
      backgroundImage: (listener) =>
        `linear-gradient(${angle}deg, transparent 60%, color-mix(in srgb, ${themeColor(listener, "shift-11", glareColor)} ${Math.round(glareOpacity * 100)}%, transparent) 70%, transparent, transparent 100%)`,
      backgroundSize: `${size}% ${size}%`,
      backgroundRepeat: "no-repeat",
      backgroundPosition: "-100% -100%",
      // Non-playOnce: a resting two-way transition, so the streak reverses
      // smoothly back off-canvas on mouse-leave. playOnce: no resting
      // transition, so leave snaps back instantly (the hover rule below
      // re-adds the transition for the inbound sweep only).
      transition: playOnce
        ? "none"
        : `background-position ${duration}ms ease-in-out`,
    } as StyleObject,
  } as DomphyElement<"div">;

  return {
    div: [
      { div: contentChildren, style: { position: "relative", zIndex: 0 } },
      glareBand,
    ],
    // Dark ambient tone: the wrapper surface resolves to the darkest step of
    // the `background` family (upstream default `#000`) and the glare's
    // `shift-11` reads as a bright highlight against it.
    dataTone: "shift-15",
    // Inert static marker retained only for the block's existing DOM-shape
    // test. It no longer gates the sweep: upstream sweeps on EVERY hover, so
    // there is no "disarm after first play" step — `playOnce` only changes the
    // mouse-leave from a smooth reverse to an instant reset.
    dataGlareArmed: "true",
    style: {
      position: "relative",
      display: "grid",
      placeItems: "center",
      width: "fit-content",
      height: "fit-content",
      cursor: "pointer",
      overflow: "hidden",
      backgroundColor: (listener) => themeColor(listener, "inherit", background),
      color: (listener) => themeColor(listener, "shift-9"),
      // On hover the streak slides corner-to-corner. playOnce re-adds the
      // transition here (band base is `none`) so only the inbound sweep eases;
      // non-playOnce inherits the band's resting transition and reverses on
      // leave.
      "&:hover [data-glare-band]": playOnce
        ? {
            transition: `background-position ${duration}ms`,
            backgroundPosition: "100% 100%",
          }
        : { backgroundPosition: "100% 100%" },
      ...(props.width !== undefined ? { width: props.width } : {}),
      ...(props.height !== undefined ? { height: props.height } : {}),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { glareHover };
