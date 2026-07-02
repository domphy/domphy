// magicui "Safari" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A framed
// browser-window mockup styled like macOS Safari, used to showcase a
// screenshot, image, or video inside a realistic browser chrome. Purely a
// static presentational frame — it just contains whatever media is passed in.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { small } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export type SafariMode = "default" | "simple";

export interface SafariProps {
  /** URL text shown centered in the pill-shaped address bar. Defaults to `"domphy.com"`. */
  url?: string;
  /** Static screenshot displayed in the screen area. */
  imageSrc?: string;
  /** Video displayed in the screen area, rendered as a DOM overlay (not an SVG mask) to
   * avoid a known Safari/iOS video-clipping bug when video sits inside a masked SVG tree. */
  videoSrc?: string;
  /** "default" shows the full toolbar (traffic lights + address bar); "simple" strips it
   * down to just the address bar. Defaults to "default". */
  mode?: SafariMode;
  style?: StyleObject;
}

const TRAFFIC_LIGHTS: Array<{ key: string; color: ThemeColor }> = [
  { key: "close", color: "danger" },
  { key: "minimize", color: "warning" },
  { key: "zoom", color: "success" },
];

// A solid-filled circular glyph, not a themed "surface" — painted via `fill:
// currentColor` + a fixed-shift `color` (same idiom as icon()/badge()'s own
// fixed-shift `color`) rather than `backgroundColor`, so it reads as a vivid
// traffic-light dot without tripping the tone-background-inherit surface rule.
function trafficLightDot(color: ThemeColor, key: string): DomphyElement<"span"> {
  return {
    span: [
      {
        svg: [{ circle: null, cx: "12", cy: "12", r: "12" }],
        viewBox: "0 0 24 24",
        fill: "currentColor",
        role: "img",
        ariaHidden: "true",
        style: { width: "100%", height: "100%" },
      } as DomphyElement<"svg">,
    ],
    _key: key,
    style: {
      display: "inline-block",
      width: themeSpacing(3),
      height: themeSpacing(3),
      color: (listener: Listener) => themeColor(listener, "shift-9", color),
    },
  };
}

/** The screen-area media layer: a video overlay wins over a static image; renders nothing
 * (bare frame) when neither is supplied. */
function screenMedia(imageSrc: string | undefined, videoSrc: string | undefined, label: string): DomphyElement | null {
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
  if (imageSrc) {
    return {
      img: null,
      src: imageSrc,
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
 * A macOS-Safari-styled browser-window frame (fixed 1203:753 aspect ratio) that shows a
 * screenshot or video inside its screen area. Static presentational mockup — no built-in
 * interactivity. Call with no arguments for a working demo (empty frame, "domphy.com" in
 * the address bar).
 */
function safari(props: SafariProps = {}): DomphyElement<"div"> {
  const url = props.url ?? "domphy.com";
  const mode = props.mode ?? "default";
  const media = screenMedia(props.imageSrc, props.videoSrc, `Preview of ${url}`);

  const addressBar: DomphyElement = {
    div: [{ small: url, $: [small()] }],
    // `dataTone` anchors are absolute (each is computed from the base tone, not nested
    // relative to an ancestor's own anchor), so pairing this "shift-0" with the toolbar's
    // "shift-2" gives the pill a genuinely distinct — slightly lighter — surface than the
    // bar around it, matching a real address bar's subtle contrast.
    dataTone: "shift-0",
    style: {
      width: "60%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: themeSpacing(6),
      borderRadius: themeSpacing(6),
      overflow: "hidden",
      paddingInline: themeSpacing(4),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-10"),
    },
  };

  const toolbar: DomphyElement = {
    div:
      mode === "default"
        ? [
            {
              div: TRAFFIC_LIGHTS.map((dot) => trafficLightDot(dot.color, dot.key)),
              style: { display: "flex", alignItems: "center", gap: themeSpacing(2), flex: "1 0 0" },
            } as DomphyElement,
            addressBar,
            { div: null, style: { flex: "1 0 0" } } as DomphyElement,
          ]
        : [addressBar],
    dataTone: "shift-2",
    style: {
      flex: "0 0 auto",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: themeSpacing(3),
      paddingInline: themeSpacing(4),
      paddingBlock: themeSpacing(3),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
    },
  };

  const screen: DomphyElement = {
    div: media ? [media] : null,
    ariaHidden: "true",
    dataTone: "shift-0",
    style: {
      flex: "1 1 auto",
      position: "relative",
      overflow: "hidden",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
    },
  };

  return {
    div: [toolbar, screen],
    role: "img",
    ariaLabel: `Browser window showing ${url}`,
    style: {
      position: "relative",
      display: "flex",
      flexDirection: "column",
      width: "100%",
      aspectRatio: "1203 / 753",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      border: (listener: Listener) => `1px solid ${themeColor(listener, "shift-4")}`,
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    },
  };
}

export { safari };
