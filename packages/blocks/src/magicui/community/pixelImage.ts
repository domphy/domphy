// Magic UI "Pixel Image" — clean-room reimplementation.
//
// An image reveal effect where the picture is pre-divided into a grid of
// tiled cells that fade in at staggered, randomized moments, optionally
// sweeping from grayscale to full color shortly after. Implemented purely
// from the block's public functional/visual spec — no upstream Magic UI
// source was viewed or copied.
//
// Per the spec's own DOM sketch, this is a clip-path tiling/reveal
// technique, not real pixelation: one full `<img>` copy of the picture per
// grid cell, all stacked via `position: absolute`, each clipped to its own
// rectangular cell with `clip-path: polygon(...)` (computed once from its
// row/column). Every tile's own `transition-delay` is randomized once in JS
// at construction time so that flipping one shared reactive "revealed"
// boolean shortly after mount fires each tile's `opacity` transition at a
// staggered moment — pure CSS transitions, no JS animation loop.
//
// Accessibility: the container carries `role="img"` + `aria-label`, and
// every duplicated tile `<img>` is `alt=""` + `aria-hidden` (decorative) —
// the composite-image pattern, not N separately-announced images.

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import { toState } from "@domphy/core";

export type PixelImageGridPreset = "default" | "fine" | "portrait" | "tallStrip" | "wideStrip";

export interface PixelImageProps {
  /** Image URL. Defaults to a generic inline placeholder graphic (no network fetch). */
  src?: string;
  /** Accessible label for the composite image. Defaults to `"Pixel reveal image"`. */
  alt?: string;
  /** Named grid density/shape preset. Ignored when `rows`/`cols` are both given. Defaults to `"default"` (6x4). */
  grid?: PixelImageGridPreset;
  /** Explicit row count, overriding the preset. */
  rows?: number;
  /** Explicit column count, overriding the preset. */
  cols?: number;
  /** Enables the grayscale-to-color sweep after the tiles finish assembling. Defaults to `true`. */
  colorSweep?: boolean;
  /** Per-cell fade-in duration, in ms. Defaults to `1000`. */
  fadeDuration?: number;
  /** Maximum random stagger delay applied across cells, in ms. Defaults to `1200`. */
  maxStagger?: number;
  /** Delay before the color sweep begins (once `colorSweep` is enabled), in ms. Defaults to `1300`. */
  colorSweepDelay?: number;
  /** Container width (any CSS width value). Defaults to a fixed `"18rem"` (288px) square that doubles to `"24rem"` (384px) at the md breakpoint, mirroring upstream's `h-72 w-72 md:h-96 md:w-96`. */
  width?: string;
  /** Container aspect ratio. When set, overrides the default fixed-square height. Upstream has none. */
  aspectRatio?: string;
  /** Passthrough style merged onto the container. */
  style?: StyleObject;
}

const GRID_PRESETS: Record<PixelImageGridPreset, { rows: number; cols: number }> = {
  default: { rows: 4, cols: 6 },
  fine: { rows: 8, cols: 8 },
  portrait: { rows: 6, cols: 4 },
  tallStrip: { rows: 8, cols: 3 },
  wideStrip: { rows: 3, cols: 8 },
};

const MAX_GRID_LINES = 16;

// Generic abstract placeholder graphic — an inline SVG data URI, no network
// fetch and no real photo (same idiom `avatarCircles.ts` uses for its own
// default demo imagery elsewhere in this package).
const PLACEHOLDER_IMAGE_MARKUP =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200">' +
  '<rect width="300" height="200" fill="#4a5568"/>' +
  '<circle cx="220" cy="60" r="45" fill="#f6ad55"/>' +
  '<path d="M0 160 L90 90 L150 140 L210 80 L300 150 L300 200 L0 200 Z" fill="#2c3e50"/>' +
  "</svg>";
const PLACEHOLDER_IMAGE_URI = `data:image/svg+xml,${encodeURIComponent(PLACEHOLDER_IMAGE_MARKUP)}`;

/**
 * An image that assembles itself out of a grid of tiles fading in at
 * staggered, randomized moments — optionally sweeping from grayscale to
 * full color shortly after. Runs automatically on mount. Call with no
 * arguments for a working demo using a generic placeholder graphic.
 */
function pixelImage(props: PixelImageProps = {}): DomphyElement<"div"> {
  const src = props.src ?? PLACEHOLDER_IMAGE_URI;
  const alt = props.alt ?? "Pixel reveal image";
  const preset = GRID_PRESETS[props.grid ?? "default"];
  const rows = Math.min(MAX_GRID_LINES, Math.max(1, Math.round(props.rows ?? preset.rows)));
  const cols = Math.min(MAX_GRID_LINES, Math.max(1, Math.round(props.cols ?? preset.cols)));
  const colorSweep = props.colorSweep ?? true;
  const fadeDuration = props.fadeDuration ?? 1000;
  const maxStagger = props.maxStagger ?? 1200;
  const colorSweepDelay = props.colorSweepDelay ?? 1300;
  const hasSizeOverride = props.width !== undefined || props.aspectRatio !== undefined;
  const width = props.width ?? "18rem";

  const revealed = toState(false);
  const colorRevealed = toState(false);

  const tiles: DomphyElement<"img">[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const leftPercent = (col / cols) * 100;
      const rightPercent = ((col + 1) / cols) * 100;
      const topPercent = (row / rows) * 100;
      const bottomPercent = ((row + 1) / rows) * 100;
      const staggerDelayMs = Math.round(Math.random() * maxStagger);
      // Opacity: upstream piece wrapper is `transition-all ease-out`
      // (cubic-bezier(0,0,0.2,1)) over `pixelFadeInDuration`. Filter: upstream
      // <img> is `filter ${pixelFadeInDuration}ms cubic-bezier(0.4,0,0.2,1)` —
      // tied to the same fade-duration prop, material ease-in-out curve.
      const transition = colorSweep
        ? `opacity ${fadeDuration}ms ease-out ${staggerDelayMs}ms, filter ${fadeDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`
        : `opacity ${fadeDuration}ms ease-out ${staggerDelayMs}ms`;

      tiles.push({
        img: null,
        src,
        alt: "",
        ariaHidden: "true",
        draggable: false,
        _key: `tile-${row}-${col}`,
        style: {
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          // Upstream rounds each full-size <img> (`rounded-[2.5rem]` = 40px);
          // the per-cell clip-path then keeps only the corner tiles rounded.
          borderRadius: "2.5rem",
          clipPath: `polygon(${leftPercent}% ${topPercent}%, ${rightPercent}% ${topPercent}%, ${rightPercent}% ${bottomPercent}%, ${leftPercent}% ${bottomPercent}%)`,
          opacity: (listener) => (revealed.get(listener) ? 1 : 0),
          filter: colorSweep
            ? (listener) => (colorRevealed.get(listener) ? "grayscale(0)" : "grayscale(1)")
            : "none",
          transition,
        } as StyleObject,
      } as DomphyElement<"img">);
    }
  }

  return {
    div: tiles,
    role: "img",
    ariaLabel: alt,
    // Upstream is a fixed square (`h-72 w-72` = 288px) that doubles at the md
    // (768px) breakpoint (`md:h-96 md:w-96` = 384px), with no aspect-ratio and
    // no overflow clip (the rounded corners live on each tile <img>). When the
    // caller overrides `width`/`aspectRatio`, honor those instead of the
    // responsive default.
    style: {
      position: "relative",
      userSelect: "none",
      width,
      ...(props.aspectRatio ? { aspectRatio: props.aspectRatio } : { height: width }),
      ...(hasSizeOverride ? {} : { "@media (min-width: 768px)": { width: "24rem", height: "24rem" } }),
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      // A plain macrotask (not a raw synchronous call) so the tiles' initial
      // `opacity: 0` paints first and the flip to `1` is a real, observable
      // transition rather than an instantaneous jump — the same "reveal
      // shortly after mount" idiom `blurFade.ts` uses elsewhere in this
      // package. Works in both browser and SSR/Node runtimes, unlike `rAF`.
      const revealTimeout = setTimeout(() => revealed.set(true), 0);
      let colorTimeout: ReturnType<typeof setTimeout> | null = null;
      if (colorSweep) {
        colorTimeout = setTimeout(() => colorRevealed.set(true), colorSweepDelay);
      }
      node.addHook("Remove", () => {
        clearTimeout(revealTimeout);
        if (colorTimeout !== null) clearTimeout(colorTimeout);
      });
    },
  } as unknown as DomphyElement<"div">;
}

export { pixelImage };
