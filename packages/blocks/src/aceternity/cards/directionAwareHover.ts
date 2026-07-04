// Aceternity UI "Direction Aware Hover" — clean-room reimplementation from
// the public behavior/visual spec only (no upstream source viewed or
// copied). An image card that detects which of the 4 edges the cursor
// entered from, then pans the image and slides a text overlay in from that
// same edge.
//
// The key trick (per the spec's research note) is classifying the entry
// point against the rectangle's two DIAGONALS rather than plain quadrant
// math, so corner entries still resolve to a sensible nearest edge. With the
// entry point expressed relative to the card's center as `(x, y)` and the
// two diagonals as the lines `y = (h/w)x` and `y = -(h/w)x`, the sign of
// `d1 = y - (h/w)x` and `d2 = y + (h/w)x` partitions the rectangle into 4
// triangles: `(d1<0, d2<0)` → top, `(d1>0, d2>0)` → bottom, `(d1>0, d2<0)` →
// left, otherwise → right. See `classifyEntryDirection`.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { heading, small } from "@domphy/ui";
import { themeColor, themeSpacing } from "@domphy/theme";

export type HoverEdgeDirection = "top" | "right" | "bottom" | "left";

export interface DirectionAwareHoverProps {
  /** Background image source. Defaults to a generic inline placeholder photo. */
  imageSrc?: string;
  imageAlt?: string;
  /** Overlay content (title + subtitle, typically). Defaults to a generic demo caption. */
  children?: DomphyElement[];
  style?: StyleObject;
}

interface DirectionTransform {
  overlayOffCanvas: string;
  imagePan: string;
}

const DIRECTION_TRANSFORMS: Record<HoverEdgeDirection, DirectionTransform> = {
  top: { overlayOffCanvas: "translateY(-100%)", imagePan: "scale(1.08) translateY(3%)" },
  bottom: { overlayOffCanvas: "translateY(100%)", imagePan: "scale(1.08) translateY(-3%)" },
  left: { overlayOffCanvas: "translateX(-100%)", imagePan: "scale(1.08) translateX(3%)" },
  right: { overlayOffCanvas: "translateX(100%)", imagePan: "scale(1.08) translateX(-3%)" },
};

const OVERLAY_ENTERED_TRANSFORM = "translate(0, 0)";
const IMAGE_RESTING_TRANSFORM = "scale(1) translate(0, 0)";

/** Diagonal-slicing entry-direction classification — see the module comment for the math. */
function classifyEntryDirection(centeredX: number, centeredY: number, width: number, height: number): HoverEdgeDirection {
  const ratio = height / (width || 1);
  const d1 = centeredY - ratio * centeredX;
  const d2 = centeredY + ratio * centeredX;
  if (d1 <= 0 && d2 <= 0) return "top";
  if (d1 >= 0 && d2 >= 0) return "bottom";
  if (d1 >= 0 && d2 <= 0) return "left";
  return "right";
}

// Deliberately an abstract gradient composition rather than the familiar
// "rectangle + sun circle + mountain silhouette" glyph most browsers/icon sets use for a
// *missing* image — that shape would read as a broken image instead of a placeholder one.
function defaultImage(): { src: string; alt: string } {
  const markup =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">' +
    '<defs><linearGradient id="beachGradient" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="#38bdf8"/>' +
    '<stop offset="55%" stop-color="#5eead4"/>' +
    '<stop offset="100%" stop-color="#fde68a"/>' +
    "</linearGradient></defs>" +
    '<rect width="400" height="300" fill="url(#beachGradient)"/>' +
    '<circle cx="320" cy="70" r="34" fill="#ffffff" opacity="0.35"/>' +
    '<circle cx="80" cy="230" r="120" fill="#ffffff" opacity="0.10"/>' +
    "</svg>";
  return { src: `data:image/svg+xml,${encodeURIComponent(markup)}`, alt: "Placeholder landscape photo" };
}

function defaultOverlayContent(): DomphyElement[] {
  return [
    // h3 (not h4, matching every sibling card block — card3D/cardHoverEffect/
    // evervaultCard/focusCards/wobbleCard all use h3) — the demo harness's
    // own outer `<h2>` title made an h4 here skip a level (axe-core
    // `heading-order`).
    { h3: "Whitehaven Beach", $: [heading({ color: "neutral" })] } as DomphyElement,
    { small: "Queensland, Australia", $: [small({ color: "neutral" })] } as DomphyElement,
  ];
}

/**
 * An image card that detects which edge the cursor entered from and pans
 * the image plus slides a text overlay in from that same edge. Call with no
 * arguments for a working demo — a placeholder landscape photo.
 */
function directionAwareHover(props: DirectionAwareHoverProps = {}): DomphyElement<"div"> {
  const defaults = defaultImage();
  const imageSrc = props.imageSrc ?? defaults.src;
  const imageAlt = props.imageAlt ?? defaults.alt;
  const overlayContent = props.children ?? defaultOverlayContent();

  let imageElement: HTMLElement | null = null;
  let overlayElement: HTMLElement | null = null;
  let lastDirection: HoverEdgeDirection | null = null;

  const snapOverlayOffCanvas = (direction: HoverEdgeDirection) => {
    if (!overlayElement) return;
    overlayElement.style.transition = "none";
    overlayElement.style.opacity = "0";
    overlayElement.style.transform = DIRECTION_TRANSFORMS[direction].overlayOffCanvas;
    // Force layout so the snapped position is committed before re-enabling
    // the transition — otherwise the browser would coalesce the snap and the
    // subsequent "entered" state into a single (wrongly animated) frame.
    void overlayElement.offsetHeight;
    overlayElement.style.transition = "";
  };

  const applyOverlayEntered = () => {
    if (!overlayElement) return;
    overlayElement.style.opacity = "1";
    overlayElement.style.transform = OVERLAY_ENTERED_TRANSFORM;
  };

  const imageLayer: DomphyElement<"img"> = {
    img: null,
    src: imageSrc,
    alt: imageAlt,
    _onMount: (node: ElementNode) => {
      imageElement = node.domElement as HTMLElement;
    },
    _onRemove: () => {
      imageElement = null;
    },
    style: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      display: "block",
      objectFit: "cover",
      transform: IMAGE_RESTING_TRANSFORM,
      transition: "transform 400ms cubic-bezier(0.22, 1, 0.36, 1)",
      willChange: "transform",
    } as StyleObject,
  } as DomphyElement<"img">;

  const overlayLayer = {
    div: [{ div: overlayContent, style: { display: "flex", flexDirection: "column", gap: themeSpacing(0.5) } }],
    _onMount: (node: ElementNode) => {
      overlayElement = node.domElement as HTMLElement;
    },
    _onRemove: () => {
      overlayElement = null;
    },
    dataTone: "shift-16",
    style: {
      position: "absolute",
      insetBlockEnd: themeSpacing(3),
      insetInlineStart: themeSpacing(3),
      padding: themeSpacing(3),
      borderRadius: themeSpacing(2),
      opacity: 0,
      transform: DIRECTION_TRANSFORMS.left.overlayOffCanvas,
      transition: "transform 350ms cubic-bezier(0.22, 1, 0.36, 1), opacity 250ms ease",
      pointerEvents: "none",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
    } as StyleObject,
  } as DomphyElement<"div">;

  return {
    div: [imageLayer, overlayLayer],
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      aspectRatio: "4 / 3",
      cursor: "pointer",
      ...(props.style ?? {}),
    } as StyleObject,
    onPointerEnter: (event: PointerEvent, node: ElementNode) => {
      const rect = (node.domElement as HTMLElement).getBoundingClientRect();
      const width = rect.width || 1;
      const height = rect.height || 1;
      const centeredX = event.clientX - rect.left - width / 2;
      const centeredY = event.clientY - rect.top - height / 2;
      const direction = classifyEntryDirection(centeredX, centeredY, width, height);
      lastDirection = direction;
      // The image pan applies immediately — it always has a transition active,
      // so no snap-without-transition step is needed. Only the overlay's
      // off-canvas snap needs a frame to commit before animating back in
      // (see `snapOverlayOffCanvas`'s own comment).
      if (imageElement) imageElement.style.transform = DIRECTION_TRANSFORMS[direction].imagePan;
      snapOverlayOffCanvas(direction);
      requestAnimationFrame(() => applyOverlayEntered());
    },
    onPointerLeave: () => {
      if (!lastDirection) return;
      if (overlayElement) {
        overlayElement.style.opacity = "0";
        overlayElement.style.transform = DIRECTION_TRANSFORMS[lastDirection].overlayOffCanvas;
      }
      if (imageElement) imageElement.style.transform = IMAGE_RESTING_TRANSFORM;
    },
  };
}

export { directionAwareHover };
