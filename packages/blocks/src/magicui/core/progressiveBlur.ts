// magicui "Progressive Blur" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A static
// overlay that dissolves content into blur near one or both edges of a
// container instead of cutting it off sharply. Built from several thin,
// absolutely-positioned bands stacked at the edge, each with a stronger
// `backdrop-filter: blur()` than the one before it and a `mask-image`
// gradient that limits where that band is visible — the overlapping masks
// blend the discrete blur steps into a smooth, purely-blur-intensity fade
// (no color/opacity gradient of its own).

import type { DomphyElement, StyleObject } from "@domphy/core";
import { paragraph, strong } from "@domphy/ui";
import { themeColor, themeSpacing } from "@domphy/theme";

export type ProgressiveBlurEdge = "top" | "bottom";

export interface ProgressiveBlurProps {
  /** Which edge(s) get a blur fade. Defaults to `["bottom"]`. */
  edges?: ProgressiveBlurEdge[];
  /** Thickness of the blurred zone: a `themeSpacing` unit count, or a raw CSS length/percentage. Defaults to `"30%"`. */
  thickness?: number | string;
  /** Ordered blur radii (px), lightest → strongest, one band per entry. Defaults to `[0.5, 1, 2, 4, 8, 16, 32, 64]`. */
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
  const blurSteps =
    props.blurSteps && props.blurSteps.length ? [...props.blurSteps].sort((a, b) => a - b) : DEFAULT_BLUR_STEPS;
  const content = props.content ?? defaultContent();

  const bands: DomphyElement[] = [];
  for (const edge of edges) {
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
            zIndex: 2,
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
