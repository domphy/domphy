// Aceternity UI "SVG Mask Effect" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied).
// Two stacked versions of the same content — a muted base layer and a vivid
// revealed layer beneath it — where the pointer acts like a spotlight
// cutout: only a small circular window into the vivid layer is visible,
// following the cursor with no perceptible lag, and growing on hover.
//
// The reveal window is a CSS `mask-image: radial-gradient(...)` (with the
// `-webkit-` prefix for Safari) on the vivid layer, referencing three CSS
// custom properties (`--reveal-x`/`--reveal-y`/`--reveal-radius`) set on the
// container. Pointer position is written straight to `--reveal-x`/`-y` on
// every `pointermove` — an imperative DOM write, not reactive state, so the
// window tracks the cursor with zero frame lag (the same tradeoff
// `magicCard.ts` makes for its own cursor-following glow). The radius,
// however, eases toward a resting or hover target via a small
// `requestAnimationFrame` loop that only runs while the current value hasn't
// converged yet — the "settled" idiom `smoothCursor.ts` already uses in this
// package — rather than driving it through WAAPI/`motion()`, since this is a
// continuously-retargeted single number, not a fixed from/to keyframe pair.

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";
import { themeColor, themeSpacing } from "@domphy/theme";

export interface SvgMaskEffectProps {
  /** Content for the muted base layer (always fully visible). Defaults to a small demo blurb. */
  baseContent?: DomphyElement | DomphyElement[];
  /** Content for the vivid layer, only visible through the circular reveal window. Defaults to a colorful demo blurb. */
  revealContent?: DomphyElement | DomphyElement[];
  /** Resting reveal-circle diameter, in px. Defaults to `80`. */
  restingSize?: number;
  /** Reveal-circle diameter while hovered, in px. Defaults to `400`. */
  hoverSize?: number;
  /** Per-frame easing factor (0–1, higher = snappier) for the radius tween. Defaults to `0.18`. */
  easeSpeed?: number;
  style?: StyleObject;
}

function defaultBaseContent(): DomphyElement[] {
  return [
    { h2: "Move your cursor", $: [heading({ color: "neutral" })] } as DomphyElement,
    {
      p: "A hidden, more colorful layer is revealed through a small window that follows your pointer.",
      $: [paragraph({ color: "neutral" })],
    } as DomphyElement,
  ];
}

function defaultRevealContent(): DomphyElement[] {
  return [
    { h2: "There it is", $: [heading({ color: "primary" })] } as DomphyElement,
    {
      p: "A hidden, more colorful layer is revealed through a small window that follows your pointer.",
      $: [paragraph({ color: "info" })],
    } as DomphyElement,
  ];
}

/**
 * Two stacked content layers — a muted base and a vivid alternate hidden
 * beneath it — where the pointer acts as a spotlight cutout revealing a
 * circular patch of the vivid layer, growing on hover. Call with no
 * arguments for a working demo.
 */
function svgMaskEffect(props: SvgMaskEffectProps = {}): DomphyElement<"div"> {
  const restingSize = Math.max(1, props.restingSize ?? 80);
  const hoverSize = Math.max(restingSize, props.hoverSize ?? 400);
  const easeSpeed = Math.min(1, Math.max(0.01, props.easeSpeed ?? 0.18));

  const baseChildren = props.baseContent
    ? Array.isArray(props.baseContent)
      ? props.baseContent
      : [props.baseContent]
    : defaultBaseContent();
  const revealChildren = props.revealContent
    ? Array.isArray(props.revealContent)
      ? props.revealContent
      : [props.revealContent]
    : defaultRevealContent();

  const layerLayout: StyleObject = {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: themeSpacing(8),
  } as StyleObject;

  const baseLayer: DomphyElement<"div"> = {
    div: baseChildren,
    style: layerLayout,
  };

  const revealMaskImage =
    "radial-gradient(circle var(--reveal-radius, 40px) at var(--reveal-x, 50%) var(--reveal-y, 50%), black 99%, transparent 100%)";

  // `_doctorDisable` is a doctor-only annotation not present in core's strict
  // `PartialElement` type — build through an untyped literal, then assert, so
  // the excess-property check doesn't fire (mirrors particles.ts).
  const revealLayer = {
    div: [
      {
        div: revealChildren,
        dataTone: "shift-1",
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: themeSpacing(8),
          width: "100%",
          height: "100%",
          backgroundColor: (listener) => themeColor(listener, "inherit", "primary"),
          color: (listener) => themeColor(listener, "shift-11", "primary"),
        } as StyleObject,
      } as DomphyElement,
    ],
    // The doctor's `missing-color` heuristic treats any style value
    // containing the substring `var(` as a themeColor() token and expects a
    // matching `color`; `maskImage`/`WebkitMaskImage` here reference plain
    // CSS custom properties (`--reveal-x`/`-y`/`-radius`, written imperatively
    // in `_onMount` below) that happen to also use `var(...)` syntax but
    // carry no color/theme meaning at all — a false positive.
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: 0,
      maskImage: revealMaskImage,
      WebkitMaskImage: revealMaskImage,
      maskRepeat: "no-repeat",
      WebkitMaskRepeat: "no-repeat",
    } as StyleObject,
  } as DomphyElement<"div">;

  return {
    div: [baseLayer, revealLayer],
    dataTone: "shift-16",
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      minHeight: themeSpacing(72),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-9"),
      cursor: "default",
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      const hostElement = node.domElement as HTMLElement | null;
      if (!hostElement || typeof window === "undefined") return;

      let currentRadius = restingSize / 2;
      let targetRadius = restingSize / 2;
      let animationFrameId: number | null = null;

      hostElement.style.setProperty("--reveal-x", "50%");
      hostElement.style.setProperty("--reveal-y", "50%");
      hostElement.style.setProperty("--reveal-radius", `${currentRadius}px`);

      const tick = () => {
        currentRadius += (targetRadius - currentRadius) * easeSpeed;
        hostElement.style.setProperty("--reveal-radius", `${currentRadius.toFixed(1)}px`);
        animationFrameId =
          Math.abs(targetRadius - currentRadius) < 0.5 ? null : window.requestAnimationFrame(tick);
      };
      const ensureLoopRunning = () => {
        if (animationFrameId === null) animationFrameId = window.requestAnimationFrame(tick);
      };

      const handlePointerMove = (event: PointerEvent) => {
        const rect = hostElement.getBoundingClientRect();
        hostElement.style.setProperty("--reveal-x", `${event.clientX - rect.left}px`);
        hostElement.style.setProperty("--reveal-y", `${event.clientY - rect.top}px`);
      };
      const handlePointerEnter = () => {
        targetRadius = hoverSize / 2;
        ensureLoopRunning();
      };
      const handlePointerLeave = () => {
        targetRadius = restingSize / 2;
        ensureLoopRunning();
      };

      hostElement.addEventListener("pointermove", handlePointerMove);
      hostElement.addEventListener("pointerenter", handlePointerEnter);
      hostElement.addEventListener("pointerleave", handlePointerLeave);

      node.addHook("Remove", () => {
        if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
        hostElement.removeEventListener("pointermove", handlePointerMove);
        hostElement.removeEventListener("pointerenter", handlePointerEnter);
        hostElement.removeEventListener("pointerleave", handlePointerLeave);
      });
    },
  };
}

export { svgMaskEffect };
