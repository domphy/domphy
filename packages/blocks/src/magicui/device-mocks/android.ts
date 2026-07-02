// magicui "Android" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A
// realistic Android flagship device-frame mockup with a front camera
// punch-hole cutout, used to display a screenshot or video inside its screen
// area. Purely a static presentational frame — no interactivity of its own.
//
// Unlike safari()/iphone() (sized by their wrapper at width: 100%), this
// frame is sized directly by explicit `width`/`height` props, per the spec.

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

interface SideButton {
  key: string;
  top: string;
  height: string;
}

// Volume rocker (two separate buttons) and a single power button, all on the
// right edge — the common layout on modern Android flagships.
const SIDE_BUTTONS: SideButton[] = [
  { key: "volume-up", top: "18%", height: "6%" },
  { key: "volume-down", top: "25%", height: "6%" },
  { key: "power", top: "33%", height: "9%" },
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
      zIndex: 1,
      color: (listener: Listener) => themeColor(listener, tone),
      ...position,
    } as StyleObject,
  };
}

function sideButtonGlyph(button: SideButton): DomphyElement<"span"> {
  return frameGlyph(button.key, { rect: null, x: 0, y: 0, width: 20, height: 100, rx: 999 } as DomphyElement, 20, 100, "shift-15", {
    insetInlineEnd: "-1%",
    insetBlockStart: button.top,
    width: "1%",
    height: button.height,
  });
}

function punchHoleCamera(): DomphyElement<"span"> {
  return frameGlyph("camera", { circle: null, cx: 50, cy: 50, r: 50 } as DomphyElement, 100, 100, "shift-17", {
    insetBlockStart: "2.6%",
    insetInlineStart: "50%",
    transform: "translateX(-50%)",
    width: "5%",
    aspectRatio: "1 / 1",
  });
}

/** The screen-area media layer: a video overlay wins over a static image; renders nothing
 * (bare screen) when neither is supplied. */
function screenMedia(src: string | undefined, videoSrc: string | undefined, label: string): DomphyElement | null {
  if (videoSrc) {
    return {
      video: null,
      src: videoSrc,
      autoPlay: true,
      loop: true,
      muted: true,
      playsInline: true,
      "aria-label": label,
      style: { position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", objectFit: "cover" },
    } as DomphyElement;
  }
  if (src) {
    return {
      img: null,
      src,
      alt: label,
      style: { position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", objectFit: "cover" },
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
  const camera = punchHoleCamera();

  const screen: DomphyElement = {
    div: media ? [media, camera] : [camera],
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

  return {
    div: [screen, ...SIDE_BUTTONS.map(sideButtonGlyph)],
    role: "img",
    ariaLabel: `Android phone mockup showing ${alt}`,
    dataTone: "shift-17",
    style: {
      position: "relative",
      width: `${width}px`,
      height: `${height}px`,
      borderRadius: "10%",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    },
  };
}

export { android };
