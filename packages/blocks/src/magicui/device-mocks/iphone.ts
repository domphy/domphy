// magicui "iPhone" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A
// realistic iPhone (Dynamic-Island era) device-frame mockup that shows a
// screenshot or video inside its screen cutout. Purely a static
// presentational frame — no interactivity of its own.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { type ElementTone, themeColor } from "@domphy/theme";

export interface IphoneProps {
  /** Screenshot shown in the screen area. */
  src?: string;
  /** Video shown in the screen area, rendered as a DOM overlay (not an SVG mask) to
   * avoid a known Safari/iOS video-clipping bug when video sits inside a masked SVG tree. */
  videoSrc?: string;
  /** Accessible label for the screen content (image alt text / video description). */
  alt?: string;
  style?: StyleObject;
}

interface SideButton {
  key: string;
  side: "insetInlineStart" | "insetInlineEnd";
  top: string;
  height: string;
}

// Mute switch + two separate volume buttons on the left edge, one power button
// on the right edge — mirrors a modern Pro-style iPhone's button layout.
const SIDE_BUTTONS: SideButton[] = [
  { key: "mute-switch", side: "insetInlineStart", top: "12%", height: "3%" },
  { key: "volume-up", side: "insetInlineStart", top: "19%", height: "6.5%" },
  { key: "volume-down", side: "insetInlineStart", top: "27.5%", height: "6.5%" },
  { key: "power", side: "insetInlineEnd", top: "19%", height: "10%" },
];

/** A solid decorative shape (button notch, Dynamic Island) painted via `fill: currentColor`
 * on an inline SVG rather than `backgroundColor`, so its themed tone lives on the already-
 * required `color` prop — sidesteps the doctor's `missing-color` rule without an escape hatch.
 * `rx` is set far past half the shape's own size so the SVG renderer clamps it down to a
 * true stadium/pill shape regardless of the shape's aspect ratio. */
function frameGlyph(
  key: string,
  shapeWidth: number,
  shapeHeight: number,
  tone: ElementTone,
  // Plain string/number record instead of `StyleObject` — the caller's computed
  // `insetInlineStart`/`insetInlineEnd` key collides with `StyleObject`'s pseudo-selector
  // index signatures when spread directly. Cast once at the merge point below instead.
  position: Record<string, string | number>,
): DomphyElement<"span"> {
  return {
    span: [
      {
        svg: [{ rect: null, x: 0, y: 0, width: shapeWidth, height: shapeHeight, rx: 999 }],
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
 * A realistic iPhone (Dynamic-Island era) device-frame mockup (fixed 433:882 aspect ratio)
 * that shows a screenshot or video inside its screen cutout. Static presentational frame —
 * no built-in interactivity. Sized entirely by its wrapper (renders at `width: 100%`). Call
 * with no arguments for a working demo (empty frame with Dynamic Island and buttons).
 */
function iphone(props: IphoneProps = {}): DomphyElement<"div"> {
  const alt = props.alt ?? "App screen preview";
  const media = screenMedia(props.src, props.videoSrc, alt);

  const dynamicIsland = frameGlyph("dynamic-island", 100, 30, "shift-17", {
    insetBlockStart: "2.3%",
    insetInlineStart: "50%",
    transform: "translateX(-50%)",
    width: "26%",
    height: "3.3%",
  });

  const buttons = SIDE_BUTTONS.map((button) =>
    frameGlyph(button.key, 20, 100, "shift-15", {
      [button.side]: "-1%",
      insetBlockStart: button.top,
      width: "1%",
      height: button.height,
    }),
  );

  const screen: DomphyElement = {
    div: media ? [media, dynamicIsland] : [dynamicIsland],
    ariaHidden: "true",
    dataTone: "shift-15",
    style: {
      position: "absolute",
      inset: "1.8%",
      overflow: "hidden",
      borderRadius: "11%",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
    },
  };

  return {
    div: [screen, ...buttons],
    role: "img",
    ariaLabel: `iPhone mockup showing ${alt}`,
    dataTone: "shift-17",
    style: {
      position: "relative",
      width: "100%",
      aspectRatio: "433 / 882",
      borderRadius: "13%",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    },
  };
}

export { iphone };
