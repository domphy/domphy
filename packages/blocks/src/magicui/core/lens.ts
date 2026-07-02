// magicui "Lens" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A
// magnifying-glass overlay: hovering (or, in static mode, an externally
// controlled coordinate) shows a small circular window with a zoomed-in copy
// of the same content, offset so the point under the cursor is centered.
//
// The magnified copy is produced with a plain `element.cloneNode(true)` of
// the already-rendered base content (done once, imperatively, in
// `_onMount`) rather than mounting a second Domphy tree from the same
// `children` element — a Domphy element object is bound to one DOM node, so
// the same object can't be rendered twice in one tree. Cloning the resulting
// DOM subtree works for arbitrary content (image, nested markup, …), matching
// the spec's "image or arbitrary element" scope, without double-binding.
//
// Coordinate math (content-space point (x, y), lens radius r, zoom z):
// the zoom layer is scaled by `z` about its own (0,0) origin, then translated
// by `(r - x*z, r - y*z)` so the scaled point lands exactly on the lens
// overlay's center — the "translate by -(cursor*zoom - radius)" idea from the
// spec's research note.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { effect, toState, type ValueOrState } from "@domphy/core";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface LensPosition {
  x: number;
  y: number;
}

export interface LensProps {
  /** Content to magnify — image or arbitrary element. Defaults to a generic placeholder image. */
  children?: DomphyElement;
  /** Magnification multiplier. Defaults to 1.3. */
  zoomFactor?: number;
  /** Circular lens diameter, in `themeSpacing` units (≈170px at the default). Defaults to 42.5. */
  lensSizeUnits?: number;
  /** Pins the lens at `position` instead of following the pointer (useful for click-to-reveal, touch,
   * or fully programmatic control). Defaults to false. */
  isStatic?: boolean;
  /** Coordinate (px, relative to the content's own top-left) used when `isStatic` is true. Accepts a
   * `State` for reactive/programmatic control. Defaults to a point near the top-left of the content. */
  position?: ValueOrState<LensPosition>;
  /** Tint/border color for the lens ring. Defaults to `"primary"`. */
  lensColor?: ThemeColor;
  ariaLabel?: string;
  /** Seconds — smoothing speed for lens movement/opacity transitions. Defaults to 0.1. */
  duration?: number;
  style?: StyleObject;
}

const DEFAULT_ZOOM_FACTOR = 1.3;
const DEFAULT_LENS_SIZE_UNITS = 42.5; // themeSpacing(42.5) = 10.625em ≈ 170px at the base font size.
const DEFAULT_DURATION = 0.1;
const DEFAULT_STATIC_POSITION: LensPosition = { x: 110, y: 90 };

/** Default magnifiable content — a generic inline SVG placeholder photo (no network fetch). */
function defaultLensContent(): DomphyElement<"img"> {
  const markup =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220">' +
    '<rect width="320" height="220" fill="#d7dbe0"/>' +
    '<circle cx="250" cy="55" r="28" fill="#eef1f4"/>' +
    '<polygon points="0,220 110,110 170,170 230,90 320,220" fill="#aab1ba"/>' +
    "</svg>";
  return {
    img: null,
    src: `data:image/svg+xml,${encodeURIComponent(markup)}`,
    alt: "Placeholder photo",
    style: { display: "block", width: "100%", height: "auto", maxWidth: themeSpacing(90) },
  } as DomphyElement<"img">;
}

/**
 * A magnifying-glass hover overlay: shows a circular, zoomed-in copy of the
 * wrapped content centered on the cursor (or, in static mode, on an
 * externally controlled coordinate). Call with no arguments for a working
 * demo — a placeholder image with a 1.3x follow-cursor lens.
 */
function lens(props: LensProps = {}): DomphyElement<"div"> {
  const content = props.children ?? defaultLensContent();
  const zoomFactor = props.zoomFactor ?? DEFAULT_ZOOM_FACTOR;
  const lensSizeUnits = props.lensSizeUnits ?? DEFAULT_LENS_SIZE_UNITS;
  const isStatic = props.isStatic ?? false;
  const positionState = toState(props.position ?? DEFAULT_STATIC_POSITION);
  const lensColor = props.lensColor ?? "primary";
  const duration = props.duration ?? DEFAULT_DURATION;

  const baseContentElement: DomphyElement = {
    div: [content],
    dataLensContent: "true",
    style: { position: "relative", display: "block" },
  } as DomphyElement;

  // `_onMount` lives on this node (the deepest, last-rendered leaf in the
  // tree) rather than on the outer wrapper: a parent's `_onMount` fires
  // before its children are attached to the DOM (see ElementNode.render —
  // Mount fires, then children render), so querying for `[data-lens-content]`
  // from the wrapper's own `_onMount` would find nothing yet. By the time
  // THIS node mounts, everything earlier in render order — the wrapper, the
  // base content, and the overlay — is already live. Mirrors pointer.ts's
  // cursorElement placement.
  const zoomLayerElement: DomphyElement<"div"> = {
    div: [],
    dataLensZoomLayer: "true",
    ariaHidden: "true",
    style: { position: "absolute", insetBlockStart: 0, insetInlineStart: 0 },
    _onMount: (node: ElementNode) => {
      const zoomLayer = node.domElement as HTMLElement | null;
      const overlay = zoomLayer?.parentElement ?? null;
      const wrapper = overlay?.parentElement ?? null;
      if (!zoomLayer || !overlay || !wrapper || typeof window === "undefined") return;
      const baseContent = wrapper.querySelector('[data-lens-content="true"]') as HTMLElement | null;
      if (!baseContent) return;

      // Duplicate the already-rendered base content once for the magnified layer.
      const clone = baseContent.cloneNode(true) as HTMLElement;
      clone.removeAttribute("data-lens-content");
      zoomLayer.appendChild(clone);

      let lensRadius = overlay.offsetWidth / 2;

      const syncSizes = () => {
        lensRadius = overlay.offsetWidth / 2;
        const rect = baseContent.getBoundingClientRect();
        zoomLayer.style.width = `${rect.width}px`;
        zoomLayer.style.height = `${rect.height}px`;
      };
      syncSizes();

      const applyLensPosition = (x: number, y: number) => {
        overlay.style.transform = `translate(${x - lensRadius}px, ${y - lensRadius}px)`;
        zoomLayer.style.transformOrigin = "0 0";
        zoomLayer.style.transform =
          `translate(${lensRadius - x * zoomFactor}px, ${lensRadius - y * zoomFactor}px) ` +
          `scale(${zoomFactor})`;
      };

      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => syncSizes());
        resizeObserver.observe(baseContent);
      }

      let disposeEffect: (() => void) | null = null;
      let handleMove: ((event: MouseEvent) => void) | null = null;
      let handleEnter: ((event: MouseEvent) => void) | null = null;
      let handleLeave: (() => void) | null = null;

      if (isStatic) {
        // Reactive, declarative-style control: re-applies whenever the caller
        // updates a `State<LensPosition>` passed as `props.position`.
        disposeEffect = effect(() => {
          const position = positionState.get();
          applyLensPosition(position.x, position.y);
        });
      } else {
        // High-frequency pointer tracking is imperative (direct DOM writes),
        // matching the same tradeoff `pointer.ts`/`dock.ts` make for
        // continuous, purely visual cursor-following effects.
        handleMove = (event: MouseEvent) => {
          const rect = baseContent.getBoundingClientRect();
          applyLensPosition(event.clientX - rect.left, event.clientY - rect.top);
        };
        handleEnter = (event: MouseEvent) => {
          handleMove?.(event);
          overlay.style.opacity = "1";
        };
        handleLeave = () => {
          overlay.style.opacity = "0";
        };
        wrapper.addEventListener("mousemove", handleMove);
        wrapper.addEventListener("mouseenter", handleEnter);
        wrapper.addEventListener("mouseleave", handleLeave);
      }

      node.addHook("Remove", () => {
        disposeEffect?.();
        resizeObserver?.disconnect();
        if (handleMove) wrapper.removeEventListener("mousemove", handleMove);
        if (handleEnter) wrapper.removeEventListener("mouseenter", handleEnter);
        if (handleLeave) wrapper.removeEventListener("mouseleave", handleLeave);
      });
    },
  };

  // `_doctorDisable` is a doctor-only annotation not present in core's strict
  // `PartialElement` type — build through an untyped literal, then assert, so
  // the excess-property check doesn't fire (mirrors dock.ts's separator()).
  // This overlay is a decorative, aria-hidden magnified duplicate with no
  // text of its own, so it is exempt from the missing-color contract.
  const overlayElement = {
    div: [zoomLayerElement],
    dataLensOverlay: "true",
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      insetBlockStart: 0,
      insetInlineStart: 0,
      width: themeSpacing(lensSizeUnits),
      height: themeSpacing(lensSizeUnits),
      borderRadius: "50%",
      overflow: "hidden",
      pointerEvents: "none",
      zIndex: 10,
      opacity: isStatic ? 1 : 0,
      transform: "translate(-9999px, -9999px)",
      outline: (listener: Listener) => `${themeSpacing(1)} solid ${themeColor(listener, "shift-9", lensColor)}`,
      outlineOffset: "-1px",
      boxShadow: (listener: Listener) =>
        `0 ${themeSpacing(2)} ${themeSpacing(8)} ${themeColor(listener, "shift-4")}`,
      transition: `transform ${duration}s ease-out, opacity ${Math.max(duration * 1.5, 0.05)}s ease-out`,
      willChange: "transform, opacity",
    } as StyleObject,
  } as DomphyElement<"div">;

  return {
    div: [baseContentElement, overlayElement],
    ariaLabel: props.ariaLabel,
    style: {
      position: "relative",
      display: "inline-block",
      ...(props.style ?? {}),
    },
  };
}

export { lens };
