import { themeColor } from "@domphy/theme";
import { cssColor } from "../gl/color.js";
import type {
  BrushArea,
  BrushOption,
  BrushSelectedParams,
  ChartRect,
} from "../types.js";

export type { BrushArea, BrushSelectedParams } from "../types.js";

const SVG_NS = "http://www.w3.org/2000/svg";
// DERIVED: same drag threshold as the toolbox dataZoom rectangle select —
// Chromium's own kDragThresholdX/Y (3px) is the smallest movement it reports
// as a drag rather than a click.
const MIN_DRAG_PIXELS = 3;
const TOOLBAR_Z_INDEX = 10;

export type BrushAreaType = BrushArea["brushType"];

// Deliberate correctness-first scoping (apps/web/docs/chart/axes.md's Brush
// section): boxplot, heatmap and pie have no hit-test path here — parity
// with upstream ECharts, whose own series models implement no
// brushSelector() for those three either (verified against apache/echarts
// source). The seriesIndex/xAxisIndex/yAxisIndex scoping fields on
// BrushOption are not consulted; an incorrect dataIndex would be worse than
// an absent one, so unsupported series/scoping are silently excluded rather
// than guessed at.
//
// One entry per hit-testable point-shaped series (scatter, line — its
// rendered mark is a single dot on the line/curve): pixel position for every
// datum (parallel to that series' own `data` array), or `null` for a datum
// with no cartesian position (NaN, filtered by a legend toggle's
// hidden-series set, or a series shape brush does not hit-test — see
// engine.ts's mountBrush).
export interface BrushSeriesPoints {
  seriesIndex: number;
  points: (readonly [number, number] | null)[];
}

// One entry per hit-testable box-shaped series (bar, candlestick — its
// rendered mark is a filled rect, so containment is the brush area
// OVERLAPPING that rect, not a point falling inside it).
export interface BrushSeriesRects {
  seriesIndex: number;
  rects: ({ x: number; y: number; width: number; height: number } | null)[];
}

export interface BrushHost {
  container: HTMLElement;
  svg: SVGSVGElement;
  getPlotRect(): ChartRect | null;
  getSeriesPoints(): BrushSeriesPoints[];
  getSeriesRects(): BrushSeriesRects[];
  onSelect(params: BrushSelectedParams): void;
}

export interface BrushController {
  setActiveType(type: BrushAreaType | null): void;
  getActiveType(): BrushAreaType | null;
  toggleKeep(): boolean;
  clear(): void;
  getAreas(): BrushArea[];
  destroy(): void;
}

function svgEl(
  tag: string,
  attrs: Record<string, string | number>,
): SVGElement {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

function pointInArea(
  point: readonly [number, number],
  area: BrushArea,
): boolean {
  const [[minX, minY], [maxX, maxY]] = area.range;
  const [px, py] = point;
  if (area.brushType === "lineX") return px >= minX && px <= maxX;
  if (area.brushType === "lineY") return py >= minY && py <= maxY;
  return px >= minX && px <= maxX && py >= minY && py <= maxY;
}

// Standard axis-aligned rect/rect overlap for "rect". lineX/lineY select
// along one axis only (same as pointInArea above) — a bar overlapping the
// dragged x-range counts for lineX regardless of its y extent, and
// vice versa for lineY.
function rectInArea(
  rect: { x: number; y: number; width: number; height: number },
  area: BrushArea,
): boolean {
  const [[minX, minY], [maxX, maxY]] = area.range;
  const rectMaxX = rect.x + rect.width;
  const rectMaxY = rect.y + rect.height;
  const overlapsX = rect.x <= maxX && rectMaxX >= minX;
  const overlapsY = rect.y <= maxY && rectMaxY >= minY;
  if (area.brushType === "lineX") return overlapsX;
  if (area.brushType === "lineY") return overlapsY;
  return overlapsX && overlapsY;
}

// ECharts' brushSelected.batch has one entry per registered brush COMPONENT
// (this build supports one, `option.brush`) — "selected" is the union of
// every current area, matching brushMode "multiple"'s accumulation and
// "single"'s one-area case alike.
function computeSelection(
  areas: BrushArea[],
  seriesPoints: BrushSeriesPoints[],
  seriesRects: BrushSeriesRects[],
  brushId: string,
): BrushSelectedParams {
  const fromPoints: BrushSelectedParams["batch"][number]["selected"] =
    seriesPoints.map(({ seriesIndex, points }) => {
      const dataIndex: number[] = [];
      points.forEach((point, index) => {
        if (point && areas.some((area) => pointInArea(point, area))) {
          dataIndex.push(index);
        }
      });
      return { seriesIndex, dataIndex };
    });
  const fromRects: BrushSelectedParams["batch"][number]["selected"] =
    seriesRects.map(({ seriesIndex, rects }) => {
      const dataIndex: number[] = [];
      rects.forEach((rect, index) => {
        if (rect && areas.some((area) => rectInArea(rect, area))) {
          dataIndex.push(index);
        }
      });
      return { seriesIndex, dataIndex };
    });
  const selected = [...fromPoints, ...fromRects].sort(
    (a, b) => a.seriesIndex - b.seriesIndex,
  );
  return {
    type: "brushSelected",
    batch: [
      {
        brushId,
        brushIndex: 0,
        brushName: "brush",
        areas: areas.slice(),
        selected,
      },
    ],
  };
}

export function renderBrush(
  option: BrushOption | undefined,
  host: BrushHost,
): BrushController {
  const brushId = option?.id ?? "brush-0";
  let areas: BrushArea[] = [];
  // ECharts defaults `brush.brushType` to "rect" — an `option.brush`
  // component is drag-active immediately, with no toolbox required. A
  // toolbox-only setup (no `option.brush` at all — `option` is undefined
  // here, see engine.ts's mountBrush()) starts inactive instead, driven only
  // by its buttons, matching ECharts' own toolbox-without-brush-component
  // behavior. "polygon" is not one of this build's supported draw modes.
  const defaultType = option ? (option.brushType ?? "rect") : null;
  let activeType: BrushAreaType | null =
    defaultType === "rect" || defaultType === "lineX" || defaultType === "lineY"
      ? defaultType
      : null;
  let keepMode = (option?.brushMode ?? "single") === "multiple";

  const areaLayer = document.createElementNS(SVG_NS, "g");
  areaLayer.setAttribute("class", "dc-brush-areas");
  host.svg.appendChild(areaLayer);

  const paint = () => {
    const itemStyle = option?.brushStyle;
    const fill = cssColor(itemStyle?.color, 0);
    const stroke = itemStyle?.borderColor
      ? cssColor(itemStyle.borderColor, 0)
      : themeColor(null, "shift-9", "primary");
    return { fill, stroke, borderWidth: itemStyle?.borderWidth ?? 1 };
  };

  const redrawAreas = () => {
    areaLayer.replaceChildren();
    const { fill, stroke, borderWidth } = paint();
    for (const area of areas) {
      const [[minX, minY], [maxX, maxY]] = area.range;
      areaLayer.appendChild(
        svgEl("rect", {
          x: minX,
          y: minY,
          width: Math.max(0, maxX - minX),
          height: Math.max(0, maxY - minY),
          fill,
          "fill-opacity": option?.brushStyle?.opacity ?? 0.15,
          stroke,
          "stroke-width": borderWidth,
        }),
      );
    }
  };

  const commit = (area: BrushArea) => {
    areas = keepMode ? [...areas, area] : [area];
    redrawAreas();
    host.onSelect(
      computeSelection(
        areas,
        host.getSeriesPoints(),
        host.getSeriesRects(),
        brushId,
      ),
    );
  };

  // ─── Drag interaction (mirrors the toolbox dataZoom rectangle select) ─────
  let drawLayer: HTMLDivElement | null = null;
  let selectionBox: HTMLDivElement | null = null;
  let dragStart: { x: number; y: number } | null = null;
  let plotRect: ChartRect | null = null;

  const pointerPos = (event: PointerEvent): { x: number; y: number } => {
    const bounds = host.container.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };

  const clampPos = (raw: { x: number; y: number }, rect: ChartRect) => ({
    x:
      activeType === "lineY"
        ? rect.x
        : Math.min(Math.max(raw.x, rect.x), rect.x + rect.width),
    y:
      activeType === "lineX"
        ? rect.y
        : Math.min(Math.max(raw.y, rect.y), rect.y + rect.height),
  });

  const clearDrag = () => {
    dragStart = null;
    if (selectionBox) {
      selectionBox.remove();
      selectionBox = null;
    }
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!plotRect) return;
    dragStart = clampPos(pointerPos(event), plotRect);
    selectionBox = document.createElement("div");
    selectionBox.style.position = "absolute";
    selectionBox.style.pointerEvents = "none";
    selectionBox.style.zIndex = String(TOOLBAR_Z_INDEX);
    selectionBox.style.border = `1px dashed ${themeColor(null, "shift-9", "primary")}`;
    const isLineX = activeType === "lineX";
    const isLineY = activeType === "lineY";
    selectionBox.style.top = `${isLineX ? plotRect.y : dragStart.y}px`;
    selectionBox.style.height = `${isLineX ? plotRect.height : 0}px`;
    selectionBox.style.left = `${isLineY ? plotRect.x : dragStart.x}px`;
    selectionBox.style.width = `${isLineY ? plotRect.width : 0}px`;
    host.container.appendChild(selectionBox);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (dragStart == null || !selectionBox || !plotRect) return;
    const current = clampPos(pointerPos(event), plotRect);
    if (activeType !== "lineX") {
      selectionBox.style.left = `${Math.min(dragStart.x, current.x)}px`;
      selectionBox.style.width = `${Math.abs(current.x - dragStart.x)}px`;
    }
    if (activeType !== "lineY") {
      selectionBox.style.top = `${Math.min(dragStart.y, current.y)}px`;
      selectionBox.style.height = `${Math.abs(current.y - dragStart.y)}px`;
    }
  };

  const onPointerUp = (event: PointerEvent) => {
    if (dragStart == null || !plotRect || !activeType) return;
    const rect = plotRect;
    const start = dragStart;
    const end = clampPos(pointerPos(event), rect);
    clearDrag();
    const movedX = Math.abs(end.x - start.x);
    const movedY = Math.abs(end.y - start.y);
    if (
      activeType === "rect" &&
      movedX < MIN_DRAG_PIXELS &&
      movedY < MIN_DRAG_PIXELS
    )
      return;
    if (activeType === "lineX" && movedX < MIN_DRAG_PIXELS) return;
    if (activeType === "lineY" && movedY < MIN_DRAG_PIXELS) return;
    commit({
      brushType: activeType,
      range: [
        [
          activeType === "lineY" ? rect.x : Math.min(start.x, end.x),
          activeType === "lineX" ? rect.y : Math.min(start.y, end.y),
        ],
        [
          activeType === "lineY"
            ? rect.x + rect.width
            : Math.max(start.x, end.x),
          activeType === "lineX"
            ? rect.y + rect.height
            : Math.max(start.y, end.y),
        ],
      ],
    });
  };

  const teardownDrawLayer = () => {
    clearDrag();
    if (!drawLayer) return;
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.removeEventListener("pointercancel", onPointerUp);
    drawLayer.remove();
    drawLayer = null;
    plotRect = null;
  };

  const setupDrawLayer = () => {
    teardownDrawLayer();
    if (!activeType) return;
    const rect = host.getPlotRect();
    if (!rect) return;
    plotRect = rect;
    const layer = document.createElement("div");
    layer.style.position = "absolute";
    layer.style.left = `${rect.x}px`;
    layer.style.top = `${rect.y}px`;
    layer.style.width = `${rect.width}px`;
    layer.style.height = `${rect.height}px`;
    layer.style.cursor = "crosshair";
    layer.style.touchAction = "none";
    layer.style.zIndex = String(TOOLBAR_Z_INDEX);
    layer.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerUp);
    host.container.appendChild(layer);
    drawLayer = layer;
  };

  // A `brush.brushType` set in the option activates its draw layer right
  // away, same as calling `setActiveType()` would.
  if (activeType) setupDrawLayer();

  return {
    setActiveType(type) {
      activeType = type;
      setupDrawLayer();
    },
    getActiveType: () => activeType,
    toggleKeep() {
      keepMode = !keepMode;
      return keepMode;
    },
    clear() {
      areas = [];
      redrawAreas();
      // ECharts fires brushSelected on clear too — with the resulting EMPTY
      // selection, so a linked view (e.g. a filtered table) resets.
      host.onSelect(
        computeSelection(
          areas,
          host.getSeriesPoints(),
          host.getSeriesRects(),
          brushId,
        ),
      );
    },
    getAreas: () => areas.slice(),
    destroy() {
      teardownDrawLayer();
      areaLayer.remove();
    },
  };
}
