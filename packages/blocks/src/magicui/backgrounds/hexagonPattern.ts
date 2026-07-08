// magicui "Hexagon Pattern" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A
// tileable SVG background of honeycomb-style hexagon outlines (flat-top or
// pointy-top), with optional solid-filled highlighted cells layered above
// the tile.
//
// Tiling technique: a single repeating `<pattern>` tile carries the two
// canonical honeycomb hexagons PLUS every seam-straddling copy — each
// canonical hexagon is replicated onto whichever of its 8 tile-boundary
// neighbors its body still overlaps. A `<pattern>` clips content to the tile
// (default `overflow:hidden`), so without those copies every hexagon centered
// on a seam would lose its tip-sliver on one side and the seam would show
// repeating gaps. With them, the "every other row/column offset by half a
// step" honeycomb interlock reproduces seamlessly once the pattern repeats via
// `patternUnits="userSpaceOnUse"`.

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
   * (e.g. `"4 2"`). The values `"0"`, `"none"`, and `""` count as solid and render closed
   * polygons; any other value renders dashed per-edge lines. Defaults to `"0"` (solid). */
  strokeDasharray?: string;
  /** Theme color family for the outline stroke. Defaults to `"neutral"`. */
  color?: ThemeColor;
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

// Upstream treats "0"/"none"/"" (and the default "0") as "no dashing" and renders
// closed <polygon>s; only a real dash spec switches to per-edge <line> segments.
function isSolidStrokeDasharray(value: string): boolean {
  const trimmed = value.trim();
  return trimmed === "" || trimmed === "none" || trimmed === "0";
}

function edgeKey(a: HexPoint, b: HexPoint): string {
  const aKey = `${a.x.toFixed(2)},${a.y.toFixed(2)}`;
  const bKey = `${b.x.toFixed(2)},${b.y.toFixed(2)}`;
  return aKey < bKey ? `${aKey}|${bKey}` : `${bKey}|${aKey}`;
}

// Adjacent tile centers share an edge (they touch, not just meet at a
// vertex), so mapping every center's 6 edges independently would draw each
// shared edge twice -- visible as a doubled dash when strokeDasharray is set.
function uniqueHexEdges(
  centers: HexPoint[],
  radius: number,
  direction: HexagonPatternDirection,
): Array<[HexPoint, HexPoint]> {
  const seen = new Set<string>();
  const edges: Array<[HexPoint, HexPoint]> = [];
  for (const center of centers) {
    const vertices = hexagonVertices(center, radius, direction);
    vertices.forEach((vertex, edgeIndex) => {
      const next = vertices[(edgeIndex + 1) % vertices.length];
      const key = edgeKey(vertex, next);
      if (seen.has(key)) return;
      seen.add(key);
      edges.push([vertex, next]);
    });
  }
  return edges;
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
  const strokeDasharray = props.strokeDasharray ?? "0";
  const color = props.color ?? "neutral";
  const hexagons = props.hexagons ?? [
    [2, 1],
    [4, 3],
    [6, 0],
  ];
  const patternId = `hexagon-pattern-${instanceId}`;

  let tileWidth: number;
  let tileHeight: number;
  let columnStep: number;
  let rowStep: number;
  let canonicalCenters: HexPoint[];

  if (direction === "horizontal") {
    // Flat-top hexagon: horizontal center-to-center column spacing is
    // 1.5*radius; vertical spacing within a column is sqrt(3)*radius. Gap is
    // the visible edge-to-edge spacing, added along each axis's shared-edge
    // normal (hence the sqrt(3)/2 factor on the column axis) rather than
    // directly on the raw x/y step, so it distributes evenly around a cell.
    // A 2-column-wide, 1-row-tall tile carries the full even/odd column offset.
    columnStep = 1.5 * radius + (Math.sqrt(3) * gap) / 2;
    rowStep = Math.sqrt(3) * radius + gap;
    tileWidth = 2 * columnStep;
    tileHeight = rowStep;
    canonicalCenters = [
      { x: columnStep / 2, y: rowStep / 2 },
      { x: 1.5 * columnStep, y: rowStep },
    ];
  } else {
    // Pointy-top hexagon: mirror of the flat-top case with rows/columns swapped.
    rowStep = 1.5 * radius + (Math.sqrt(3) * gap) / 2;
    columnStep = Math.sqrt(3) * radius + gap;
    tileWidth = columnStep;
    tileHeight = 2 * rowStep;
    canonicalCenters = [
      { x: columnStep / 2, y: rowStep / 2 },
      { x: columnStep, y: 1.5 * rowStep },
    ];
  }

  // The <pattern> clips content to the tile, so a canonical hexagon whose body
  // crosses a tile edge must be re-emitted at the mirrored position on the
  // opposite side (and diagonal corners), or that seam repeats a gap where the
  // clipped tip-sliver should be. Replicate each canonical center onto whichever
  // of its 8 boundary-neighbor tiles its body still intersects. Mirrors upstream
  // getTileGeometry (~10 centers/tile), replacing the earlier 3-instance tile
  // that dropped the horizontal (and, when vertical, the vertical) seam copies.
  const tileCenters: HexPoint[] = [];
  for (const { x: cx, y: cy } of canonicalCenters) {
    tileCenters.push({ x: cx, y: cy });
    if (cy - radius < 0) tileCenters.push({ x: cx, y: cy + tileHeight });
    if (cy + radius > tileHeight) tileCenters.push({ x: cx, y: cy - tileHeight });
    if (cx - radius < 0) tileCenters.push({ x: cx + tileWidth, y: cy });
    if (cx + radius > tileWidth) tileCenters.push({ x: cx - tileWidth, y: cy });
    if (cy - radius < 0 && cx - radius < 0) tileCenters.push({ x: cx + tileWidth, y: cy + tileHeight });
    if (cy - radius < 0 && cx + radius > tileWidth) tileCenters.push({ x: cx - tileWidth, y: cy + tileHeight });
    if (cy + radius > tileHeight && cx - radius < 0) tileCenters.push({ x: cx + tileWidth, y: cy - tileHeight });
    if (cy + radius > tileHeight && cx + radius > tileWidth) tileCenters.push({ x: cx - tileWidth, y: cy - tileHeight });
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

  const tileContent: DomphyElement[] = isSolidStrokeDasharray(strokeDasharray)
    ? tileCenters.map(
        (center, centerIndex) =>
          ({
            polygon: null,
            _key: `cell-${centerIndex}`,
            points: pointsAttribute(hexagonVertices(center, radius, direction)),
            strokeDasharray,
            style: { stroke: "currentColor", fill: "none", strokeWidth: 1 } as StyleObject,
          }) as DomphyElement,
      )
    : uniqueHexEdges(tileCenters, radius, direction).map(
        ([vertex, next], edgeIndex) =>
          ({
            line: null,
            _key: `edge-${edgeIndex}`,
            x1: vertex.x,
            y1: vertex.y,
            x2: next.x,
            y2: next.y,
            strokeDasharray,
            style: { stroke: "currentColor", strokeWidth: 1 } as StyleObject,
          }) as DomphyElement,
      );

  const highlightElements: DomphyElement[] = hexagons.map(
    ([column, row], index) =>
      ({
        polygon: null,
        _key: `highlight-${instanceId}-${index}`,
        points: pointsAttribute(hexagonVertices(cellCenter(column, row), radius - 1, direction)),
        ariaHidden: "true",
        // Decorative highlight cell with no text of its own — exempt from the
        // missing-color contract (mirrors meteors()/dottedMap() in this package).
        _doctorDisable: "missing-color",
        // Upstream highlight polygons carry no fill of their own and inherit the
        // svg's fill-gray-400/30 — the SAME tone as the grid outlines — so they
        // read as a subtle same-color fill, not a distinct hue. Match the grid's
        // shift-3/`color`, exactly as the sibling gridPattern does for its squares.
        style: {
          fill: (listener) => themeColor(listener, "shift-3", color),
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
