// Aceternity UI "Images Badge" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A small
// pill-like badge — folder icon plus a label — that fans up to three hidden
// preview images out above it like a hand of cards on hover.
//
// Pure CSS, no JS pointer handlers: the whole fan-out is driven by nested
// `&:hover [data-*]` selectors on the badge's own style object, the same
// technique `interactiveHoverButton.ts` uses for its own hover flood/swap —
// hover-in and hover-out both animate through the browser's native `:hover`
// transition engine with one shared eased duration, no timers to clean up.
//
// Resting state overlaps each thumbnail behind the folder icon (a shared
// `position: relative` wrapper with the thumbnail layer painted *before* the
// folder icon, so the folder's own background naturally covers most of each
// thumbnail) with only a small bottom-anchored slice left visible above the
// folder's top edge — the "tiny sliver" teaser the spec calls out. On hover
// each thumbnail's `transform` swaps to a larger `translate/rotate` combo
// that both clears the folder and staggers left/right with alternating
// rotation, reading as a fanned hand of photos.
//
// This package's grammar has no `className`/CSS-file concept — the spec's
// `className` prop becomes the `style` passthrough Domphy components use
// throughout this package instead.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { small } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface ImagesBadgeProps {
  /** Badge label text. Defaults to `"Photos"`. */
  label?: string;
  /** Up to 3 preview image URLs, revealed on hover. Defaults to 3 generated placeholders. */
  images?: string[];
  /** Optional link target — when set, the whole badge renders as an anchor. */
  href?: string;
  /** Anchor `target`, only meaningful alongside `href`. */
  target?: string;
  /** Theme color family for the folder glyph. Defaults to `"warning"` (this theme's closest built-in family to manila amber). */
  folderColor?: ThemeColor;
  /** Folder icon size, in px. Defaults to `{ width: 32, height: 24 }`. */
  folderIconSize?: { width: number; height: number };
  /** Resting-state teaser thumbnail size, in px. Defaults to `{ width: 20, height: 14 }`. */
  teaserImageSize?: { width: number; height: number };
  /** Fanned-out hover thumbnail size, in px. Defaults to `{ width: 48, height: 32 }`. */
  hoverImageSize?: { width: number; height: number };
  /** Upward translate distance on hover, in px (negative = up). Defaults to `-35`. */
  hoverTranslateY?: number;
  /** Horizontal spread distance per fan position, in px. Defaults to `20`. */
  spreadX?: number;
  /** Fan rotation angle per position, in deg. Defaults to `15`. */
  rotateDeg?: number;
  /** Passthrough style merged onto the outer badge. */
  style?: StyleObject;
}

const DEFAULT_IMAGES = [
  "https://picsum.photos/seed/domphy-images-badge-1/200/140",
  "https://picsum.photos/seed/domphy-images-badge-2/200/140",
  "https://picsum.photos/seed/domphy-images-badge-3/200/140",
];

function folderIcon(width: number, height: number, color: ThemeColor): DomphyElement<"span"> {
  return {
    span: [
      {
        svg: [
          {
            path: null,
            d: "M2 6.6A1.6 1.6 0 0 1 3.6 5h5.7l2 2.1h9.1A1.6 1.6 0 0 1 22 8.7v9.7A1.6 1.6 0 0 1 20.4 20H3.6A1.6 1.6 0 0 1 2 18.4V6.6Z",
            style: { fill: (listener: Listener) => themeColor(listener, "shift-9", color) } as StyleObject,
            _doctorDisable: "missing-color",
          } as DomphyElement,
        ],
        viewBox: "0 0 24 24",
        role: "img",
        ariaHidden: "true",
        style: { width: "100%", height: "100%", display: "block" } as StyleObject,
      } as DomphyElement<"svg">,
    ],
    ariaHidden: "true",
    style: {
      position: "relative",
      zIndex: 1,
      display: "inline-flex",
      flexShrink: 0,
      width: `${width}px`,
      height: `${height}px`,
    } as StyleObject,
  };
}

interface ThumbSpec {
  src: string;
  index: number;
  deviation: number;
}

function thumbSpec(images: string[]): ThumbSpec[] {
  const center = (images.length - 1) / 2;
  return images.map((src, index) => ({ src, index, deviation: index - center }));
}

function teaserThumb(
  spec: ThumbSpec,
  teaserSize: { width: number; height: number },
  hoverSize: { width: number; height: number },
): DomphyElement<"span"> {
  const teaserScaleX = teaserSize.width / hoverSize.width;
  const teaserScaleY = teaserSize.height / hoverSize.height;
  const restingOffsetX = spec.deviation * 3;

  return {
    span: [
      {
        img: null,
        src: spec.src,
        alt: "",
        loading: "lazy",
        style: { width: "100%", height: "100%", objectFit: "cover", display: "block" } as StyleObject,
      } as DomphyElement,
    ],
    dataImagesBadgeImage: String(spec.index),
    _key: `images-badge-thumb-${spec.index}`,
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      insetInlineStart: "50%",
      insetBlockEnd: "42%",
      width: `${hoverSize.width}px`,
      height: `${hoverSize.height}px`,
      zIndex: spec.deviation === 0 ? 0 : -1,
      transformOrigin: "50% 100%",
      transform: `translate(calc(-50% + ${restingOffsetX}px), 0) scale(${teaserScaleX}, ${teaserScaleY}) rotate(0deg)`,
      transition: "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
      borderRadius: themeSpacing(1),
      overflow: "hidden",
      pointerEvents: "none",
      outline: (listener: Listener) => `2px solid ${themeColor(listener, "shift-0")}`,
      outlineOffset: "0",
      boxShadow: (listener: Listener) => `0 ${themeSpacing(1)} ${themeSpacing(2.5)} ${themeColor(listener, "shift-13")}`,
    } as StyleObject,
  } as DomphyElement<"span">;
}

function hoverTransformFor(spec: ThumbSpec, hoverTranslateY: number, spreadX: number, rotateDeg: number): string {
  const offsetX = spec.deviation * spreadX;
  const rotate = spec.deviation * rotateDeg;
  return `translate(calc(-50% + ${offsetX}px), ${hoverTranslateY}px) scale(1) rotate(${rotate}deg)`;
}

/**
 * A small folder-icon badge that fans up to three hidden preview images out
 * above it on hover, like a hand of cards. Call with no arguments for a
 * working demo — a "Photos" badge with 3 generated placeholder thumbnails.
 */
function imagesBadge(props: ImagesBadgeProps = {}): DomphyElement {
  const label = props.label ?? "Photos";
  const images = (props.images && props.images.length > 0 ? props.images : DEFAULT_IMAGES).slice(0, 3);
  const folderColor = props.folderColor ?? "warning";
  const folderIconSize = props.folderIconSize ?? { width: 32, height: 24 };
  const teaserImageSize = props.teaserImageSize ?? { width: 20, height: 14 };
  const hoverImageSize = props.hoverImageSize ?? { width: 48, height: 32 };
  const hoverTranslateY = props.hoverTranslateY ?? -35;
  const spreadX = props.spreadX ?? 20;
  const rotateDeg = props.rotateDeg ?? 15;

  const specs = thumbSpec(images);

  const hoverSelectors: Record<string, StyleObject> = {};
  for (const spec of specs) {
    hoverSelectors[`&:hover [data-images-badge-image="${spec.index}"]`] = {
      transform: hoverTransformFor(spec, hoverTranslateY, spreadX, rotateDeg),
      zIndex: 10,
    } as StyleObject;
  }

  const folderStack: DomphyElement<"div"> = {
    div: [...specs.map((spec) => teaserThumb(spec, teaserImageSize, hoverImageSize)), folderIcon(folderIconSize.width, folderIconSize.height, folderColor)],
    style: {
      position: "relative",
      display: "inline-flex",
      alignItems: "flex-end",
    } as StyleObject,
  };

  const labelSpan: DomphyElement<"small"> = {
    small: label,
    $: [small({ color: "neutral" })],
  };

  const wrapperTag: "a" | "div" = props.href ? "a" : "div";
  const wrapper = {
    [wrapperTag]: [folderStack, labelSpan],
    href: props.href,
    target: props.target,
    rel: props.target === "_blank" ? "noopener noreferrer" : undefined,
    style: {
      position: "relative",
      display: "inline-flex",
      alignItems: "center",
      gap: themeSpacing(1.5),
      cursor: props.href ? "pointer" : "default",
      textDecoration: () => "none",
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      ...hoverSelectors,
      ...(props.style ?? {}),
    } as StyleObject,
  } as unknown as DomphyElement;

  return wrapper;
}

export { imagesBadge };
