// magicui "Video Text" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). Large
// display text whose glyphs are windows onto a looping, muted background
// video — implemented with the standard SVG-mask-on-video technique: a
// hidden <svg><mask> holds one large <text> (fill: white, everything else
// left unpainted/transparent), and the <video> references that mask via CSS
// `mask-image: url(#id)` (unprefixed + `-webkit-` for Safari). The mask's
// `maskContentUnits="userSpaceOnUse"` lets the <text>'s percentage x/y
// coordinates resolve against the *masked element's own box* (the video),
// so the glyph stays centered and the effect is responsive without any JS
// measurement — the browser's video decoder alone drives the motion, no
// per-frame JS work.
//
// No default video asset ships with this package (see the `videoSrc` prop
// doc below) — the zero-argument demo falls back to a looping animated
// theme-gradient panel behind the same text mask, so `videoText()` still
// renders a fully working, continuously animated demo with zero arguments;
// passing a real `videoSrc` swaps in the actual masked <video>.

import type {
  DomphyElement,
  ElementNode,
  Listener,
  StyleObject,
} from "@domphy/core";
import { hashString } from "@domphy/core";
import { type ThemeColor, themeColor, themeFluidSpacing } from "@domphy/theme";

export interface VideoTextProps {
  /** Text rendered as the video mask's glyph shapes. Defaults to `"OCEAN"`. */
  text?: string;
  /** Video source URL loaded into the masked `<video>`. When omitted, a looping
   * animated theme-gradient panel fills the mask instead — no video asset ships
   * with this package. */
  videoSrc?: string;
  /** Autoplays the video once mounted. Defaults to `true`. */
  autoPlay?: boolean;
  /** Loops the video indefinitely. Defaults to `true`. */
  loop?: boolean;
  /** Mutes the video — required by browsers for autoplay to succeed. Defaults to `true`. */
  muted?: boolean;
  /** `<video>` `preload` strategy. Defaults to `"auto"`. */
  preload?: "auto" | "metadata" | "none";
  /** Glyph font-size, any CSS length. Defaults to a fluid value that scales with viewport width. */
  fontSize?: string;
  /** Glyph font-weight. Defaults to `"800"` (heavy, so each letter reads as a wide video window). */
  fontWeight?: string | number;
  /** Glyph font-family stack. Defaults to a bold generic sans stack. */
  fontFamily?: string;
  /** Container aspect ratio, CSS `aspect-ratio` syntax. Defaults to `"3 / 1"`. */
  aspectRatio?: string;
  /** Theme color family for the fallback gradient panel (used only when `videoSrc` is omitted). Defaults to `"primary"`. */
  fallbackColor?: ThemeColor;
  /** Pauses the video while the container is scrolled out of view, resuming when it re-enters — a small performance courtesy. Defaults to `true`. */
  pauseWhenOffscreen?: boolean;
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

let videoTextInstanceCounter = 0;

/**
 * Large display text whose glyphs are windows onto a looping, muted
 * background video (an SVG-mask-on-video technique). Call with no arguments
 * for a working demo — an animated gradient fills the letters since no
 * `videoSrc` is bundled with this package.
 */
function videoText(props: VideoTextProps = {}): DomphyElement<"div"> {
  const text = props.text ?? "OCEAN";
  const videoSrc = props.videoSrc;
  const autoPlay = props.autoPlay ?? true;
  const loop = props.loop ?? true;
  const muted = props.muted ?? true;
  const preload = props.preload ?? "auto";
  const fontSize = props.fontSize ?? themeFluidSpacing(48, 220);
  const fontWeight = String(props.fontWeight ?? "800");
  const fontFamily =
    props.fontFamily ?? "ui-sans-serif, system-ui, 'Segoe UI', sans-serif";
  const aspectRatio = props.aspectRatio ?? "3 / 1";
  const fallbackColor = props.fallbackColor ?? "primary";
  const pauseWhenOffscreen = props.pauseWhenOffscreen ?? true;

  const instanceId = ++videoTextInstanceCounter;
  const maskId = `domphy-video-text-mask-${instanceId}`;

  // Hidden defs-only host — zero size, purely a place to declare the <mask>.
  // A `<mask>` element's own children never render on their own; they only
  // paint when referenced via `mask-image`/`mask` on another element.
  const maskDefs: DomphyElement<"svg"> = {
    svg: [
      {
        mask: [
          {
            text,
            x: "50%",
            y: "50%",
            textAnchor: "middle",
            dominantBaseline: "central",
            fill: "white",
            fontSize,
            fontWeight,
            fontFamily,
          } as DomphyElement<"text">,
        ],
        id: maskId,
        maskContentUnits: "userSpaceOnUse",
      } as DomphyElement<"mask">,
    ],
    width: "0",
    height: "0",
    xmlns: "http://www.w3.org/2000/svg",
    ariaHidden: "true",
    style: { position: "absolute" },
  };

  const maskedFillStyle: StyleObject = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    maskImage: `url(#${maskId})`,
    WebkitMaskImage: `url(#${maskId})`,
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskSize: "100% 100%",
    WebkitMaskSize: "100% 100%",
  };

  const gradientKeyframes = {
    from: { backgroundPosition: "0% 50%" },
    to: { backgroundPosition: "300% 50%" },
  };
  const gradientAnimationName = `video-text-fallback-flow-${hashString(
    JSON.stringify({ instanceId, gradientKeyframes }),
  )}`;

  const fillLayer: DomphyElement = videoSrc
    ? ({
        video: [],
        src: videoSrc,
        autoPlay,
        loop,
        muted,
        playsInline: true,
        preload,
        ariaHidden: "true",
        style: { ...maskedFillStyle, objectFit: "cover" } as StyleObject,
        _onMount: (node: ElementNode) => {
          const videoElement = node.domElement as HTMLVideoElement;
          // Setting the `muted` IDL property imperatively (not just the
          // content attribute) is required by some browsers' autoplay
          // policies — the content attribute alone only seeds
          // `defaultMuted`, not the live playback state.
          videoElement.muted = muted;
          if (!autoPlay) return;
          const playResult = videoElement.play();
          // Autoplay can be rejected by the browser (e.g. no user gesture yet
          // on a strict mobile policy) — fail open, the frame just stays on
          // the video's poster/first frame rather than throwing.
          if (playResult && typeof playResult.catch === "function") {
            playResult.catch(() => {});
          }
        },
      } as DomphyElement<"video">)
    : ({
        div: null,
        ariaHidden: "true",
        // Decorative gradient stand-in for the (unbundled) video — no text of
        // its own, exempt from the missing-color contract.
        _doctorDisable: "missing-color",
        style: {
          ...maskedFillStyle,
          backgroundImage: (listener: Listener) =>
            `linear-gradient(90deg, ${themeColor(listener, "shift-8", fallbackColor)}, ${themeColor(listener, "shift-2", fallbackColor)}, ${themeColor(listener, "shift-11", fallbackColor)}, ${themeColor(listener, "shift-8", fallbackColor)})`,
          backgroundSize: "300% 100%",
          animation: `${gradientAnimationName} 6s linear infinite`,
          [`@keyframes ${gradientAnimationName}`]: gradientKeyframes,
        } as StyleObject,
      } as DomphyElement<"div">);

  const offscreenPauseHook = (node: ElementNode) => {
    if (typeof IntersectionObserver !== "function") return;
    const container = node.domElement as HTMLElement;
    const videoElement = container.querySelector(
      "video",
    ) as HTMLVideoElement | null;
    if (!videoElement) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!autoPlay) continue;
            const playResult = videoElement.play();
            if (playResult && typeof playResult.catch === "function") {
              playResult.catch(() => {});
            }
          } else {
            videoElement.pause();
          }
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(container);
    node.addHook("Remove", () => observer.disconnect());
  };

  const outer: DomphyElement<"div"> = {
    div: [fillLayer, maskDefs],
    role: "img",
    ariaLabel: text,
    dataTone: "shift-16",
    // `_onMount` must be a function or entirely absent — a `key: undefined`
    // entry is rejected by the framework's hook validation, so this is only
    // included when the pause-on-offscreen behavior actually applies.
    ...(pauseWhenOffscreen && videoSrc ? { _onMount: offscreenPauseHook } : {}),
    style: {
      position: "relative",
      overflow: "hidden",
      width: "100%",
      aspectRatio,
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    },
  };

  return outer;
}

export { videoText };
