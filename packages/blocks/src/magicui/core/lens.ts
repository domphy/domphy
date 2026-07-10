// magicui "Lens" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A
// magnifying-glass overlay: hovering (or, in static/default-position mode, an
// externally controlled or resting coordinate) shows a circular window with a
// zoomed-in copy of the same content, revealed solely through a radial-gradient
// mask (no border, outline, or shadow — the lens has no visible chrome of its
// own) and offset so the point under the cursor is centered.
//
// The magnified copy is produced with a plain `element.cloneNode(true)` of
// the already-rendered base content (done once, imperatively, in
// `_onMount`) rather than mounting a second Domphy tree from the same
// `children` element — a Domphy element object is bound to one DOM node, so
// the same object can't be rendered twice in one tree. Cloning the resulting
// DOM subtree works for arbitrary content (image, nested markup, …), matching
// the spec's "image or arbitrary element" scope, without double-binding.
//
// Element split, so position tracking and the mount scale/fade animation
// never fight over one `transform` (position must be instant on every
// mousemove; scale/opacity must ease over `duration`):
//   overlay      — circular window; carries the position `translate(...)`
//                  (instant, untransitioned) plus `opacity` (eased).
//   scaleWrapper — clips the zoom layer, carries the radial-gradient mask and
//                  the mount `scale(...)` (eased). Its box is centered on the
//                  cursor, so scaling about its own center matches upstream's
//                  "scale about the cursor point" origin.
//   zoomLayer    — the cloned content, `scale(zoomFactor)` translated by
//                  `(r - x*z, r - y*z)` so the scaled content point (x, y)
//                  lands on the window's center.

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import { effect, toState, type ValueOrState } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";

export interface LensPosition {
  x: number;
  y: number;
}

export interface LensProps {
  /** Content to magnify — image or arbitrary element. Defaults to a generic placeholder image. */
  children?: DomphyElement;
  /** Magnification multiplier (must be ≥ 1). Defaults to 1.3. */
  zoomFactor?: number;
  /** Circular lens diameter, in `themeSpacing` units (≈170px at the default). Defaults to 42.5. */
  lensSizeUnits?: number;
  /** Pins the lens at `position` instead of following the pointer (useful for click-to-reveal, touch,
   * or fully programmatic control). Defaults to false. */
  isStatic?: boolean;
  /** Coordinate (px, relative to the content's own top-left) used when `isStatic` is true. Accepts a
   * `State` for reactive/programmatic control. Defaults to `{ x: 0, y: 0 }`. */
  position?: ValueOrState<LensPosition>;
  /** When provided (and not static), keeps the lens always visible: resting at this coordinate while
   * not hovering and following the cursor while hovering. */
  defaultPosition?: LensPosition;
  /** CSS color used only as the radial-gradient mask fill. The mask reveals via its alpha, so the
   * color itself is visually inert — any opaque value works. Defaults to `"black"`. */
  lensColor?: string;
  ariaLabel?: string;
  /** Seconds — the mount scale/opacity transition speed. Does not slow cursor tracking, which is
   * always instant. Defaults to 0.1. */
  duration?: number;
  style?: StyleObject;
}

const DEFAULT_ZOOM_FACTOR = 1.3;
const DEFAULT_LENS_SIZE_UNITS = 42.5; // themeSpacing(42.5) = 10.625em ≈ 170px at the base font size.
const DEFAULT_DURATION = 0.1;
const DEFAULT_POSITION: LensPosition = { x: 0, y: 0 };
const DEFAULT_LENS_COLOR = "black";
const DEFAULT_ARIA_LABEL = "Zoom Area";
const ENTER_SCALE = "scale(1)";
const INITIAL_SCALE = "scale(0.58)";
const EXIT_SCALE = "scale(0.8)";

/** Default magnifiable content — a generic inline SVG placeholder photo (no network fetch).
 * Deliberately an abstract gradient-and-bokeh composition rather than the familiar
 * "rectangle + sun circle + mountain silhouette" glyph most browsers/icon sets use for
 * a *missing* image — that shape would read as a broken image instead of a placeholder one. */
function defaultLensContent(): DomphyElement<"img"> {
  const markup =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220">' +
    '<defs><linearGradient id="lensGradient" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0%" stop-color="#38bdf8"/>' +
    '<stop offset="55%" stop-color="#818cf8"/>' +
    '<stop offset="100%" stop-color="#f472b6"/>' +
    "</linearGradient></defs>" +
    '<rect width="320" height="220" fill="url(#lensGradient)"/>' +
    '<circle cx="90" cy="60" r="70" fill="#ffffff" opacity="0.16"/>' +
    '<circle cx="240" cy="150" r="95" fill="#ffffff" opacity="0.12"/>' +
    "</svg>";
  return {
    img: null,
    src: `data:image/svg+xml,${encodeURIComponent(markup)}`,
    alt: "Placeholder photo",
    style: {
      display: "block",
      width: "100%",
      height: "auto",
      maxWidth: themeSpacing(90),
    },
  } as DomphyElement<"img">;
}

/**
 * A magnifying-glass hover overlay: shows a circular, zoomed-in copy of the
 * wrapped content centered on the cursor (or, in static / default-position
 * mode, on an externally controlled or resting coordinate). Call with no
 * arguments for a working demo — a placeholder image with a 1.3x
 * follow-cursor lens.
 */
function lens(props: LensProps = {}): DomphyElement<"div"> {
  const content = props.children ?? defaultLensContent();
  const zoomFactor = props.zoomFactor ?? DEFAULT_ZOOM_FACTOR;
  const lensSizeUnits = props.lensSizeUnits ?? DEFAULT_LENS_SIZE_UNITS;
  const isStatic = props.isStatic ?? false;
  const positionState = toState(props.position ?? DEFAULT_POSITION);
  const defaultPosition = props.defaultPosition;
  const lensColor = props.lensColor ?? DEFAULT_LENS_COLOR;
  const duration = props.duration ?? DEFAULT_DURATION;

  if (zoomFactor < 1) throw new Error("zoomFactor must be greater than 1");
  if (lensSizeUnits < 0) throw new Error("lensSize must be greater than 0");

  // isStatic pins it; a defaultPosition keeps it parked-but-visible. Either way
  // the lens starts shown (no hover-in animation gating its first paint).
  const alwaysVisible = isStatic || defaultPosition !== undefined;

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
      const scaleWrapper = zoomLayer?.parentElement ?? null;
      const overlay = scaleWrapper?.parentElement ?? null;
      const wrapper = overlay?.parentElement ?? null;
      if (
        !zoomLayer ||
        !scaleWrapper ||
        !overlay ||
        !wrapper ||
        typeof window === "undefined"
      )
        return;
      const baseContent = wrapper.querySelector(
        '[data-lens-content="true"]',
      ) as HTMLElement | null;
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

      // Position is written straight to the untransitioned `translate(...)` on
      // the overlay, so the lens snaps to the cursor with no lag on every move.
      const applyLensPosition = (x: number, y: number) => {
        overlay.style.transform = `translate(${x - lensRadius}px, ${y - lensRadius}px)`;
        zoomLayer.style.transformOrigin = "0 0";
        zoomLayer.style.transform =
          `translate(${lensRadius - x * zoomFactor}px, ${lensRadius - y * zoomFactor}px) ` +
          `scale(${zoomFactor})`;
      };

      const showLens = () => {
        overlay.style.opacity = "1";
        scaleWrapper.style.transform = ENTER_SCALE;
      };
      const hideLens = () => {
        overlay.style.opacity = "0";
        scaleWrapper.style.transform = EXIT_SCALE;
      };

      const positionFromEvent = (event: MouseEvent) => {
        const rect = baseContent.getBoundingClientRect();
        applyLensPosition(event.clientX - rect.left, event.clientY - rect.top);
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
        // updates a `State<LensPosition>` passed as `props.position`. Stays
        // visible (overlay opacity / wrapper scale start shown).
        disposeEffect = effect(() => {
          const position = positionState.get();
          applyLensPosition(position.x, position.y);
        });
      } else if (defaultPosition) {
        // Always visible: rest at defaultPosition, follow the cursor on hover,
        // snap back on leave. No fade — opacity/scale stay at their shown values.
        applyLensPosition(defaultPosition.x, defaultPosition.y);
        handleMove = positionFromEvent;
        handleLeave = () =>
          applyLensPosition(defaultPosition.x, defaultPosition.y);
        wrapper.addEventListener("mousemove", handleMove);
        wrapper.addEventListener("mouseleave", handleLeave);
      } else {
        // Follow mode: hidden until hover, fades/scales in on enter and out on
        // leave. High-frequency tracking is imperative (direct DOM writes),
        // matching the same tradeoff pointer.ts/dock.ts make.
        handleMove = positionFromEvent;
        handleEnter = (event: MouseEvent) => {
          positionFromEvent(event);
          showLens();
        };
        handleLeave = hideLens;
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

  // Clips the zoom layer and carries the radial-gradient mask (the sole reveal
  // mechanism — no border/outline/shadow) plus the eased mount scale. `lensColor`
  // is only the mask fill; the mask reveals via alpha, so its color is inert.
  const maskImage = `radial-gradient(circle closest-side at 50% 50%, ${lensColor} 100%, transparent 100%)`;
  const scaleWrapperElement: DomphyElement<"div"> = {
    div: [zoomLayerElement],
    ariaHidden: "true",
    style: {
      position: "absolute",
      insetBlockStart: 0,
      insetInlineStart: 0,
      width: "100%",
      height: "100%",
      overflow: "hidden",
      maskImage,
      WebkitMaskImage: maskImage,
      transform: alwaysVisible ? ENTER_SCALE : INITIAL_SCALE,
      transformOrigin: "center",
      transition: `transform ${duration}s ease-out`,
      willChange: "transform",
    } as StyleObject,
  };

  // `_doctorDisable` is a doctor-only annotation not present in core's strict
  // `PartialElement` type — build through an untyped literal, then assert, so
  // the excess-property check doesn't fire (mirrors dock.ts's separator()).
  // This overlay is a decorative, aria-hidden magnified duplicate with no
  // text of its own, so it is exempt from the missing-color contract.
  const overlayElement = {
    div: [scaleWrapperElement],
    dataLensOverlay: "true",
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      insetBlockStart: 0,
      insetInlineStart: 0,
      width: themeSpacing(lensSizeUnits),
      height: themeSpacing(lensSizeUnits),
      pointerEvents: "none",
      zIndex: 50,
      opacity: alwaysVisible ? 1 : 0,
      // Position is written here on every move (untransitioned). Only opacity
      // eases, so tracking never lags.
      transform: "translate(-9999px, -9999px)",
      transition: `opacity ${duration}s ease-out`,
      willChange: "opacity, transform",
    } as StyleObject,
  } as DomphyElement<"div">;

  return {
    div: [baseContentElement, overlayElement],
    role: "region",
    ariaLabel: props.ariaLabel ?? DEFAULT_ARIA_LABEL,
    tabindex: 0,
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      (event.currentTarget as HTMLElement | null)?.dispatchEvent(
        new MouseEvent("mouseleave"),
      );
    },
    style: {
      position: "relative",
      zIndex: 20,
      overflow: "hidden",
      borderRadius: themeSpacing(3),
      ...(props.style ?? {}),
    },
  };
}

export { lens };
