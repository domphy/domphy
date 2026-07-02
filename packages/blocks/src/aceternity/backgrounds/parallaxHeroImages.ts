// Aceternity UI "Parallax Hero Images" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied). A
// hero section with up to 8 screenshot-style images scattered around a
// centered headline that drift at different speeds as the pointer moves,
// producing a layered parallax-depth illusion.
//
// Direct DOM style writes on every animation frame, the same continuous-
// pointer idiom `pixelatedCanvas.ts` uses for its own cursor-driven
// distortion: a `pointermove` listener only updates a *target* offset (raw
// cursor position normalized to the container's center, `[-1, 1]` on each
// axis); a `requestAnimationFrame` loop separately lerps each image's
// *current* offset toward `target * maxOffset * depthFactor` every frame, so
// motion reads as smooth/eased rather than snapping straight to the cursor —
// and, on `pointerleave`, the same loop eases every image back to a neutral
// resting position instead of resetting instantly.
//
// Each of the 8 fixed slots around the edges carries a `positionTier`
// ("edge" for the outermost left/right images in each row, "middle" for the
// two nearer the centered headline). `depthFactorFor()` maps that tier to a
// close/far depth multiplier, flipped by `variant`: `"default"` makes the
// middle-positioned images read as closest (per the spec); `"edge-focus"`
// flips it so the outermost images read as closest instead. The spec itself
// flags the exact per-tier factor values as unexposed in the public docs —
// picking two straightforward tiers (`close`/`far`) is a reasonable,
// documented implementer choice per its own researchNote.

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";
import { themeColor, themeSpacing } from "@domphy/theme";

export type ParallaxHeroImagesVariant = "default" | "edge-focus";

export interface ParallaxHeroImagesProps {
  /** Up to 8 image URLs placed around the hero's edges. Defaults to 8 generated placeholders. */
  images?: string[];
  /** Depth-mapping mode — which images read as "closest". Defaults to `"default"`. */
  variant?: ParallaxHeroImagesVariant;
  /** Centered headline. Defaults to a short demo line. */
  headline?: string;
  /** Supporting subtext beneath the headline. Defaults to a short demo line. */
  subtitle?: string;
  /** Maximum travel distance, in px, for the closest depth tier at full pointer excursion. Defaults to `40`. */
  maxOffset?: number;
  /** Lerp factor (0-1, higher = snappier) easing each image's displayed offset toward its target every frame. Defaults to `0.12`. */
  smoothing?: number;
  /** Passthrough style merged onto each image wrapper. */
  imageStyle?: StyleObject;
  /** Passthrough style merged onto the outer section. */
  style?: StyleObject;
}

type PositionTier = "edge" | "middle";

interface HeroImageSlot {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  widthPercent: number;
  restRotateDeg: number;
  tier: PositionTier;
}

// Two loose rows of 4, scattered around the edges with generous whitespace
// left for the centered headline — outermost slots per row are "edge",
// the two nearer the middle are "middle".
const SLOTS: HeroImageSlot[] = [
  { top: "4%", left: "2%", widthPercent: 20, restRotateDeg: -6, tier: "edge" },
  { top: "1%", left: "25%", widthPercent: 17, restRotateDeg: 3, tier: "middle" },
  { top: "1%", right: "25%", widthPercent: 17, restRotateDeg: -3, tier: "middle" },
  { top: "4%", right: "2%", widthPercent: 20, restRotateDeg: 6, tier: "edge" },
  { bottom: "5%", left: "4%", widthPercent: 19, restRotateDeg: 5, tier: "edge" },
  { bottom: "1%", left: "27%", widthPercent: 16, restRotateDeg: -4, tier: "middle" },
  { bottom: "1%", right: "27%", widthPercent: 16, restRotateDeg: 4, tier: "middle" },
  { bottom: "5%", right: "4%", widthPercent: 19, restRotateDeg: -5, tier: "edge" },
];

const CLOSE_DEPTH_FACTOR = 1;
const FAR_DEPTH_FACTOR = 0.35;

function depthFactorFor(tier: PositionTier, variant: ParallaxHeroImagesVariant): number {
  if (variant === "edge-focus") return tier === "edge" ? CLOSE_DEPTH_FACTOR : FAR_DEPTH_FACTOR;
  return tier === "middle" ? CLOSE_DEPTH_FACTOR : FAR_DEPTH_FACTOR;
}

function buildDefaultImages(): string[] {
  return Array.from(
    { length: 8 },
    (_unused, index) => `https://picsum.photos/seed/domphy-parallax-hero-${index + 1}/480/320`,
  );
}

/**
 * A hero section with up to 8 screenshot-style images scattered around a
 * centered headline that drift at different speeds as the pointer moves.
 * Call with no arguments for a working demo — 8 generated placeholder
 * mockups around a short demo headline.
 */
function parallaxHeroImages(props: ParallaxHeroImagesProps = {}): DomphyElement<"section"> {
  const images = (props.images && props.images.length > 0 ? props.images : buildDefaultImages()).slice(0, 8);
  const variant = props.variant ?? "default";
  const headlineText = props.headline ?? "Built for teams who ship fast.";
  const subtitleText = props.subtitle ?? "Every screenshot on this page is a live product, not a mockup.";
  const maxOffset = Math.max(0, props.maxOffset ?? 40);
  const smoothing = Math.min(1, Math.max(0.01, props.smoothing ?? 0.12));

  const imageRefs: Array<HTMLElement | null> = new Array(images.length).fill(null);
  const currentX = new Float32Array(images.length);
  const currentY = new Float32Array(images.length);

  function imageWrapper(src: string, index: number): DomphyElement<"div"> {
    const slot = SLOTS[index % SLOTS.length];
    return {
      div: [
        {
          img: null,
          src,
          alt: "",
          loading: "lazy",
          _doctorDisable: "missing-color",
          style: { display: "block", width: "100%", aspectRatio: "3 / 2", objectFit: "cover" } as StyleObject,
        } as DomphyElement,
      ],
      _key: `parallax-hero-image-${index}`,
      _onMount: (node: ElementNode) => {
        imageRefs[index] = node.domElement as HTMLElement;
      },
      _onRemove: () => {
        imageRefs[index] = null;
      },
      style: {
        position: "absolute",
        top: slot.top,
        bottom: slot.bottom,
        left: slot.left,
        right: slot.right,
        width: `${slot.widthPercent}%`,
        overflow: "hidden",
        borderRadius: themeSpacing(3),
        willChange: "transform",
        transform: `rotate(${slot.restRotateDeg}deg)`,
        backgroundColor: (listener) => themeColor(listener, "inherit"),
        color: (listener) => themeColor(listener, "shift-9"),
        outline: (listener) => `1px solid ${themeColor(listener, "shift-4")}`,
        outlineOffset: "-1px",
        boxShadow: (listener) => `0 ${themeSpacing(2)} ${themeSpacing(6)} ${themeColor(listener, "shift-13")}`,
        ...(props.imageStyle ?? {}),
      } as StyleObject,
    };
  }

  const imageElements = images.map((src, index) => imageWrapper(src, index));

  return {
    section: [
      ...imageElements,
      {
        div: [
          { h1: headlineText, $: [heading()] } as DomphyElement,
          { p: subtitleText, $: [paragraph()] } as DomphyElement,
        ],
        style: {
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          maxWidth: themeSpacing(140),
          marginInline: "auto",
        } as StyleObject,
      } as DomphyElement<"div">,
    ],
    dataTone: "shift-1",
    style: {
      position: "relative",
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: themeSpacing(140),
      borderRadius: themeSpacing(4),
      padding: themeSpacing(10),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined") return;
      const sectionElement = node.domElement as HTMLElement;

      let targetX = 0;
      let targetY = 0;
      let animationFrameId: number | null = null;
      let intersectionObserver: IntersectionObserver | null = null;

      function tick(): void {
        // Belt-and-suspenders stop condition: some hosts (e.g. a test harness
        // that wipes the DOM directly instead of going through the
        // framework's removal lifecycle) never fire the "Remove" hook below.
        // Bailing here once the section is detached prevents the loop from
        // leaking forever across unrelated later tests.
        if (!sectionElement.isConnected) return;
        let stillMoving = false;
        for (let index = 0; index < imageRefs.length; index += 1) {
          const element = imageRefs[index];
          if (!element) continue;
          const slot = SLOTS[index % SLOTS.length];
          const depthFactor = depthFactorFor(slot.tier, variant);
          const desiredX = targetX * maxOffset * depthFactor;
          const desiredY = targetY * maxOffset * depthFactor;
          currentX[index] += (desiredX - currentX[index]) * smoothing;
          currentY[index] += (desiredY - currentY[index]) * smoothing;
          if (Math.abs(desiredX - currentX[index]) > 0.05 || Math.abs(desiredY - currentY[index]) > 0.05) {
            stillMoving = true;
          }
          element.style.transform = `translate3d(${currentX[index].toFixed(2)}px, ${currentY[index].toFixed(2)}px, 0) rotate(${slot.restRotateDeg}deg)`;
        }
        animationFrameId = stillMoving || targetX !== 0 || targetY !== 0 ? window.requestAnimationFrame(tick) : null;
      }

      function ensureLoopRunning(): void {
        if (animationFrameId === null) animationFrameId = window.requestAnimationFrame(tick);
      }

      function handlePointerMove(event: PointerEvent): void {
        const rect = sectionElement.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
        ensureLoopRunning();
      }
      function handlePointerLeave(): void {
        targetX = 0;
        targetY = 0;
        ensureLoopRunning();
      }

      sectionElement.addEventListener("pointermove", handlePointerMove);
      sectionElement.addEventListener("pointerleave", handlePointerLeave);

      if (typeof IntersectionObserver === "function") {
        intersectionObserver = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) {
              targetX = 0;
              targetY = 0;
            }
          }
        });
        intersectionObserver.observe(sectionElement);
      }

      node.addHook("Remove", () => {
        sectionElement.removeEventListener("pointermove", handlePointerMove);
        sectionElement.removeEventListener("pointerleave", handlePointerLeave);
        intersectionObserver?.disconnect();
        if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
      });
    },
  };
}

export { parallaxHeroImages };
