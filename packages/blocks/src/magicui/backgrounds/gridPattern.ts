// Magic UI "Grid Pattern" — clean-room reimplementation.
//
// A static SVG background of thin graph-paper-style grid lines, with an
// optional list of individual cells rendered as solid-filled squares on top
// — useful for spotlighting or tracing particular cells. Purely decorative
// and stateless: no animation of its own. Edge fades (radial/linear mask) or
// skew/rotation are expected to be layered on externally via plain CSS by
// the consumer, exactly as upstream documents it. Implemented purely from
// the block's public functional/visual spec — no upstream Magic UI source
// was viewed or copied.
//
// The line grid is a single SVG `<pattern>` (`patternUnits="userSpaceOnUse"`)
// stamped across a full-size background `<rect>` — the browser tiles it
// natively, so the grid always covers the container exactly and reflows for
// free on resize without any JS measurement at all. This is the static
// sibling of `animatedGridPattern` — same line-pattern base, minus the
// pulsing animated squares layer.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface GridPatternProps {
  /** Grid cell width, in px. Defaults to `40`. */
  width?: number;
  /** Grid cell height, in px. Defaults to `40`. */
  height?: number;
  /** Pattern horizontal offset, in px — `-1` keeps the thin stroke crisply aligned to pixels. Defaults to `-1`. */
  x?: number;
  /** Pattern vertical offset, in px. Defaults to `-1`. */
  y?: number;
  /** `[column, row]` coordinate pairs rendered as solid-filled highlighted cells. Defaults to a small illustrative set. */
  squares?: Array<[number, number]>;
  /** Solid vs dashed line style, e.g. `"4 2"`. Defaults to solid (`undefined`). */
  strokeDasharray?: string;
  /** Theme color family for the lines and highlighted squares. Defaults to `"neutral"`. */
  color?: ThemeColor;
  /** Passthrough style merged onto the outer demo container. */
  style?: StyleObject;
}

let gridPatternInstanceCounter = 0;

const DEFAULT_SQUARES: Array<[number, number]> = [
  [2, 1],
  [5, 3],
  [8, 2],
  [3, 5],
];

/**
 * A static SVG background of thin graph-paper-style grid lines, with an
 * optional list of highlighted cells rendered as solid squares on top. Call
 * with no arguments for a working demo — a faint grid with a few highlighted
 * cells behind a heading.
 */
function gridPattern(props: GridPatternProps = {}): DomphyElement<"div"> {
  const width = props.width ?? 40;
  const height = props.height ?? 40;
  const x = props.x ?? -1;
  const y = props.y ?? -1;
  const squares = props.squares ?? DEFAULT_SQUARES;
  const strokeDasharray = props.strokeDasharray;
  const color = props.color ?? "neutral";

  const instanceId = ++gridPatternInstanceCounter;
  const patternId = `domphy-grid-pattern-${instanceId}-${hashString(
    JSON.stringify({ width, height, x, y }),
  )}`;

  const patternElement: DomphyElement = {
    pattern: [
      {
        path: null,
        d: `M ${width} 0 L 0 0 0 ${height}`,
        fill: "none",
        // Decorative line path, no text of its own.
        _doctorDisable: "missing-color",
        style: {
          stroke: (listener: Listener) => themeColor(listener, "shift-4", color),
          strokeDasharray,
        } as StyleObject,
      } as DomphyElement,
    ],
    id: patternId,
    width,
    height,
    patternUnits: "userSpaceOnUse",
    x,
    y,
  } as DomphyElement;

  const squareElements: DomphyElement[] = squares.map(([column, row]) => ({
    rect: null,
    _key: `square-${column}-${row}`,
    x: column * width + x,
    y: row * height + y,
    width,
    height,
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    style: {
      fill: (listener: Listener) => themeColor(listener, "shift-8", color),
    } as StyleObject,
  } as DomphyElement));

  const gridSvg: DomphyElement = {
    svg: [
      { defs: [patternElement] } as DomphyElement,
      {
        rect: null,
        width: "100%",
        height: "100%",
        style: { fill: `url(#${patternId})` } as StyleObject,
      } as DomphyElement,
      { g: squareElements, _key: "highlighted-squares" } as DomphyElement,
    ],
    ariaHidden: "true",
    style: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      pointerEvents: "none",
    } as StyleObject,
  } as DomphyElement;

  return {
    div: [
      gridSvg,
      {
        div: [
          { h2: "Grid Pattern", $: [heading()] } as DomphyElement,
          {
            p: "A static graph-paper grid with optional highlighted cells.",
            $: [paragraph()],
          } as DomphyElement,
        ],
        style: { position: "relative", zIndex: 1 },
      } as DomphyElement,
    ],
    dataTone: "shift-15",
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      padding: themeSpacing(8),
      minHeight: themeSpacing(64),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { gridPattern };
