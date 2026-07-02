// Aceternity UI "Scales" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A static,
// tileable line-pattern background (diagonal, horizontal, or vertical
// stripes) meant to sit behind other content as subtle texture.
//
// Same tileable SVG `<pattern>` technique this package's `stripedPattern`
// uses for its diagonal-only variant, generalized to three orientations. The
// diagonal case reuses `stripedPattern`'s three-line-per-tile trick (a main
// diagonal plus two short corner fragments) so the stripe continues unbroken
// across tile seams; horizontal/vertical are simpler — one line per tile,
// pinned to the tile's top or left edge, which is already enough to repeat
// into continuous full-width/height rows or columns once tiled via
// `patternUnits="userSpaceOnUse"`.
//
// Purely static and non-interactive: no `@keyframes`, no JS loop, no
// `_onMount` — the pattern is generated once as element data and left alone.
// The single exported factory doubles as the reference's "container" wrapper
// variant: any `children` passed in render above the pattern (a `position:
// relative; z-index: 1` content slot), so callers get the composited variant
// for free without a second export.

import type { DomphyElement, StyleObject } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export type ScalesDirection = "diagonal" | "horizontal" | "vertical";

export interface ScalesProps {
  /** Line orientation. Defaults to `"diagonal"`. */
  direction?: ScalesDirection;
  /** Pixel spacing between lines (tile size — controls density). Defaults to `10`. */
  spacing?: number;
  /** Line stroke width, in px. Defaults to `1`. */
  thickness?: number;
  /** Theme color family for the lines. Defaults to `"neutral"`. */
  color?: ThemeColor;
  /** Tone step for the line color (kept low/edge by default so it reads as
   * subtle texture, not a loud pattern). Defaults to `"shift-3"`. */
  lineTone?: string;
  /** Content composited above the pattern — the "container" variant.
   * Defaults to a small demo panel. */
  children?: DomphyElement | DomphyElement[];
  /** Passthrough style merged onto the outer wrapper. */
  style?: StyleObject;
}

let scalesInstanceCounter = 0;

/** Diagonal tile: main "/" diagonal plus two short corner fragments so it tiles seamlessly. */
function diagonalTileLines(tileSize: number, thickness: number, instanceId: number): DomphyElement[] {
  const cornerOffset = tileSize * 0.1;
  const rawSegments: Array<[number, number, number, number]> = [
    [0, tileSize, tileSize, 0],
    [-cornerOffset, cornerOffset, cornerOffset, -cornerOffset],
    [tileSize - cornerOffset, tileSize + cornerOffset, tileSize + cornerOffset, tileSize - cornerOffset],
  ];
  return rawSegments.map(
    ([x1, y1, x2, y2], index) =>
      ({
        line: null,
        _key: `scales-diagonal-${instanceId}-${index}`,
        x1,
        y1,
        x2,
        y2,
        style: { stroke: "currentColor", strokeWidth: thickness } as StyleObject,
      }) as DomphyElement,
  );
}

/** Horizontal tile: one line pinned to the tile's top edge, repeating into continuous rows. */
function horizontalTileLines(tileSize: number, thickness: number, instanceId: number): DomphyElement[] {
  return [
    {
      line: null,
      _key: `scales-horizontal-${instanceId}`,
      x1: 0,
      y1: 0,
      x2: tileSize,
      y2: 0,
      style: { stroke: "currentColor", strokeWidth: thickness } as StyleObject,
    } as DomphyElement,
  ];
}

/** Vertical tile: one line pinned to the tile's left edge, repeating into continuous columns. */
function verticalTileLines(tileSize: number, thickness: number, instanceId: number): DomphyElement[] {
  return [
    {
      line: null,
      _key: `scales-vertical-${instanceId}`,
      x1: 0,
      y1: 0,
      x2: 0,
      y2: tileSize,
      style: { stroke: "currentColor", strokeWidth: thickness } as StyleObject,
    } as DomphyElement,
  ];
}

/**
 * A static, tileable line-pattern background (diagonal/horizontal/vertical
 * stripes) meant to sit behind other content as subtle texture. Any
 * `children` passed in render above the pattern. Call with no arguments for
 * a working demo — a diagonal-hatched panel behind a small heading.
 */
function scales(props: ScalesProps = {}): DomphyElement<"div"> {
  const instanceId = ++scalesInstanceCounter;
  const direction = props.direction ?? "diagonal";
  const tileSize = Math.max(2, props.spacing ?? 10);
  const thickness = Math.max(0.5, props.thickness ?? 1);
  const color = props.color ?? "neutral";
  const lineTone = props.lineTone ?? "shift-3";
  const patternId = `domphy-scales-${instanceId}`;

  const tileLines =
    direction === "diagonal"
      ? diagonalTileLines(tileSize, thickness, instanceId)
      : direction === "horizontal"
        ? horizontalTileLines(tileSize, thickness, instanceId)
        : verticalTileLines(tileSize, thickness, instanceId);

  const defaultChildren: DomphyElement[] = [
    { h3: "Scales", $: [heading()] } as DomphyElement,
    {
      p: `A tileable ${direction} line texture, kept subtle behind your content.`,
      $: [paragraph()],
    } as DomphyElement,
  ];
  const contentChildren = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : defaultChildren;

  const patternSvg: DomphyElement<"svg"> = {
    svg: [
      {
        defs: [
          {
            pattern: tileLines,
            id: patternId,
            width: tileSize,
            height: tileSize,
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
      color: (listener) => themeColor(listener, lineTone, color),
    } as StyleObject,
  } as DomphyElement<"svg">;

  return {
    div: [
      patternSvg,
      {
        div: contentChildren,
        style: { position: "relative", zIndex: 1 } as StyleObject,
      } as DomphyElement<"div">,
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

export { scales };
