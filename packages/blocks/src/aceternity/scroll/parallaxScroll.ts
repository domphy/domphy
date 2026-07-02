// Aceternity UI "Parallax Scroll" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied). A
// responsive image grid split into two or three vertical columns that
// translate up/down at different rates as the page scrolls past the
// section, producing a layered parallax depth effect. Purely a decorative
// photo mosaic — no text overlays, and no click interaction beyond the
// optional `onImageClick` hook.
//
// Images are round-robin distributed into a fixed set of DOM columns (the
// same "pre-split into N literal arrays" idiom the reference component
// uses, rather than re-bucketing the DOM on resize); each column's own
// `translateY` range alternates direction from its neighbors (up/down/up).
// Column *count* still reads as responsive because the grid's CSS
// `grid-template-columns` steps from 1 (mobile) to 2 (tablet) to the full
// column count (desktop) via `@media` — narrower viewports simply stack the
// same column `<div>`s as full-width rows instead of re-splitting `images`.
//
// Scroll progress is this section's own enter/exit fraction — 0 when its
// top reaches the viewport's bottom edge, 1 when its bottom reaches the
// viewport's top edge — the same `getBoundingClientRect()` math this
// package's `googleGeminiEffect`/`heroParallax` use for their own
// scroll-through ribbons/grids. It is rAF-lerped toward that raw target
// (the same smoothing idiom `scrollProgress`/`textReveal` use) so the
// columns lag slightly behind raw scroll instead of snapping 1:1, reading
// as a light spring/damping trail. Each column's DOM node is written to
// directly every frame (`element.style.transform = ...`) rather than routed
// through reactive `State` — this section can hold dozens of images across
// several columns, and a single shared rAF loop writing `transform` in
// place is far cheaper than re-running per-image reactive style functions
// every tick.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";

export interface ParallaxScrollImage {
  src: string;
  alt?: string;
}

export interface ParallaxScrollProps {
  /** Photos to distribute round-robin across the columns. Defaults to 15 generated placeholders. */
  images?: (string | ParallaxScrollImage)[];
  /** Number of DOM columns. Clamped to 1–6. Defaults to `3` (CSS steps it down
   * to 2 on tablet and 1 on mobile regardless of this value). */
  columns?: number;
  /** Gap between images (within a column) and between columns, in `themeSpacing` units. Defaults to `4`. */
  gap?: number;
  /** CSS `aspect-ratio` every image is cropped to via `object-fit: cover`. Defaults to `"3 / 4"`. */
  aspectRatio?: string;
  /** Maximum `translateY` distance any column travels, in px, at full scroll progress. Defaults to `200`. */
  intensity?: number;
  /** rAF lerp factor (0–1) smoothing the raw scroll target; higher catches up faster. Defaults to `0.15`. */
  smoothing?: number;
  /** Called when an image is clicked/tapped, with the image and its flat index in `images`. */
  onImageClick?: (image: ParallaxScrollImage, index: number) => void;
  /** Passthrough style merged onto the outer section. */
  style?: StyleObject;
}

const DEFAULT_IMAGE_COUNT = 15;

function buildDefaultImages(): ParallaxScrollImage[] {
  return Array.from({ length: DEFAULT_IMAGE_COUNT }, (_unused, index) => ({
    src: `https://picsum.photos/seed/domphy-parallax-${index + 1}/480/640`,
    alt: `Parallax gallery photo ${index + 1}`,
  }));
}

function normalizeImage(image: string | ParallaxScrollImage): ParallaxScrollImage {
  return typeof image === "string" ? { src: image } : image;
}

/** This section's own scroll-through fraction: 0 when its top reaches the viewport's
 * bottom edge, 1 when its bottom reaches the viewport's top edge. */
function computeSectionScrollFraction(element: HTMLElement): number {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
  const totalTravel = rect.height + viewportHeight;
  const traveled = viewportHeight - rect.top;
  const raw = totalTravel > 0 ? traveled / totalTravel : 0;
  return Math.min(1, Math.max(0, raw));
}

interface ColumnRuntime {
  element: HTMLElement | null;
  direction: 1 | -1;
}

/**
 * A responsive, scroll-driven parallax photo mosaic — columns of images that
 * drift up/down at alternating rates as the section scrolls through the
 * viewport, with no click required (an optional `onImageClick` is the only
 * interactive hook). Call with no arguments for a working demo — 15
 * generated placeholder photos across 3 columns.
 */
function parallaxScroll(props: ParallaxScrollProps = {}): DomphyElement<"section"> {
  const images = (props.images && props.images.length > 0 ? props.images : buildDefaultImages()).map(normalizeImage);
  const columnCount = Math.min(6, Math.max(1, Math.round(props.columns ?? 3)));
  const gap = props.gap ?? 4;
  const aspectRatio = props.aspectRatio ?? "3 / 4";
  const intensity = props.intensity ?? 200;
  const smoothing = Math.min(1, Math.max(0.01, props.smoothing ?? 0.15));
  const onImageClick = props.onImageClick;

  const columnImages: ParallaxScrollImage[][] = Array.from({ length: columnCount }, () => []);
  images.forEach((image, index) => columnImages[index % columnCount].push(image));

  const runtimes: ColumnRuntime[] = columnImages.map((_unused, index) => ({
    element: null,
    direction: index % 2 === 0 ? -1 : 1,
  }));

  function imageElement(image: ParallaxScrollImage, columnIndex: number, imageIndex: number): DomphyElement<"img"> {
    const clickable = typeof onImageClick === "function";
    return {
      img: null,
      src: image.src,
      alt: image.alt ?? "",
      loading: "lazy",
      _key: `parallax-image-${columnIndex}-${imageIndex}`,
      // A purely decorative photo tile with no text of its own — exempt from
      // the missing-color contract, same idiom as `iphone.ts`'s bare `<img>`
      // screen media (no themed text ever lives on an `<img>`).
      _doctorDisable: "missing-color",
      ...(clickable ? { onClick: () => onImageClick!(image, columnIndex + imageIndex * columnCount), role: "button", tabindex: 0 } : {}),
      style: {
        display: "block",
        width: "100%",
        aspectRatio,
        objectFit: "cover",
        borderRadius: themeSpacing(3),
        boxShadow: (listener: Listener) => `0 ${themeSpacing(2)} ${themeSpacing(6)} ${themeColor(listener, "shift-17")}`,
        ...(clickable ? { cursor: "pointer" } : {}),
      } as StyleObject,
    } as DomphyElement<"img">;
  }

  function columnElement(columnIndex: number): DomphyElement<"div"> {
    return {
      div: columnImages[columnIndex].map((image, imageIndex) => imageElement(image, columnIndex, imageIndex)),
      _key: `parallax-column-${columnIndex}`,
      _onMount: (node: ElementNode) => {
        runtimes[columnIndex].element = node.domElement as HTMLElement;
      },
      _onRemove: () => {
        runtimes[columnIndex].element = null;
      },
      style: {
        display: "flex",
        flexDirection: "column",
        gap: themeSpacing(gap),
        willChange: "transform",
      } as StyleObject,
    };
  }

  return {
    section: [
      {
        div: Array.from({ length: columnCount }, (_unused, index) => columnElement(index)),
        style: {
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: themeSpacing(gap),
          "@media (min-width: 40em)": {
            gridTemplateColumns: columnCount >= 2 ? "repeat(2, 1fr)" : "1fr",
          },
          "@media (min-width: 64em)": {
            gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
          },
        } as StyleObject,
      } as DomphyElement<"div">,
    ],
    dataTone: "shift-16",
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") return;
      const sectionElement = node.domElement as HTMLElement;

      let currentProgress = computeSectionScrollFraction(sectionElement);
      let targetProgress = currentProgress;
      let isAnimating = false;
      let animationFrameHandle = 0;

      function paint(progress: number): void {
        for (const runtime of runtimes) {
          if (!runtime.element) continue;
          const offset = runtime.direction * intensity * progress;
          runtime.element.style.transform = `translateY(${offset.toFixed(1)}px)`;
        }
      }
      paint(currentProgress);

      function step(): void {
        // Belt-and-suspenders stop condition: some hosts (e.g. a test harness
        // that wipes the DOM directly instead of going through the framework's
        // removal lifecycle) never fire the "Remove" hook below. Bailing here
        // once the node is detached prevents the window scroll/resize
        // listeners from resurrecting this loop forever.
        if (!sectionElement.isConnected) return;
        currentProgress += (targetProgress - currentProgress) * smoothing;
        if (Math.abs(targetProgress - currentProgress) < 0.001) {
          currentProgress = targetProgress;
          paint(currentProgress);
          isAnimating = false;
          return;
        }
        paint(currentProgress);
        animationFrameHandle = window.requestAnimationFrame(step);
      }

      function handleScroll(): void {
        targetProgress = computeSectionScrollFraction(sectionElement);
        if (!isAnimating) {
          isAnimating = true;
          animationFrameHandle = window.requestAnimationFrame(step);
        }
      }

      window.addEventListener("scroll", handleScroll, { passive: true });
      window.addEventListener("resize", handleScroll, { passive: true });

      node.addHook("Remove", () => {
        window.removeEventListener("scroll", handleScroll);
        window.removeEventListener("resize", handleScroll);
        if (animationFrameHandle) window.cancelAnimationFrame(animationFrameHandle);
      });
    },
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      padding: themeSpacing(8),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { parallaxScroll };
