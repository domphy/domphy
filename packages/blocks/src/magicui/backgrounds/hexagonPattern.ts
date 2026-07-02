// magicui "Hexagon Pattern" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A
// tileable SVG background of honeycomb-style hexagon outlines (flat-top or
// pointy-top), with optional solid-filled highlighted cells layered above
// the tile.
//
// Tiling technique: a single repeating `<pattern>` tile packs THREE hexagon
// instances — one fully inside the tile and two half-instances straddling
// the tile's seam edge — so the standard "every other row/column offset by
// half a step" honeycomb interlock reproduces seamlessly once the pattern
// repeats via `patternUnits="userSpaceOnUse"`. This is a self-derived
// single-tile hex-grid construction, not copied from any source.

import type { DomphyElement, StyleObject } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export type HexagonPatternDirection = "horizontal" | "vertical";

export interface HexagonPatternProps {
  /** Hexagon radius, center to vertex, in SVG user units. Defaults to `40`. */
  radius?: number;
  /** Extra spacing added between adjacent hexagons, in user units. Defaults to `0`. */
  gap?: number;
  /** Pattern origin horizontal offset, in user units. Defaults to `-1`. */
  x?: number;
  /** Pattern origin vertical offset, in user units. Defaults to `-1`. */
  y?: number;
  /** `"horizontal"` renders flat-top hexagons (flat edges up/down); `"vertical"` renders
   * pointy-top hexagons (a vertex up/down). Defaults to `"horizontal"`. */
  direction?: HexagonPatternDirection;
  /** `[column, row]` coordinates of cells to render as solid highlighted hexagons, layered
   * above the outline tile. Defaults to a small demo set. */
  hexagons?: Array<[number, number]>;
  /** Switches outline rendering from a closed polygon to per-edge dashed line segments
   * (e.g. `"4 2"`). Solid closed polygons are used when omitted. */
  strokeDasharray?: string;
  /** Theme color family for the outline stroke. Defaults to `"neutral"`. */
  color?: ThemeColor;
  /** Theme color family for highlighted cells. Defaults to `"primary"`. */
  highlightColor?: ThemeColor;
  /** Foreground content layered above the pattern. Defaults to a small demo panel. */
  children?: DomphyElement | DomphyElement[];
  /** Passthrough style merged onto the outer demo wrapper. */
  style?: StyleObject;
}

interface HexPoint {
  x: number;
  y: number;
}

function hexagonVertices(center: HexPoint, radius: number, direction: HexagonPatternDirection): HexPoint[] {
  // "horizontal" = flat-top (vertex at angle 0 → left/right points); "vertical" =
  // pointy-top (vertex at angle -90 → a point straight up).
  const angleOffset = direction === "vertical" ? -90 : 0;
  return Array.from({ length: 6 }, (_unused, index) => {
    const angle = ((60 * index + angleOffset) * Math.PI) / 180;
    return { x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) };
  });
}

function pointsAttribute(vertices: HexPoint[]): string {
  return vertices.map((vertex) => `${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`).join(" ");
}

let hexagonPatternInstanceCounter = 0;

/**
 * Tileable SVG honeycomb of hexagon outlines, with optional solid-filled
 * highlighted cells layered above the tile. Purely decorative and static —
 * intended as a background layer behind foreground content, with pointer
 * events disabled. Call with no arguments for a working demo — a full-bleed
 * hexagon grid with a few highlighted cells behind a heading.
 */
function hexagonPattern(props: HexagonPatternProps = {}): DomphyElement<"div"> {
  const instanceId = ++hexagonPatternInstanceCounter;
  const radius = Math.max(4, props.radius ?? 40);
  const gap = props.gap ?? 0;
  const originX = props.x ?? -1;
  const originY = props.y ?? -1;
  const direction = props.direction ?? "horizontal";
  const strokeDasharray = props.strokeDasharray;
  const color = props.color ?? "neutral";
  const highlightColor = props.highlightColor ?? "primary";
  const hexagons = props.hexagons ?? [
    [2, 1],
    [4, 3],
    [6, 0],
  ];
  const patternId = `hexagon-pattern-${instanceId}`;

  let tileWidth: number;
  let tileHeight: number;
  let tileCenters: HexPoint[];
  let columnStep: number;
  let rowStep: number;

  if (direction === "horizontal") {
    // Flat-top hexagon: horizontal center-to-center column spacing is
    // 1.5*radius; vertical spacing within a column is sqrt(3)*radius. A
    // 2-column-wide, 1-row-tall tile carries the full even/odd column offset.
    columnStep = 1.5 * radius + gap;
    rowStep = Math.sqrt(3) * radius + gap;
    tileWidth = 2 * columnStep;
    tileHeight = rowStep;
    tileCenters = [
      { x: columnStep / 2, y: tileHeight / 2 },
      { x: 1.5 * columnStep, y: 0 },
      { x: 1.5 * columnStep, y: tileHeight },
    ];
  } else {
    // Pointy-top hexagon: mirror of the flat-top case with rows/columns swapped.
    rowStep = 1.5 * radius + gap;
    columnStep = Math.sqrt(3) * radius + gap;
    tileWidth = columnStep;
    tileHeight = 2 * rowStep;
    tileCenters = [
      { x: tileWidth / 2, y: rowStep / 2 },
      { x: 0, y: 1.5 * rowStep },
      { x: tileWidth, y: 1.5 * rowStep },
    ];
  }

  function cellCenter(column: number, row: number): HexPoint {
    if (direction === "horizontal") {
      const isOddColumn = ((column % 2) + 2) % 2 === 1;
      return {
        x: column * columnStep + columnStep / 2 + originX,
        y: row * rowStep + rowStep / 2 + (isOddColumn ? rowStep / 2 : 0) + originY,
      };
    }
    const isOddRow = ((row % 2) + 2) % 2 === 1;
    return {
      x: column * columnStep + columnStep / 2 + (isOddRow ? columnStep / 2 : 0) + originX,
      y: row * rowStep + rowStep / 2 + originY,
    };
  }

  const tileContent: DomphyElement[] = strokeDasharray
    ? tileCenters.flatMap((center, centerIndex) => {
        const vertices = hexagonVertices(center, radius, direction);
        return vertices.map((vertex, edgeIndex) => {
          const next = vertices[(edgeIndex + 1) % vertices.length];
          return {
            line: null,
            _key: `edge-${centerIndex}-${edgeIndex}`,
            x1: vertex.x,
            y1: vertex.y,
            x2: next.x,
            y2: next.y,
            strokeDasharray,
            style: { stroke: "currentColor", strokeWidth: 1 } as StyleObject,
          } as DomphyElement;
        });
      })
    : tileCenters.map(
        (center, centerIndex) =>
          ({
            polygon: null,
            _key: `cell-${centerIndex}`,
            points: pointsAttribute(hexagonVertices(center, radius, direction)),
            style: { stroke: "currentColor", fill: "none", strokeWidth: 1 } as StyleObject,
          }) as DomphyElement,
      );

  const highlightElements: DomphyElement[] = hexagons.map(
    ([column, row], index) =>
      ({
        polygon: null,
        _key: `highlight-${instanceId}-${index}`,
        points: pointsAttribute(hexagonVertices(cellCenter(column, row), radius, direction)),
        ariaHidden: "true",
        // Decorative highlight cell with no text of its own — exempt from the
        // missing-color contract (mirrors meteors()/dottedMap() in this package).
        _doctorDisable: "missing-color",
        style: {
          fill: (listener) => themeColor(listener, "shift-9", highlightColor),
          stroke: "none",
        } as StyleObject,
      }) as DomphyElement,
  );

  const defaultChildren: DomphyElement[] = [
    { h3: "Hexagon Pattern", $: [heading()] } as DomphyElement,
    {
      p: "A tileable honeycomb of hexagon outlines with a few highlighted cells.",
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
                pattern: tileContent,
                id: patternId,
                width: tileWidth,
                height: tileHeight,
                patternUnits: "userSpaceOnUse",
                x: originX,
                y: originY,
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
          ...highlightElements,
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

export { hexagonPattern };
