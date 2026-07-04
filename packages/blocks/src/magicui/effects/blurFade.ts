// Magic UI "Blur Fade" — clean-room reimplementation.
//
// A transparent wrapper that reveals arbitrary content with a combined
// blur-to-sharp, fade-in, and short slide-in — either shortly after mount or
// the first time it scrolls into view. Implemented on top of this package's
// `motion()` patch (Web Animations API): a `hidden` keyframe (offset
// position, `opacity: 0`, `filter: blur(...)`) animates once to a `visible`
// keyframe (no offset, full opacity, no blur) driven by a `State`, exactly
// like `terminal()`'s own fade-in lines in this package — no Framer Motion
// or React `useInView` dependency of any kind.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream Magic UI source was viewed or copied.

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import { toState } from "@domphy/core";
import { type MotionKeyframe, heading, motion, paragraph } from "@domphy/ui";
import { themeSpacing } from "@domphy/theme";

export type BlurFadeDirection = "up" | "down" | "left" | "right";

export interface BlurFadeKeyframePair {
  /** Starting keyframe, before the reveal plays. */
  hidden: MotionKeyframe;
  /** Target keyframe the content settles into. */
  visible: MotionKeyframe;
}

export interface BlurFadeProps {
  /** Content to reveal. A single element or a list — passed through
   * unchanged inside the animated wrapper. Defaults to a small demo block. */
  children?: DomphyElement | DomphyElement[];
  /** Direction the content slides in *from* — `"down"` (the default) starts
   * the content offset below its final position and it slides upward into
   * place; `"up"` starts above and slides down; `"left"`/`"right"` slide in
   * from that side. */
  direction?: BlurFadeDirection;
  /** How far the content starts offset, in px. Defaults to `6`. */
  offset?: number;
  /** Starting blur radius, in px. Defaults to `6`. */
  blur?: number;
  /** Reveal duration in ms. Defaults to `400`. */
  duration?: number;
  /** Delay before the reveal starts, in ms (once triggered). Defaults to `0`. */
  delay?: number;
  /** `"mount"` (default) plays shortly after the wrapper mounts; `"view"`
   * waits until the wrapper first scrolls into the viewport, then plays once
   * and never reverses. */
  trigger?: "mount" | "view";
  /** `IntersectionObserver` `rootMargin` used when `trigger` is `"view"`.
   * Defaults to `"-50px"` (fires slightly before the element is fully
   * visible). Only used when `trigger === "view"`. */
  viewMargin?: string;
  /** Fully custom `hidden`/`visible` keyframes, overriding
   * `direction`/`offset`/`blur` entirely. */
  keyframes?: BlurFadeKeyframePair;
  /** Renders the wrapper as `inline-block` instead of the default `block`,
   * for revealing inline content without breaking its flow. */
  inline?: boolean;
  style?: StyleObject;
}

function offsetForDirection(direction: BlurFadeDirection, offset: number): { x: number; y: number } {
  switch (direction) {
    case "up":
      return { x: 0, y: -offset };
    case "down":
      return { x: 0, y: offset };
    case "left":
      return { x: -offset, y: 0 };
    case "right":
      return { x: offset, y: 0 };
  }
}

/** Self-contained (no network fetch) gradient thumbnail — used so the default demo has
 * actual image/grid content to fade in, rather than bare text. */
function defaultThumbnail(index: number): DomphyElement {
  const hue = 200 + index * 45;
  const markup =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 140">' +
    `<rect width="200" height="140" rx="12" fill="hsl(${hue}, 70%, 55%)"/>` +
    '<circle cx="150" cy="40" r="18" fill="#ffffff" opacity="0.35"/>' +
    "</svg>";
  return {
    img: null,
    src: `data:image/svg+xml,${encodeURIComponent(markup)}`,
    alt: `Gallery thumbnail ${index + 1}`,
    // A purely decorative gradient tile with no text of its own — exempt from the
    // missing-color contract, same idiom as `parallaxScroll.ts`'s photo tiles.
    _doctorDisable: "missing-color",
    style: { display: "block", width: "100%", height: "auto", borderRadius: themeSpacing(3) },
  } as DomphyElement;
}

function defaultChildren(): DomphyElement[] {
  return [
    { h3: "Blur Fade", $: [heading()] },
    {
      p: "Content settles into place with a blur-to-sharp, fade, and short slide as it mounts or scrolls into view.",
      $: [paragraph({ color: "neutral" })],
    },
    {
      div: [0, 1, 2].map((index) => defaultThumbnail(index)),
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: themeSpacing(2),
        marginBlockStart: themeSpacing(2),
      } as StyleObject,
    },
  ];
}

/**
 * Transparent wrapper that reveals its children with a combined
 * blur-to-sharp, fade-in, and short slide-in — either shortly after mount
 * (default) or the first time it scrolls into view. Call with no arguments
 * for a working demo block that fades in on mount.
 */
function blurFade(props: BlurFadeProps = {}): DomphyElement<"div"> {
  const {
    children = defaultChildren(),
    direction = "down",
    offset = 6,
    blur = 6,
    duration = 400,
    delay = 0,
    trigger = "mount",
    viewMargin = "-50px",
    keyframes,
    inline = false,
  } = props;

  const childElements = Array.isArray(children) ? children : [children];

  const { x: offsetX, y: offsetY } = offsetForDirection(direction, offset);
  const hiddenFrame: MotionKeyframe = keyframes?.hidden ?? {
    opacity: 0,
    x: offsetX,
    y: offsetY,
    filter: `blur(${blur}px)`,
  };
  const visibleFrame: MotionKeyframe = keyframes?.visible ?? {
    opacity: 1,
    x: 0,
    y: 0,
    filter: "blur(0px)",
  };

  const frame = toState<MotionKeyframe>(hiddenFrame);

  return {
    div: childElements,
    $: [
      motion({
        initial: hiddenFrame,
        animate: frame,
        transition: { duration, easing: "ease-out" },
      }),
    ],
    _onMount: (node: ElementNode) => {
      let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
      let observer: IntersectionObserver | null = null;

      const reveal = () => {
        timeoutHandle = setTimeout(() => frame.set(visibleFrame), delay);
      };

      if (trigger === "view") {
        if (typeof IntersectionObserver !== "function") {
          // No IntersectionObserver support (e.g. non-browser test runtime)
          // — fail open and reveal immediately rather than never playing.
          reveal();
        } else {
          const element = node.domElement as Element;
          observer = new IntersectionObserver(
            (entries) => {
              if (entries.some((entry) => entry.isIntersecting)) {
                reveal();
                observer?.disconnect();
                observer = null;
              }
            },
            { rootMargin: viewMargin },
          );
          observer.observe(element);
        }
      } else {
        reveal();
      }

      node.addHook("Remove", () => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        observer?.disconnect();
        observer = null;
      });
    },
    style: {
      display: inline ? "inline-block" : "block",
      ...(props.style ?? {}),
    },
  };
}

export { blurFade };
