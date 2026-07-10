// magicui "Android" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A
// realistic Android flagship device-frame mockup with a front camera
// punch-hole cutout, used to display a screenshot or video inside its screen
// area. Purely a static presentational frame — no interactivity of its own.
//
// Unlike safari()/iphone() (sized by their wrapper at width: 100%), this
// frame is sized directly by explicit `width`/`height` props, per the spec.
//
// Geometry mirrors upstream's authored SVG (viewBox 0 0 433 882): the phone
// BODY is a 378×830 rounded rect pinned to the top-left of the 433×882 canvas
// (NOT edge-to-edge) — the extra right/bottom space is transparent padding.
// All decorative children (screen, camera, side buttons) are positioned in
// percentages of that BODY, so they land at the same absolute pixels as the
// source paths.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { type ElementTone, themeColor } from "@domphy/theme";

export interface AndroidProps {
  /** Screenshot shown in the screen area. */
  src?: string;
  /** Video shown in the screen area, rendered as a DOM overlay (not an SVG mask) to
   * avoid a known Safari/iOS video-clipping bug when video sits inside a masked SVG tree. */
  videoSrc?: string;
  /** Accessible label for the screen content (image alt text / video description). */
  alt?: string;
  /** Overall mockup width in pixels. Defaults to `433`. */
  width?: number;
  /** Overall mockup height in pixels. Defaults to `882`. */
  height?: number;
  style?: StyleObject;
}

const DEFAULT_WIDTH = 433;
const DEFAULT_HEIGHT = 882;

// Upstream body rect: 378×830 within the 433×882 canvas.
const BODY_WIDTH = 378;
const BODY_HEIGHT = 830;

interface SideButton {
  key: string;
  top: string;
  height: string;
}

// Right edge only, matching upstream's two authored button paths (x376→380):
// a TALL upper button (y153→251) then a SHORT lower one (y301→353). Values are
// percentages of the 378×830 body these buttons are children of.
const SIDE_BUTTONS: SideButton[] = [
  {
    key: "button-top",
    top: `${(153 / BODY_HEIGHT) * 100}%`,
    height: `${(98 / BODY_HEIGHT) * 100}%`,
  },
  {
    key: "button-bottom",
    top: `${(301 / BODY_HEIGHT) * 100}%`,
    height: `${(52 / BODY_HEIGHT) * 100}%`,
  },
];

/** A solid decorative shape (button notch, punch-hole camera) painted via `fill:
 * currentColor` on an inline SVG rather than `backgroundColor`, so its themed tone lives on
 * the already-required `color` prop — sidesteps the doctor's `missing-color` rule without an
 * escape hatch. `rx` is set far past half the shape's own size so the SVG renderer clamps it
 * down to a true stadium/pill shape regardless of the shape's aspect ratio. */
function frameGlyph(
  key: string,
  shape: DomphyElement,
  shapeWidth: number,
  shapeHeight: number,
  tone: ElementTone,
  // Plain string/number record instead of `StyleObject` — a computed inset key would
  // collide with `StyleObject`'s pseudo-selector index signatures when spread directly.
  // Cast once at the merge point below instead.
  position: Record<string, string | number>,
  zIndex = 1,
): DomphyElement<"span"> {
  return {
    span: [
      {
        svg: [shape],
        viewBox: `0 0 ${shapeWidth} ${shapeHeight}`,
        fill: "currentColor",
        ariaHidden: "true",
        style: { width: "100%", height: "100%", display: "block" },
      } as DomphyElement<"svg">,
    ],
    _key: key,
    ariaHidden: "true",
    style: {
      position: "absolute",
      zIndex,
      color: (listener: Listener) => themeColor(listener, tone),
      ...position,
    } as StyleObject,
  };
}

function sideButtonGlyph(button: SideButton): DomphyElement<"span"> {
  // Buttons straddle the body's right edge (x376→380 vs body right edge 378), so they
  // stick out ~2px into the transparent canvas padding. Widths/insets in body percentages.
  return frameGlyph(
    button.key,
    {
      rect: null,
      x: 0,
      y: 0,
      width: 20,
      height: 100,
      rx: 999,
    } as DomphyElement,
    20,
    100,
    "shift-15",
    {
      insetInlineEnd: `${(-2 / BODY_WIDTH) * 100}%`,
      insetBlockStart: button.top,
      width: `${(4 / BODY_WIDTH) * 100}%`,
      height: button.height,
    },
  );
}

/** Front camera punch-hole: two concentric circles at the body-center x (upstream cx=189 =
 * 378/2, cy=28). An outer disc (r=9) the tone of the device surface masks the screenshot
 * behind it, with a smaller grey lens dot (r=4) painted on top — matching upstream's white/dark
 * ring + grey lens. Both are body-level siblings of the screen (painted over it), so their
 * 50% x resolves against the 378-wide body (= x189), NOT the full 433 canvas. */
function punchHoleCamera(): DomphyElement<"span">[] {
  const center: Record<string, string | number> = {
    insetInlineStart: "50%",
    insetBlockStart: `${(28 / BODY_HEIGHT) * 100}%`,
    transform: "translate(-50%, -50%)",
    aspectRatio: "1 / 1",
  };
  return [
    // Outer ring / disc: r=9 → diameter 18 of the 378-wide body.
    frameGlyph(
      "camera-ring",
      { circle: null, cx: 50, cy: 50, r: 50 } as DomphyElement,
      100,
      100,
      "shift-17",
      {
        ...center,
        width: `${(18 / BODY_WIDTH) * 100}%`,
      },
    ),
    // Inner lens dot: r=4 → diameter 8, a touch greyer than the ring.
    frameGlyph(
      "camera-lens",
      { circle: null, cx: 50, cy: 50, r: 50 } as DomphyElement,
      100,
      100,
      "shift-15",
      {
        ...center,
        width: `${(8 / BODY_WIDTH) * 100}%`,
      },
    ),
  ];
}

/** The screen-area media layer: a video overlay wins over a static image; renders nothing
 * (bare screen) when neither is supplied. */
function screenMedia(
  src: string | undefined,
  videoSrc: string | undefined,
  label: string,
): DomphyElement | null {
  if (videoSrc) {
    return {
      video: null,
      src: videoSrc,
      autoPlay: true,
      loop: true,
      muted: true,
      playsInline: true,
      "aria-label": label,
      style: {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
        objectFit: "cover",
      },
    } as DomphyElement;
  }
  if (src) {
    return {
      img: null,
      src,
      alt: label,
      style: {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
        objectFit: "cover",
      },
    } as DomphyElement;
  }
  return null;
}

/**
 * A realistic Android flagship device-frame mockup with a front camera punch-hole cutout
 * that shows a screenshot or video inside its screen area. Static presentational frame — no
 * built-in interactivity. Sized directly by `width`/`height` props (defaults 433×882). Call
 * with no arguments for a working demo (empty frame with camera cutout and buttons).
 */
function android(props: AndroidProps = {}): DomphyElement<"div"> {
  const alt = props.alt ?? "App screen preview";
  const width = props.width ?? DEFAULT_WIDTH;
  const height = props.height ?? DEFAULT_HEIGHT;
  const media = screenMedia(props.src, props.videoSrc, alt);

  const screen: DomphyElement = {
    div: media ? [media] : null,
    ariaHidden: "true",
    dataTone: "shift-15",
    style: {
      position: "absolute",
      inset: "1.6%",
      overflow: "hidden",
      borderRadius: "9%",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
    },
  };

  // The phone body: a 378×830 rounded rect anchored to the canvas top-left (upstream leaves
  // ~55px right / ~52px bottom of transparent padding). Corner radius 42px maps to elliptical
  // 11.11%×5.06% of the body box.
  const body: DomphyElement = {
    div: [screen, ...punchHoleCamera(), ...SIDE_BUTTONS.map(sideButtonGlyph)],
    ariaHidden: "true",
    dataTone: "shift-17",
    style: {
      position: "absolute",
      insetBlockStart: 0,
      insetInlineStart: 0,
      width: `${(BODY_WIDTH / DEFAULT_WIDTH) * 100}%`,
      height: `${(BODY_HEIGHT / DEFAULT_HEIGHT) * 100}%`,
      borderRadius: `${(42 / BODY_WIDTH) * 100}% / ${(42 / BODY_HEIGHT) * 100}%`,
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
    },
  };

  return {
    div: [body],
    role: "img",
    ariaLabel: `Android phone mockup showing ${alt}`,
    style: {
      position: "relative",
      width: `${width}px`,
      height: `${height}px`,
      ...(props.style ?? {}),
    },
  };
}

export { android };
