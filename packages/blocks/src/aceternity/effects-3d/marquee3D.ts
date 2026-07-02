// Aceternity UI "3D Marquee" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A
// hero-section grid of images split into several vertical columns that
// scroll infinitely, tilted into an isometric 3D perspective, with
// alternating columns drifting in opposite directions.
//
// Pure CSS, no animation-frame loop: a single fixed `perspective()` +
// `rotateX/rotateY/rotateZ` transform tilts the whole grid wrapper once
// (applied inline, never re-computed), and each column independently loops
// its own repeated image stack via the same "translate the track by exactly
// one repeated group's length" trick this package's own `marquee.ts` uses
// for its horizontal/vertical strip — since every repeated group is
// identical, the loop point is imperceptible. Alternating columns just flip
// `animation-direction` to `reverse` (rather than negating the keyframe
// itself) and get a small negative `animation-delay` offset so they don't
// all start their loop in lockstep.
//
// The optional overlay grid lines are a co-planar decorative child *inside*
// the tilted wrapper (not a separate un-rotated layer), so they visually
// tilt along with the image plane for free — a plain descendant of a
// transformed element renders inside that element's transformed coordinate
// space, no `transform-style: preserve-3d`/per-child transform needed. The
// optional hero heading overlay is the opposite: a sibling of the tilted
// wrapper, deliberately left un-rotated so its text stays flat and legible
// on top of the tilted grid.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";
import { themeColor, themeSpacing } from "@domphy/theme";

export interface Marquee3DImage {
  src: string;
  alt?: string;
}

export interface Marquee3DProps {
  /** Pool of images distributed round-robin across the columns. Defaults to 12 generated placeholders. */
  images?: Array<string | Marquee3DImage>;
  /** Number of vertical columns. Defaults to `4`. */
  columns?: number;
  /** Overlay content rendered flat (un-rotated) above the tilted grid — the hero-banner heading variant. Pass `null` to omit it entirely. Defaults to a short demo headline. */
  overlay?: DomphyElement | DomphyElement[] | null;
  /** Shows the faint overlay grid-line decoration co-tilted with the image plane. Defaults to `true`. */
  showGridLines?: boolean;
  /** Horizontal spacing between grid lines, in px (matches the reference component's own documented default). Defaults to `200`. */
  lineOffsetX?: number;
  /** Vertical spacing between grid lines, in px (matches the reference component's own documented default). Defaults to `150`. */
  lineOffsetY?: number;
  /** Seconds per full column loop. Defaults to `36`. */
  duration?: number;
  /** Gap between stacked tiles within a column, in `themeSpacing` units. Defaults to `3`. */
  gap?: number;
  /** Each tile's rendered height, in `themeSpacing` units. Defaults to `56`. */
  tileHeight?: number;
  /** Overall grid area height, in `themeSpacing` units. Defaults to `140`. */
  areaHeight?: number;
  /** Tilt rotation around the X axis, in deg. Defaults to `55`. */
  rotateXDegrees?: number;
  /** Tilt rotation around the Y axis, in deg. Defaults to `0`. */
  rotateYDegrees?: number;
  /** Tilt rotation around the Z axis, in deg. Defaults to `-45`. */
  rotateZDegrees?: number;
  /** CSS `perspective()` distance, in px. Defaults to `1400`. */
  perspectiveDistance?: number;
  /** Extra class name merged onto the outer perspective container's native `class` attribute. */
  className?: string;
  /** Extra class name merged onto every image tile's native `class` attribute. */
  imageClassName?: string;
  /** Passthrough style merged onto the outer perspective container. */
  style?: StyleObject;
}

const DEFAULT_IMAGE_COUNT = 12;
// Repeating each column's image set this many times guarantees the track is
// always taller than its own single-group height, so the seamless loop
// (translate by exactly one group) never reveals a gap.
const COLUMN_REPEAT_COUNT = 3;

let marquee3DInstanceCounter = 0;

function buildDefaultImages(): Marquee3DImage[] {
  return Array.from({ length: DEFAULT_IMAGE_COUNT }, (_unused, index) => ({
    src: `https://picsum.photos/seed/domphy-marquee3d-${index + 1}/480/600`,
    alt: "",
  }));
}

function defaultOverlay(): DomphyElement[] {
  return [
    { h1: "A wall of work, tilted into view", $: [heading()] } as DomphyElement,
    {
      p: "Every column loops on its own, drifting past in alternating directions.",
      $: [paragraph()],
    } as DomphyElement,
  ];
}

/** Splits `items` round-robin across `columnCount` buckets so each column gets a varied mix. */
function distributeRoundRobin<T>(items: T[], columnCount: number): T[][] {
  const buckets: T[][] = Array.from({ length: columnCount }, () => []);
  items.forEach((item, index) => buckets[index % columnCount].push(item));
  return buckets;
}

function columnTrack(
  images: Marquee3DImage[],
  columnIndex: number,
  duration: number,
  gapUnits: number,
  tileHeightUnits: number,
  imageClassName: string | undefined,
  instanceId: number,
): DomphyElement<"div"> {
  const reverse = columnIndex % 2 === 1;
  const stack: DomphyElement[] = [];
  for (let repeat = 0; repeat < COLUMN_REPEAT_COUNT; repeat++) {
    images.forEach((image, imageIndex) => {
      stack.push({
        img: null,
        src: image.src,
        alt: image.alt ?? "",
        loading: "lazy",
        _key: `marquee3d-tile-${columnIndex}-${repeat}-${imageIndex}`,
        // Duplicate repeats after the first exist purely for the seamless
        // loop — screen readers should only announce each image once.
        ariaHidden: repeat === 0 ? undefined : "true",
        _doctorDisable: "missing-color",
        class: imageClassName,
        style: {
          display: "block",
          width: "100%",
          height: themeSpacing(tileHeightUnits),
          objectFit: "cover",
          borderRadius: themeSpacing(2),
          flexShrink: 0,
        } as StyleObject,
      } as DomphyElement);
    });
  }

  const keyframes = {
    from: { transform: "translateY(0)" },
    to: { transform: `translateY(calc(-100% / ${COLUMN_REPEAT_COUNT}))` },
  };
  const animationName = `marquee3d-col-${instanceId}-${hashString(JSON.stringify({ columnIndex, duration }))}`;
  // Negative delays start each column mid-loop instead of at the same
  // shared origin, so neighboring columns never visually sync up.
  const delaySeconds = -((columnIndex * duration) / (COLUMN_REPEAT_COUNT * 2));

  return {
    div: [
      {
        div: stack,
        style: {
          display: "flex",
          flexDirection: "column",
          gap: themeSpacing(gapUnits),
          animation: `${animationName} ${duration}s linear infinite ${reverse ? "reverse" : "normal"}`,
          animationDelay: `${delaySeconds.toFixed(2)}s`,
          [`@keyframes ${animationName}`]: keyframes,
        } as StyleObject,
      } as DomphyElement,
    ],
    _key: `marquee3d-column-${columnIndex}`,
    style: {
      flex: "1 1 0",
      overflow: "hidden",
    } as StyleObject,
  };
}

/** Faint overlay grid lines, co-planar with (and thus tilted along with) the image columns. */
function gridLinesLayer(lineOffsetXUnits: number, lineOffsetYUnits: number): DomphyElement<"div"> {
  return {
    div: null,
    ariaHidden: "true",
    // Decorative line overlay with no text of its own — exempt from the
    // missing-color contract, matching this package's other purely
    // decorative background layers (e.g. `heroHighlight.ts`'s dot grid).
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: themeSpacing(-16),
      pointerEvents: "none",
      backgroundImage: (listener: Listener) =>
        `linear-gradient(to right, ${themeColor(listener, "shift-4")} 1px, transparent 1px), ` +
        `linear-gradient(to bottom, ${themeColor(listener, "shift-4")} 1px, transparent 1px)`,
      backgroundSize: `${themeSpacing(lineOffsetXUnits)} ${themeSpacing(lineOffsetYUnits)}`,
    } as StyleObject,
  } as DomphyElement<"div">;
}

/**
 * A hero-section grid of images split into several vertical columns that
 * scroll infinitely and continuously, tilted into an isometric 3D
 * perspective. Call with no arguments for a working demo — 4 columns of
 * generated placeholder images looping under a hero headline overlay.
 */
function marquee3D(props: Marquee3DProps = {}): DomphyElement<"div"> {
  const instanceId = ++marquee3DInstanceCounter;
  const sourceImages: Marquee3DImage[] =
    props.images && props.images.length > 0
      ? props.images.map((image) => (typeof image === "string" ? { src: image } : image))
      : buildDefaultImages();
  const columnCount = Math.max(2, Math.round(props.columns ?? 4));
  const overlayContent =
    props.overlay === null ? [] : (props.overlay ?? defaultOverlay());
  const overlayChildren = Array.isArray(overlayContent) ? overlayContent : [overlayContent];
  const showGridLines = props.showGridLines ?? true;
  // Documented upstream defaults (200px / 150px) — converted to
  // `themeSpacing` units (spacing unit N ≈ 4px at the base font size) so the
  // grid still scales with theme density rather than staying pixel-locked.
  const lineOffsetXUnits = (props.lineOffsetX ?? 200) / 4;
  const lineOffsetYUnits = (props.lineOffsetY ?? 150) / 4;
  const duration = Math.max(6, props.duration ?? 36);
  const gapUnits = props.gap ?? 3;
  const tileHeightUnits = props.tileHeight ?? 56;
  const areaHeightUnits = props.areaHeight ?? 140;
  const rotateXDegrees = props.rotateXDegrees ?? 55;
  const rotateYDegrees = props.rotateYDegrees ?? 0;
  const rotateZDegrees = props.rotateZDegrees ?? -45;
  const perspectiveDistance = props.perspectiveDistance ?? 1400;

  const columnBuckets = distributeRoundRobin(sourceImages, columnCount);

  const tiltedGrid: DomphyElement<"div"> = {
    div: [
      ...columnBuckets.map((bucket, columnIndex) =>
        columnTrack(bucket, columnIndex, duration, gapUnits, tileHeightUnits, props.imageClassName, instanceId),
      ),
      ...(showGridLines ? [gridLinesLayer(lineOffsetXUnits, lineOffsetYUnits)] : []),
    ],
    style: {
      position: "relative",
      display: "flex",
      gap: themeSpacing(gapUnits),
      width: "100%",
      height: "100%",
      transform: `rotateX(${rotateXDegrees}deg) rotateY(${rotateYDegrees}deg) rotateZ(${rotateZDegrees}deg)`,
      transformOrigin: "50% 50%",
    } as StyleObject,
  };

  const overlayLayer: DomphyElement<"div"> | null =
    overlayChildren.length > 0
      ? ({
          div: overlayChildren,
          style: {
            position: "absolute",
            inset: 0,
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            gap: themeSpacing(3),
            paddingInline: themeSpacing(8),
            pointerEvents: "none",
            background: (listener: Listener) =>
              `radial-gradient(ellipse at center, color-mix(in srgb, ${themeColor(listener)} 65%, transparent), transparent 70%)`,
            color: (listener: Listener) => themeColor(listener, "shift-9"),
          } as StyleObject,
        } as DomphyElement<"div">)
      : null;

  return {
    div: [tiltedGrid, ...(overlayLayer ? [overlayLayer] : [])],
    class: props.className,
    dataTone: "shift-16",
    style: {
      position: "relative",
      overflow: "hidden",
      height: themeSpacing(areaHeightUnits),
      borderRadius: themeSpacing(4),
      perspective: `${perspectiveDistance}px`,
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { marquee3D };
