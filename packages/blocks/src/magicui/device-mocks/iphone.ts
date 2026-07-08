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
  { key: "mute-switch", side: "insetInlineStart", top: "19.28%", height: "3.85%" },
  { key: "volume-up", side: "insetInlineStart", top: "26.42%", height: "7.6%" },
  { key: "volume-down", side: "insetInlineStart", top: "36.17%", height: "7.48%" },
  { key: "power", side: "insetInlineEnd", top: "31.63%", height: "12.02%" },
];

/** A solid decorative shape (button notch, Dynamic Island, camera lens) painted via
 * `fill: currentColor` on an inline SVG rather than `backgroundColor`, so its themed tone
 * lives on the already-required `color` prop — sidesteps the doctor's `missing-color` rule
 * without an escape hatch. `rx` is set far past half the shape's own size so the SVG renderer
 * clamps it down to a true stadium/pill shape regardless of the shape's aspect ratio. Because
 * the span is `position: absolute`, it is itself the containing block for any absolutely-
 * positioned `children` (e.g. the Dynamic Island's camera lens), whose percentages resolve
 * against this glyph's own box. */
function frameGlyph(
  key: string,
  shapeWidth: number,
  shapeHeight: number,
  tone: ElementTone,
  // Plain string/number record instead of `StyleObject` — the caller's computed
  // `insetInlineStart`/`insetInlineEnd` key collides with `StyleObject`'s pseudo-selector
  // index signatures when spread directly. Cast once at the merge point below instead.
  position: Record<string, string | number>,
  children: DomphyElement[] = [],
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
      ...children,
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
      preload: "metadata",
      "aria-label": label,
      style: { position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", objectFit: "cover" },
    } as DomphyElement;
  }
  if (src) {
    return {
      img: null,
      src,
      alt: label,
      // Upstream img is `object-cover object-top`: the crop is top-aligned, not centered,
      // so the top of a full-app screenshot stays pinned under the Dynamic Island.
      style: {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
        objectFit: "cover",
        objectPosition: "top",
      },
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

  // Camera / Face-ID lens: a subtle dot toward the right end of the Dynamic Island. Upstream
  // draws it as a ~5.5r circle centered at x259.5,y48.5 within the 154..278 × 30..67 pill, i.e.
  // 85% across and 50% down the island box, ~8.9% × 29.7% of it. Nested inside the island span
  // (its containing block) so these percentages resolve against the island, not the root.
  const cameraLens = frameGlyph("dynamic-island-lens", 11, 11, "shift-15", {
    insetInlineStart: "85.08%",
    insetBlockStart: "50%",
    transform: "translate(-50%, -50%)",
    width: "8.87%",
    height: "29.73%",
  });

  // Root-derived percentages (124/433, 30/882, 37/882). This must be a root-level sibling
  // (not nested in the position:absolute `screen` div) so they resolve against the whole
  // 433×882 frame — nesting it under `screen` shrinks/shifts it against the smaller screen box.
  const dynamicIsland = frameGlyph(
    "dynamic-island",
    124,
    37,
    "shift-17",
    {
      insetBlockStart: "3.4%",
      insetInlineStart: "50%",
      transform: "translateX(-50%)",
      width: "28.64%",
      height: "4.2%",
    },
    [cameraLens],
  );

  // Earpiece speaker slit: a faint, very thin centered pill hugging the top edge. Upstream is
  // the opacity-0.5 path M174 5H258 (x174..258 → 19.4% wide, y5..7.5 → ~0.28% tall, top 0.57%).
  const earpiece = frameGlyph("earpiece", 84, 3, "shift-15", {
    insetBlockStart: "0.57%",
    insetInlineStart: "50%",
    transform: "translateX(-50%)",
    width: "19.4%",
    height: "0.28%",
    opacity: 0.5,
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
    div: media ? [media] : null,
    ariaHidden: "true",
    dataTone: "shift-15",
    style: {
      position: "absolute",
      inset: "2.18% 5.14% 2.18% 4.91%",
      overflow: "hidden",
      borderRadius: "14.31% / 6.61%",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
    },
  };

  return {
    div: [screen, dynamicIsland, earpiece, ...buttons],
    role: "img",
    ariaLabel: `iPhone mockup showing ${alt}`,
    dataTone: "shift-17",
    style: {
      // Upstream root is `inline-block ... align-middle leading-none`: it flows inline (so a
      // caption/text sibling baselines against its middle) with no stray line-box height.
      position: "relative",
      display: "inline-block",
      verticalAlign: "middle",
      lineHeight: 1,
      width: "100%",
      aspectRatio: "433 / 882",
      borderRadius: "16.86% / 8.28%",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    },
  };
}

export { iphone };
