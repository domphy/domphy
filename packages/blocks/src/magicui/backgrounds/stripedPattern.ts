// magicui "Striped Pattern" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A simple
// tileable SVG background of thin, evenly-spaced diagonal stripes.
//
// Three-line-per-tile technique: the main diagonal plus two short fragments,
// each straddling a tile corner, so a single stripe continues unbroken
// across every tile seam once the pattern repeats via
// `patternUnits="userSpaceOnUse"`. `direction` is implemented by mirroring
// the line endpoint x-coordinates (not a CSS transform), so the tiling
// geometry stays exact for both slants.

import type { DomphyElement, StyleObject } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export type StripedPatternDirection = "left" | "right";

export interface StripedPatternProps {
  /** Tile width, in SVG user units — controls stripe spacing/density. Defaults to `10`. */
  width?: number;
  /** Tile height, in SVG user units. Defaults to `10`. */
  height?: number;
  /** `"left"` slants stripes bottom-left to top-right ("/"); `"right"` mirrors to "\".
   * Defaults to `"left"`. */
  direction?: StripedPatternDirection;
  /** Extra `stroke-dasharray` applied to each stripe line, for broken/dashed stripes. */
  strokeDasharray?: string;
  /** Theme color family for the stripe stroke. Defaults to `"neutral"`. */
  color?: ThemeColor;
  /** Foreground content layered above the pattern. Defaults to a small demo panel. */
  children?: DomphyElement | DomphyElement[];
  style?: StyleObject;
}

let stripedPatternInstanceCounter = 0;

function mirrorX(x: number, tileWidth: number, direction: StripedPatternDirection): number {
  return direction === "right" ? tileWidth - x : x;
}

/**
 * Tileable SVG background of thin, evenly-spaced diagonal stripes, colored
 * via `currentColor`. Purely decorative and static — no animation, pointer
 * events disabled. Call with no arguments for a working demo — a full-bleed
 * diagonal stripe texture behind a heading.
 */
function stripedPattern(props: StripedPatternProps = {}): DomphyElement<"div"> {
  const instanceId = ++stripedPatternInstanceCounter;
  const tileWidth = Math.max(2, props.width ?? 10);
  const tileHeight = Math.max(2, props.height ?? 10);
  const direction = props.direction ?? "left";
  const strokeDasharray = props.strokeDasharray;
  const color = props.color ?? "neutral";
  const patternId = `striped-pattern-${instanceId}`;

  const cornerOffsetX = tileWidth * 0.1;
  const cornerOffsetY = tileHeight * 0.1;
  const rawSegments: Array<[number, number, number, number]> = [
    [0, tileHeight, tileWidth, 0],
    [-cornerOffsetX, cornerOffsetY, cornerOffsetX, -cornerOffsetY],
    [tileWidth - cornerOffsetX, tileHeight + cornerOffsetY, tileWidth + cornerOffsetX, tileHeight - cornerOffsetY],
  ];

  const stripeLines: DomphyElement[] = rawSegments.map(
    ([x1, y1, x2, y2], index) =>
      ({
        line: null,
        _key: `stripe-${instanceId}-${index}`,
        x1: mirrorX(x1, tileWidth, direction),
        y1,
        x2: mirrorX(x2, tileWidth, direction),
        y2,
        strokeDasharray,
        style: { stroke: "currentColor", strokeWidth: 0.5 } as StyleObject,
      }) as DomphyElement,
  );

  const defaultChildren: DomphyElement[] = [
    { h3: "Striped Pattern", $: [heading()] } as DomphyElement,
    {
      p: "A tileable diagonal-stripe texture, kept subtle behind your content.",
      $: [paragraph()],
    } as DomphyElement,
  ];
  const contentChildren = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : defaultChildren;

  return {
    div: [
      {
        svg: [
          {
            defs: [
              {
                pattern: stripeLines,
                id: patternId,
                width: tileWidth,
                height: tileHeight,
                patternUnits: "userSpaceOnUse",
              } as DomphyElement,
            ],
          } as DomphyElement,
          {
            rect: null,
            width: "100%",
            height: "100%",
            ariaHidden: "true",
            style: { fill: `url(#${patternId})` } as StyleObject,
          } as DomphyElement,
        ],
        ariaHidden: "true",
        style: {
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          color: (listener) => themeColor(listener, "shift-3", color),
        } as StyleObject,
      } as DomphyElement<"svg">,
      { div: contentChildren, style: { position: "relative", zIndex: 1 } },
    ],
    dataTone: "shift-1",
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      padding: themeSpacing(8),
      minHeight: themeSpacing(64),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { stripedPattern };
