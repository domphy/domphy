// magicui "Progressive Blur" — a static overlay that dissolves content into
// blur near one or both edges of a container instead of cutting it off sharply
// (no color/opacity gradient of its own — only the blur intensity increases).
//
// Single-edge (top/bottom): several thin, absolutely-positioned bands stacked at
// the edge, each with a stronger `backdrop-filter: blur()` and a `mask-image`
// gradient window that overlaps its neighbour so the discrete blur steps blend
// into a smooth fade (an original overlap formula, documented in SOURCES.md).
//
// Both edges: mirrors upstream's `position="both"` exactly — one full-height
// overlay whose every layer shares one identical mask window, giving a
// near-uniform heavy blur that fades only at the two extreme 5% edges
// (thickness is ignored, as upstream forces the overlay height to 100%).

import type { DomphyElement, StyleObject } from "@domphy/core";
import { paragraph, strong } from "@domphy/ui";
import { themeColor, themeSpacing } from "@domphy/theme";

export type ProgressiveBlurEdge = "top" | "bottom";

export interface ProgressiveBlurProps {
  /** Which edge(s) get a blur fade. Defaults to `["bottom"]`. */
  edges?: ProgressiveBlurEdge[];
  /** Thickness of the blurred zone: a `themeSpacing` unit count, or a raw CSS length/percentage. Defaults to `"30%"`. */
  thickness?: number | string;
  /** Blur radii (px), one band per entry, applied in the caller's given order —
   * entry 0 = innermost/lightest layer, last entry = outermost edge layer. Never
   * sorted (matches upstream). Defaults to `[0.5, 1, 2, 4, 8, 16, 32, 64]`. */
  blurSteps?: number[];
  /** The underlying content the blur overlays. Defaults to a short demo panel. */
  content?: DomphyElement[];
  /** Optional content rendered inside the blurred region (e.g. a "show more" affordance). */
  overlayContent?: DomphyElement;
  style?: StyleObject;
}

const DEFAULT_BLUR_STEPS = [0.5, 1, 2, 4, 8, 16, 32, 64];
const DEFAULT_THICKNESS: string = "30%";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** One blur band. `stepCount` bands per edge share overlapping mask windows so the
 * discrete blur radii read as a continuous gradient instead of hard seams. */
function blurBand(
  edge: ProgressiveBlurEdge,
  index: number,
  stepCount: number,
  blurPixels: number,
  thickness: number | string,
): DomphyElement<"div"> {
  const startFraction = clamp(index / (stepCount + 1), 0, 1);
  const endFraction = clamp((index + 2) / (stepCount + 1), 0, 1);
  const gradientDirection = edge === "bottom" ? "to bottom" : "to top";
  const maskImage = `linear-gradient(${gradientDirection}, transparent ${startFraction * 100}%, black ${endFraction * 100}%)`;
  const blurFilter = `blur(${blurPixels}px)`;

  return {
    div: null,
    _key: `${edge}-band-${index}`,
    ariaHidden: "true",
    style: {
      position: "absolute",
      insetInlineStart: 0,
      insetInlineEnd: 0,
      insetBlockStart: edge === "top" ? 0 : undefined,
      insetBlockEnd: edge === "bottom" ? 0 : undefined,
      height: typeof thickness === "number" ? themeSpacing(thickness) : thickness,
      pointerEvents: "none",
      backdropFilter: blurFilter,
      WebkitBackdropFilter: blurFilter,
      maskImage,
      WebkitMaskImage: maskImage,
    } as StyleObject,
  };
}

/** Upstream `position="both"`: every layer shares this single mask window, so the
 * whole element reads as a near-uniform heavy blur that fades only at the 5% edges. */
const BOTH_MASK = "linear-gradient(rgba(0,0,0,0) 0%, rgba(0,0,0,1) 5%, rgba(0,0,0,1) 95%, rgba(0,0,0,0) 100%)";

/** One full-height blur layer for `both` mode. Fills the container (thickness is
 * ignored, matching upstream forcing the overlay height to 100%) with
 * `blur(blurPixels)`, all N layers sharing `BOTH_MASK`. */
function uniformBlurBand(index: number, blurPixels: number): DomphyElement<"div"> {
  const blurFilter = `blur(${blurPixels}px)`;
  return {
    div: null,
    _key: `both-band-${index}`,
    ariaHidden: "true",
    style: {
      position: "absolute",
      insetInlineStart: 0,
      insetInlineEnd: 0,
      insetBlockStart: 0,
      insetBlockEnd: 0,
      zIndex: index + 1,
      pointerEvents: "none",
      backdropFilter: blurFilter,
      WebkitBackdropFilter: blurFilter,
      maskImage: BOTH_MASK,
      WebkitMaskImage: BOTH_MASK,
    } as StyleObject,
  };
}

const DEMO_LINES = [
  "Progressive blur hints that more content continues beyond the edge.",
  "Each band stacks a slightly stronger backdrop blur than the one before it.",
  "No solid gradient mask — only blur intensity increases toward the edge.",
  "The overlapping masks blend the discrete steps into one smooth fade.",
];

function defaultContent(): DomphyElement[] {
  return [
    {
      div: [
        { strong: "Progressive Blur", $: [strong()] },
        ...DEMO_LINES.map((line, index) => ({
          p: line,
          _key: `line-${index}`,
          $: [paragraph()],
        })),
      ],
      dataTone: "shift-1",
      style: {
        display: "flex",
        flexDirection: "column",
        gap: themeSpacing(2),
        height: "100%",
        padding: themeSpacing(6),
        backgroundColor: (listener) => themeColor(listener, "inherit"),
        color: (listener) => themeColor(listener, "shift-9"),
      },
    },
  ];
}

/**
 * Static edge-fade overlay that dissolves content into blur near one or both
 * edges of a container. Call with no arguments for a working demo — a short
 * text panel with a progressive blur fading its bottom edge.
 */
function progressiveBlur(props: ProgressiveBlurProps = {}): DomphyElement<"div"> {
  const edges = props.edges && props.edges.length ? props.edges : (["bottom"] as ProgressiveBlurEdge[]);
  const thickness = props.thickness ?? DEFAULT_THICKNESS;
  // Caller order is preserved (upstream never sorts blurLevels): entry 0 is the
  // innermost layer, the last entry the outermost/edge layer.
  const blurSteps = props.blurSteps && props.blurSteps.length ? props.blurSteps : DEFAULT_BLUR_STEPS;
  const content = props.content ?? defaultContent();

  // Both edges present == upstream position="both": a single full-height overlay
  // of exactly N layers sharing one mask window, NOT two per-edge fade regions.
  const isBoth = edges.includes("top") && edges.includes("bottom");

  const bands: DomphyElement[] = [];
  if (isBoth) {
    for (let index = 0; index < blurSteps.length; index += 1) {
      bands.push(uniformBlurBand(index, blurSteps[index]));
    }
  } else {
    const edge: ProgressiveBlurEdge = edges.includes("top") ? "top" : "bottom";
    for (let index = 0; index < blurSteps.length; index += 1) {
      bands.push(blurBand(edge, index, blurSteps.length, blurSteps[index], thickness));
    }
  }

  const overlay: DomphyElement[] = props.overlayContent
    ? [
        {
          ...props.overlayContent,
          _key: "overlay-content",
          style: {
            position: "absolute",
            insetInlineStart: 0,
            insetInlineEnd: 0,
            insetBlockEnd: edges.includes("bottom") ? 0 : undefined,
            insetBlockStart: !edges.includes("bottom") && edges.includes("top") ? 0 : undefined,
            // sit above every blur band (both-mode bands carry z-index up to N)
            zIndex: blurSteps.length + 1,
            pointerEvents: "none",
            ...(props.overlayContent.style ?? {}),
          },
        } as DomphyElement,
      ]
    : [];

  return {
    div: [
      { div: content, style: { position: "relative", zIndex: 0, height: "100%", overflow: "hidden" } },
      ...bands,
      ...overlay,
    ],
    style: {
      position: "relative",
      overflow: "hidden",
      height: themeSpacing(72),
      ...(props.style ?? {}),
    },
  };
}

export { progressiveBlur };
