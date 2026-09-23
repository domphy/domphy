import type { Device } from "@luma.gl/core";
import {
  layoutBarSeries,
  layoutCandlestickSeries,
} from "./coord/barPositions.js";
import type { ZoomWindow } from "./coord/grid.js";
import { resolveGrid } from "./coord/grid.js";
import { applyDatasetToSeries, fillCategoryAxes } from "./dataset/transform.js";
import { BarRenderer } from "./gl/BarRenderer.js";
import { CandlestickRenderer } from "./gl/CandlestickRenderer.js";
import {
  createColorResolver,
  cssColor,
  seriesColor,
  seriesPaletteFamily,
} from "./gl/color.js";
import { getDevice, releaseDevice } from "./gl/device.js";
import { computeGaugeArcs, GaugeRenderer } from "./gl/GaugeRenderer.js";
import { HeatmapRenderer } from "./gl/HeatmapRenderer.js";
import { LineRenderer } from "./gl/LineRenderer.js";
import {
  angleInPieSlice,
  computePieSlices,
  PieRenderer,
} from "./gl/PieRenderer.js";
import {
  computeRadarPolygons,
  pointInPolygon,
  RadarRenderer,
} from "./gl/RadarRenderer.js";
import { renderGrid3D } from "./gl/Renderer3D.js";
import { ScatterRenderer } from "./gl/ScatterRenderer.js";
import {
  createBrushStates,
  createItemStates,
  type ItemStateResolver,
  itemStatesEnabled,
  NO_ITEM_STATES,
  selectedModeOf,
  selectionKey,
} from "./itemStates.js";
import { renderMarksToSvg } from "./marks/index.js";
import { renderAxes, renderAxisPointer } from "./overlay/axes.js";
import { computeBoxplotLayout, renderBoxplot } from "./overlay/boxplot.js";
import type {
  BrushController,
  BrushSelectedParams,
  BrushSeriesPoints,
  BrushSeriesRects,
} from "./overlay/brush.js";
import { renderBrush } from "./overlay/brush.js";
import { renderCalendar } from "./overlay/calendar.js";
import { renderCustom } from "./overlay/custom.js";
import {
  reserveDataZoomSpace,
  setupDataZoom,
  setupInsideZoom,
} from "./overlay/datazoom.js";
import { renderEffectScatter } from "./overlay/effectscatter.js";
import {
  computeFunnelLayout,
  pointInFunnelTrapezoid,
  renderFunnel,
} from "./overlay/funnel.js";
import { renderGeoMap } from "./overlay/geomap.js";
import { renderGraph } from "./overlay/graph.js";
import { renderSeriesLabels, renderSeriesSymbols } from "./overlay/labels.js";
import { renderLegend } from "./overlay/legend.js";
import { renderLines } from "./overlay/lines.js";
import { renderParallel } from "./overlay/parallel.js";
import { renderPictorialBar } from "./overlay/pictorialbar.js";
import { renderSankey } from "./overlay/sankey.js";
import { renderThemeRiver } from "./overlay/themeriver.js";
import { renderTitle } from "./overlay/title.js";
import { renderToolbox } from "./overlay/toolbox.js";
import { createTooltip } from "./overlay/tooltip.js";
import { renderTreemap } from "./overlay/treemap.js";
import { renderVisualMap, visualMapForSeries } from "./overlay/visualmap.js";
import type {
  AxisOption,
  Bar3DSeriesOption,
  BarSeriesOption,
  BoxplotSeriesOption,
  ChartOption,
  ChartRect,
  CustomSeriesOption,
  EffectScatterSeriesOption,
  FunnelSeriesOption,
  GraphSeriesOption,
  Line3DSeriesOption,
  LineSeriesOption,
  LinesSeriesOption,
  MapSeriesOption,
  ParallelSeriesOption,
  PictorialBarSeriesOption,
  SankeySeriesOption,
  Scatter3DSeriesOption,
  SelectChangedParams,
  SeriesOption,
  Surface3DSeriesOption,
  ThemeRiverSeriesOption,
  TooltipParams,
  TreemapSeriesOption,
} from "./types.js";

// Accumulate y-values for line series sharing the same stack name.
// Each stacked series receives the sum of all previous series at the same data index.
//
// ECharts mixed-sign stacking: positive values accumulate upward from zero
// and negative values downward, so each stack tracks TWO running totals per
// data index (one per sign) instead of a single naive sum. Same-sign stacks
// behave exactly like the old single-total accumulation (the other sign's
// total never leaves zero).
//
// Also returns, per series (same index alignment as the input array), the
// "baseline" array — the running total BEFORE this series was added. This is
// the bottom edge of this series' area-fill band (matching gl/BarRenderer.ts's
// stacked bars, which draw each segment between the previous cumulative top
// and the new one rather than from zero). `undefined` for non-stacked series,
// which keep the plain zero baseline in LineRenderer.
// (`export` for direct unit tests; not re-exported from the package index.)
export function accumStackedLines(series: LineSeriesOption[]): {
  series: LineSeriesOption[];
  baselines: (number[] | undefined)[];
} {
  const sumsPos = new Map<string, number[]>(); // stackName → positive total per dataIndex
  const sumsNeg = new Map<string, number[]>(); // stackName → negative total per dataIndex
  const baselines: (number[] | undefined)[] = [];
  const stackedSeries = series.map((s) => {
    if (!s.stack) {
      baselines.push(undefined);
      return s;
    }
    if (!sumsPos.has(s.stack)) sumsPos.set(s.stack, []);
    if (!sumsNeg.has(s.stack)) sumsNeg.set(s.stack, []);
    const accPos = sumsPos.get(s.stack)!;
    const accNeg = sumsNeg.get(s.stack)!;
    const rawItems = s.data ?? [];
    // Snapshot the running total for every data index up front (defaulting
    // unseen indices to 0) so the baseline array always matches this series'
    // own data length, even for the first series in a stack. The snapshot
    // must read the sign-matched accumulator, so values are extracted first.
    const rawValues = rawItems.map((item: any) => {
      if (typeof item === "number") return item;
      if (Array.isArray(item)) return (item[1] as number) ?? 0;
      return typeof item?.value === "number" ? item.value : 0;
    });
    baselines.push(
      rawValues.map((yRaw, di) =>
        yRaw >= 0 ? (accPos[di] ?? 0) : (accNeg[di] ?? 0),
      ),
    );
    const newData = rawItems.map((item: any, di: number) => {
      const yRaw = rawValues[di];
      const acc = yRaw >= 0 ? accPos : accNeg;
      const prev = acc[di] ?? 0;
      const next = prev + yRaw;
      acc[di] = next;
      if (typeof item === "number") return next;
      if (Array.isArray(item)) return [item[0], next];
      return { ...item, value: next };
    });
    return { ...s, data: newData as any };
  });
  return { series: stackedSeries, baselines };
}

// Hit-test cursor position against all pie sectors. Geometry matches
// PieRenderer (startAngle / clockwise / hidden slices rescale).
function hitTestPie(
  series: any[],
  mx: number,
  my: number,
  width: number,
  height: number,
  allSeries: SeriesOption[],
  hiddenSeries: ReadonlySet<string>,
): TooltipParams | null {
  for (const s of series) {
    if (s.type !== "pie") continue;
    const slices = computePieSlices(s, width, height, hiddenSeries);
    if (slices.length === 0) continue;
    const { cx, cy, innerR, outerR } = slices[0];
    const dist = Math.hypot(mx - cx, my - cy);
    if (dist < innerR || dist > outerR) continue;

    const cursor = Math.atan2(my - cy, mx - cx);
    const globalIdx = allSeries.indexOf(s);
    for (const slice of slices) {
      if (!angleInPieSlice(cursor, slice.startAngle, slice.endAngle)) continue;
      return {
        componentType: "series",
        seriesType: "pie",
        seriesIndex: globalIdx,
        seriesName: s.name ?? "",
        name: slice.item.name ?? String(slice.dataIndex),
        dataIndex: slice.dataIndex,
        data: slice.item,
        value: slice.item.value,
        color: seriesColor(slice.dataIndex),
        percent: Math.round(slice.fraction * 1000) / 10,
      };
    }
  }
  return null;
}

function dataItemXY(
  item: unknown,
  dataIndex: number,
): { xVal: unknown; yVal: number } | null {
  if (typeof item === "number") return { xVal: dataIndex, yVal: item };
  if (Array.isArray(item)) {
    const yVal = item[1];
    if (typeof yVal !== "number") return null;
    return { xVal: item[0], yVal };
  }
  if (item && typeof item === "object") {
    const value = (item as { value?: unknown }).value;
    if (typeof value === "number") return { xVal: dataIndex, yVal: value };
  }
  return null;
}

// Item-trigger hit-test for bar / line. Bars use the mapped rect (category
// band × value-to-baseline); lines use a 20px nearest-point radius.
function hitTestCartesianItem(
  series: any[],
  mx: number,
  my: number,
  xScales: any[],
  yScales: any[],
  allSeries: SeriesOption[],
): TooltipParams | null {
  let nearest: TooltipParams | null = null;
  let nearestDist = 20;

  for (const s of series) {
    if (s.type !== "bar" && s.type !== "line") continue;
    const xScale = xScales[s.xAxisIndex ?? 0];
    const yScale = yScales[s.yAxisIndex ?? 0];
    if (!xScale || !yScale) continue;
    const isHorizontal = Math.abs(yScale.bandwidth()) > 0;
    const data: unknown[] = s.data ?? [];
    const globalIdx = allSeries.indexOf(s);

    for (let dataIndex = 0; dataIndex < data.length; dataIndex++) {
      const item = data[dataIndex];
      const xy = dataItemXY(item, dataIndex);
      if (!xy) continue;
      const px = isHorizontal ? xScale.map(xy.yVal) : xScale.map(xy.xVal);
      const py = isHorizontal ? yScale.map(dataIndex) : yScale.map(xy.yVal);

      let dist: number;
      if (s.type === "bar") {
        const band = Math.abs((isHorizontal ? yScale : xScale).bandwidth());
        const half = Math.max(band / 2, 8);
        if (isHorizontal) {
          if (Math.abs(my - py) > half) continue;
          const baseline = xScale.map(0);
          const lo = Math.min(px, baseline);
          const hi = Math.max(px, baseline);
          if (mx < lo - 2 || mx > hi + 2) continue;
        } else {
          if (Math.abs(mx - px) > half) continue;
          const baseline = yScale.map(0);
          const lo = Math.min(py, baseline);
          const hi = Math.max(py, baseline);
          if (my < lo - 2 || my > hi + 2) continue;
        }
        dist = Math.min(Math.abs(mx - px), Math.abs(my - py));
      } else {
        dist = Math.hypot(mx - px, my - py);
      }
      if (dist >= nearestDist) continue;
      nearestDist = dist;
      nearest = {
        componentType: "series",
        seriesType: s.type ?? "",
        seriesIndex: globalIdx,
        seriesName: s.name ?? "",
        name: s.name || String(xy.xVal ?? ""),
        dataIndex,
        data: item,
        value: xy.yVal,
        color: cssColor(s.color, globalIdx),
        percent: undefined,
      };
    }
  }
  return nearest;
}

function defaultTooltipTrigger(series: SeriesOption[]): "item" | "axis" {
  const pieLike = series.some(
    (s) =>
      s.type === "pie" ||
      s.type === "funnel" ||
      s.type === "treemap" ||
      s.type === "gauge" ||
      s.type === "radar",
  );
  const cartesian = series.some(
    (s) =>
      s.type === "line" ||
      s.type === "bar" ||
      s.type === "scatter" ||
      s.type === "heatmap" ||
      s.type === "candlestick" ||
      s.type === "boxplot" ||
      s.type === "pictorialBar",
  );
  return pieLike && !cartesian ? "item" : "axis";
}

// Accessible name for the chart's overlay SVG (role="img"). Title first — it
// is what a sighted reader sees — then a plain description of what is drawn.
function chartAccessibleName(option: ChartOption): string {
  const titles = Array.isArray(option.title)
    ? option.title
    : option.title
      ? [option.title]
      : [];
  const titleText = titles
    .map((t) => [t.text, t.subtext].filter(Boolean).join(" — "))
    .filter(Boolean)
    .join(", ");
  if (titleText) return titleText;

  const series = option.series ?? [];
  if (series.length === 0) return "Empty chart";
  const types = [...new Set(series.map((s) => s.type ?? "chart"))].join(", ");
  const names = series.map((s) => s.name).filter(Boolean);
  return names.length > 0
    ? `${types} chart: ${names.join(", ")}`
    : `${types} chart`;
}

function seriesNameSetKey(series: SeriesOption[]): string {
  return [
    ...new Set(series.map((s) => s.name ?? "").filter((name) => name !== "")),
  ]
    .sort()
    .join("\0");
}

function asAxisList(
  axis: AxisOption | AxisOption[] | undefined,
  fallback: AxisOption,
): AxisOption[] {
  if (Array.isArray(axis)) return axis;
  return axis ? [axis] : [fallback];
}

function bindDatasetOption(option: ChartOption): ChartOption {
  const series = applyDatasetToSeries(option.series ?? [], option.dataset);
  const next: ChartOption = { ...option, series };
  if (option.xAxis != null || option.dataset != null) {
    const xAxes = fillCategoryAxes(
      asAxisList(option.xAxis, { type: "category" }),
      series,
      "x",
    );
    next.xAxis = xAxes.length === 1 ? xAxes[0] : xAxes;
  }
  if (option.yAxis != null) {
    const yAxes = fillCategoryAxes(
      asAxisList(option.yAxis, { type: "value" }),
      series,
      "y",
    );
    next.yAxis = yAxes.length === 1 ? yAxes[0] : yAxes;
  }
  return next;
}

// Hit-test cursor position against scatter data points. Returns params for nearest point within 20px or null.
function hitTestScatter(
  series: any[],
  mx: number,
  my: number,
  xScales: any[],
  yScales: any[],
  allSeries: SeriesOption[],
): TooltipParams | null {
  let nearest: TooltipParams | null = null;
  let nearestDist = 20; // px radius threshold

  for (const s of series) {
    if (s.type !== "scatter") continue;
    const xScale = xScales[s.xAxisIndex ?? 0];
    const yScale = yScales[s.yAxisIndex ?? 0];
    if (!xScale || !yScale) continue;

    const data: any[] = s.data ?? [];
    const globalIdx = allSeries.indexOf(s);

    for (let di = 0; di < data.length; di++) {
      const item = data[di];
      if (!Array.isArray(item)) continue;
      const xVal = item[0] as number;
      const yVal = item[1] as number;
      const px = xScale.map(xVal);
      const py = yScale.map(yVal);
      const d = Math.hypot(mx - px, my - py);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = {
          componentType: "series",
          seriesType: "scatter",
          seriesIndex: globalIdx,
          seriesName: s.name ?? "",
          name: String(xVal),
          dataIndex: di,
          data: item,
          value: [xVal, yVal],
          color: cssColor(s.color, globalIdx),
          percent: undefined,
        };
      }
    }
  }
  return nearest;
}

// Item-trigger hit-test for heatmap: a rect per cell, same bandwidth math
// HeatmapRenderer.ts draws from (bw/bh — see its render()).
function hitTestHeatmapItem(
  series: any[],
  mx: number,
  my: number,
  xScales: any[],
  yScales: any[],
  allSeries: SeriesOption[],
): TooltipParams | null {
  for (const s of series) {
    if (s.type !== "heatmap") continue;
    if (
      s.coordinateSystem !== undefined &&
      s.coordinateSystem !== "cartesian2d"
    )
      continue;
    const xScale = xScales[s.xAxisIndex ?? 0];
    const yScale = yScales[s.yAxisIndex ?? 0];
    if (!xScale || !yScale) continue;
    const halfW = (xScale.bandwidth() || 20) / 2;
    const halfH =
      (Math.abs(yScale.bandwidth ? yScale.bandwidth() : 20) || 20) / 2;
    const data: [number, number, number][] = s.data ?? [];
    const globalIdx = allSeries.indexOf(s);
    for (let di = 0; di < data.length; di++) {
      const [xVal, yVal, value] = data[di];
      if (!Number.isFinite(value)) continue;
      const px = xScale.map(xVal);
      const py = yScale.map(yVal);
      if (Math.abs(mx - px) > halfW || Math.abs(my - py) > halfH) continue;
      return {
        componentType: "series",
        seriesType: "heatmap",
        seriesIndex: globalIdx,
        seriesName: s.name ?? "",
        name: `${xVal}, ${yVal}`,
        dataIndex: di,
        data: data[di],
        value,
        color: cssColor(s.color, globalIdx),
        percent: undefined,
      };
    }
  }
  return null;
}

// Item-trigger hit-test for candlestick: the same body+wick bounding box
// coord/barPositions.ts#layoutCandlestickSeries() derives for the renderer
// and for brush hit-testing — one geometry source, three consumers.
function hitTestCandlestickItem(
  series: any[],
  mx: number,
  my: number,
  xScales: any[],
  yScales: any[],
  allSeries: SeriesOption[],
): TooltipParams | null {
  const candleSeries = series.filter((s) => s.type === "candlestick");
  if (candleSeries.length === 0) return null;
  const positions = layoutCandlestickSeries(candleSeries, xScales, yScales);
  for (let localIdx = 0; localIdx < candleSeries.length; localIdx++) {
    const s = candleSeries[localIdx];
    const rects = positions.get(localIdx);
    if (!rects) continue;
    const globalIdx = allSeries.indexOf(s);
    const data = s.data ?? [];
    for (let di = 0; di < rects.length; di++) {
      const rect = rects[di];
      if (!rect) continue;
      if (
        mx < rect.x ||
        mx > rect.x + rect.width ||
        my < rect.y ||
        my > rect.y + rect.height
      )
        continue;
      return {
        componentType: "series",
        seriesType: "candlestick",
        seriesIndex: globalIdx,
        seriesName: s.name ?? "",
        name: String(di),
        dataIndex: di,
        data: data[di],
        value: data[di],
        color: cssColor(s.color, globalIdx),
        percent: undefined,
      };
    }
  }
  return null;
}

// Item-trigger hit-test for boxplot: the whole box+whisker bounding extent,
// the same geometry overlay/boxplot.ts#computeBoxplotLayout() draws from.
function hitTestBoxplotItem(
  series: any[],
  mx: number,
  my: number,
  xScales: any[],
  yScales: any[],
  allSeries: SeriesOption[],
  hiddenSeries: ReadonlySet<string>,
): TooltipParams | null {
  const boxSeries = series.filter((s) => s.type === "boxplot");
  if (boxSeries.length === 0) return null;
  const boxes = computeBoxplotLayout(boxSeries, xScales, yScales, hiddenSeries);
  for (const box of boxes) {
    if (mx < box.xLeft || mx > box.xRight || my < box.yTop || my > box.yBottom)
      continue;
    const s = boxSeries[box.seriesIndex];
    const globalIdx = allSeries.indexOf(s);
    const item = (s.data ?? [])[box.dataIndex];
    return {
      componentType: "series",
      seriesType: "boxplot",
      seriesIndex: globalIdx,
      seriesName: s.name ?? "",
      name: String(box.dataIndex),
      dataIndex: box.dataIndex,
      data: item,
      value: item,
      color: seriesColor(box.seriesIndex),
      percent: undefined,
    };
  }
  return null;
}

// Item-trigger hit-test for radar: point-in-polygon per shape, the same
// polygon RadarRenderer.ts#computeRadarPolygons() draws from.
function hitTestRadarItem(
  series: any[],
  mx: number,
  my: number,
  width: number,
  height: number,
  allSeries: SeriesOption[],
  radars: any[],
): TooltipParams | null {
  const radarSeries = series.filter((s) => s.type === "radar");
  if (radarSeries.length === 0) return null;
  const layouts = computeRadarPolygons(radarSeries, radars, width, height);
  for (const layout of layouts) {
    if (!pointInPolygon(mx, my, layout.polygon)) continue;
    const s = radarSeries[layout.seriesIndex];
    const globalIdx = allSeries.indexOf(s);
    const item = (s.data ?? [])[layout.dataIndex];
    return {
      componentType: "series",
      seriesType: "radar",
      seriesIndex: globalIdx,
      seriesName: s.name ?? "",
      name: (item as any)?.name ?? String(layout.dataIndex),
      dataIndex: layout.dataIndex,
      data: item,
      value: (item as any)?.value,
      color: cssColor(s.color, globalIdx + layout.dataIndex),
      percent: undefined,
    };
  }
  return null;
}

// Item-trigger hit-test for funnel: point-in-trapezoid per slice, the same
// trapezoid overlay/funnel.ts#computeFunnelLayout() draws from.
function hitTestFunnelItem(
  series: any[],
  mx: number,
  my: number,
  width: number,
  height: number,
  allSeries: SeriesOption[],
  hiddenSeries: ReadonlySet<string>,
): TooltipParams | null {
  const funnelSeries = series.filter((s) => s.type === "funnel");
  if (funnelSeries.length === 0) return null;
  const slices = computeFunnelLayout(funnelSeries, width, height, hiddenSeries);
  for (const slice of slices) {
    if (!pointInFunnelTrapezoid(mx, my, slice)) continue;
    const s = funnelSeries[slice.seriesIndex];
    const globalIdx = allSeries.indexOf(s);
    return {
      componentType: "series",
      seriesType: "funnel",
      seriesIndex: globalIdx,
      seriesName: s.name ?? "",
      name: slice.item.name ?? String(slice.dataIndex),
      dataIndex: slice.dataIndex,
      data: slice.item,
      value: slice.item.value,
      color: slice.color,
      percent: undefined,
    };
  }
  return null;
}

// Item-trigger hit-test for gauge: annulus + angular-sweep test against the
// progress arc, the same geometry GaugeRenderer.ts#computeGaugeArcs() draws
// from. Reuses angleInPieSlice's direction-agnostic sweep test (PieRenderer.ts)
// with the cursor angle computed in gauge's own convention (screen y flipped).
function hitTestGaugeItem(
  series: any[],
  mx: number,
  my: number,
  width: number,
  height: number,
  allSeries: SeriesOption[],
): TooltipParams | null {
  const gaugeSeries = series.filter((s) => s.type === "gauge");
  if (gaugeSeries.length === 0) return null;
  const arcs = computeGaugeArcs(gaugeSeries, width, height);
  // Later items are drawn on top (GaugeRenderer.ts's forEach order), so
  // prefer the last matching arc — it is the one actually visible.
  for (let i = arcs.length - 1; i >= 0; i--) {
    const arc = arcs[i];
    const dist = Math.hypot(mx - arc.cx, my - arc.cy);
    if (dist < arc.innerRadius || dist > arc.radius) continue;
    const cursor = Math.atan2(-(my - arc.cy), mx - arc.cx);
    if (!angleInPieSlice(cursor, arc.startRad, arc.progressEndRad)) continue;
    const s = gaugeSeries[arc.seriesIndex];
    const globalIdx = allSeries.indexOf(s);
    const item = (s.data ?? [])[arc.dataIndex];
    return {
      componentType: "series",
      seriesType: "gauge",
      seriesIndex: globalIdx,
      seriesName: s.name ?? "",
      name: (item as any)?.name ?? String(arc.dataIndex),
      dataIndex: arc.dataIndex,
      data: item,
      value: arc.value,
      color: cssColor(s.color, globalIdx + arc.dataIndex),
      percent: undefined,
    };
  }
  return null;
}

/** Series types with a real renderer path in this engine. */
const IMPLEMENTED_SERIES_TYPES = new Set([
  "line",
  "bar",
  "scatter",
  "pie",
  "radar",
  "heatmap",
  "candlestick",
  "gauge",
  "boxplot",
  "funnel",
  "treemap",
  "sankey",
  "graph",
  "parallel",
  "themeRiver",
  "map",
  "lines",
  "effectScatter",
  "pictorialBar",
  "scatter3D",
  "bar3D",
  "line3D",
  "surface3D",
  "custom",
]);

/**
 * ECharts-compatible option keys that are typed for interop but not rendered.
 * Consumers should treat these as unsupported until implemented — we warn so
 * production charts do not fail silently.
 */
// Dedupe by message: setOption() runs on every option update, and without
// dedupe a chart with an unsupported key would spam the console on each one.
const unsupportedWarned = new Set<string>();
function warnOnce(message: string): void {
  if (unsupportedWarned.has(message)) return;
  unsupportedWarned.add(message);
  console.warn(message);
}

/**
 * Series-level keys that ask for a VISIBLE behavior and get nothing: measured
 * by grepping every declared key of every *SeriesOption in types.ts for a read
 * in src/ (`node scripts/inert-keys.mjs`). Keys that only affect paint order,
 * timing or a performance hint — `z`/`zlevel`/`silent`/`animation*`/
 * `progressive*`/`large*` — are left out on purpose: they would fire on almost
 * every pasted ECharts option without telling the user anything about what
 * they see. Every unimplemented key also carries a `@deprecated` marker in
 * types.ts, and the full measured list is in docs/chart/vs-echarts.md.
 * `emphasis`/`blur`/`select` left this table when itemStates.ts landed.
 */
const UNSUPPORTED_SERIES_KEYS = [
  "labelLine",
  "labelLayout",
  "clip",
  "endLabel",
  "showBackground",
  "backgroundStyle",
  "realtimeSort",
  "avoidLabelOverlap",
  "dimensions",
  "seriesLayoutBy",
] as const;

function warnUnsupportedChartOption(option: ChartOption): void {
  // rect/lineX/lineY are implemented (see mountBrush()/overlay/brush.ts);
  // polygon (freehand area) is not — hit-testing an arbitrary path is a
  // materially different, unimplemented problem from a rect/line range.
  if (option.brush?.brushType === "polygon") {
    warnOnce(
      "@domphy/chart: option.brush's brushType 'polygon' is not implemented — only 'rect'/'lineX'/'lineY' are; it has no effect.",
    );
  }
  const polarSeries = (
    Array.isArray(option.series)
      ? option.series
      : option.series
        ? [option.series]
        : []
  ).some(
    (entry) =>
      (entry as { coordinateSystem?: string }).coordinateSystem === "polar",
  );
  if (option.polar != null && polarSeries) {
    warnOnce(
      "@domphy/chart: polar series rendering is typed for ECharts interop but is not implemented yet; option.polar has no effect.",
    );
  }
  // TooltipOption keys that are typed for ECharts interop but ignored.
  // (backgroundColor/borderColor/borderWidth/padding/textStyle/extraCssText/
  // className/confine/appendToBody ARE implemented — do not warn for those.)
  const UNSUPPORTED_TOOLTIP_KEYS = [
    "position",
    "renderMode",
    "enterable",
    "alwaysShowContent",
    "showDelay",
    "hideDelay",
    "triggerOn",
    "transitionDuration",
    "order",
    "showContent",
  ] as const;
  const tooltip = option.tooltip;
  if (tooltip != null) {
    for (const key of UNSUPPORTED_TOOLTIP_KEYS) {
      if ((tooltip as Record<string, unknown>)[key] != null) {
        warnOnce(
          `@domphy/chart: option.tooltip.${key} is typed for ECharts interop but is not implemented yet; it has no effect.`,
        );
      }
    }
  }
  const series = Array.isArray(option.series)
    ? option.series
    : option.series
      ? [option.series]
      : [];
  for (const entry of series) {
    const type = (entry as { type?: string })?.type;
    if (type == null) continue;
    if (!IMPLEMENTED_SERIES_TYPES.has(type)) {
      warnOnce(
        `@domphy/chart: series type "${type}" is not implemented; the series is ignored. Supported: ${[...IMPLEMENTED_SERIES_TYPES].join(", ")}.`,
      );
    }
    for (const key of UNSUPPORTED_SERIES_KEYS) {
      if ((entry as unknown as Record<string, unknown>)[key] != null) {
        warnOnce(
          `@domphy/chart: series.${key} is typed for ECharts interop but is not rendered; it has no effect.`,
        );
      }
    }
  }
}

export class ChartEngine {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private backsvg: SVGSVGElement;
  private overlaysvg: SVGSVGElement;
  private device: Device | null = null;
  private option: ChartOption | null = null;
  private width = 0;
  private height = 0;

  // Renderers
  private barRenderer: BarRenderer | null = null;
  private lineRenderer: LineRenderer | null = null;
  private scatterRenderer: ScatterRenderer | null = null;
  private pieRenderer: PieRenderer | null = null;
  private radarRenderer: RadarRenderer | null = null;
  private heatmapRenderer: HeatmapRenderer | null = null;
  private candlestickRenderer: CandlestickRenderer | null = null;
  private gaugeRenderer: GaugeRenderer | null = null;

  private tooltipCtrl: ReturnType<typeof createTooltip> | null = null;
  private tooltipCleanup: (() => void) | null = null;
  private toolboxCleanup: (() => void) | null = null;
  private brushCleanup: (() => void) | null = null;
  private brushController: BrushController | null = null;
  private brushSelectedHandlers = new Set<
    (params: BrushSelectedParams) => void
  >();
  // The last computed brush selection, for inBrush/outOfBrush dimming on the
  // next render() — updated from renderBrush's onSelect callback, which
  // fires synchronously on every commit/clear (see mountBrush()).
  private brushSelectedKeys: Set<string> = new Set();
  private brushedSeriesIndices: Set<number> = new Set();
  private brushHasAreas = false;
  // The option as the user passed it. The toolbox's magicType/dataView render
  // a derived option through applyOption(), and "restore" must come back to
  // this one, not to whatever the toolbox last applied.
  private originalOption: ChartOption | null = null;
  private applyingDerivedOption = false;
  private lastGridRect: ChartRect | null = null;
  private contextLossCleanup: (() => void) | null = null;
  private clickHandlers = new Set<(params: TooltipParams) => void>();
  private selectChangedHandlers = new Set<
    (params: SelectChangedParams) => void
  >();
  private contextLost = false;
  private destroyed = false;

  // Interactive state
  private hiddenSeries: Set<string> = new Set();
  private seriesNameKey = "";
  private xZoomMap: Map<number, ZoomWindow> = new Map();
  private yZoomMap: Map<number, ZoomWindow> = new Map();
  private dataZoomCleanup: (() => void) | null = null;
  private insideZoomCleanup: (() => void) | null = null;
  // Cached dataZoom slider handle + the option/size key it was built for, so
  // re-renders sync thumbs instead of re-creating the sliders (see render()).
  private dataZoomSliders: {
    cleanup: () => void;
    update: (xAxisIndex: number, state: ZoomWindow) => void;
  } | null = null;
  private dataZoomKey = "";

  // ─── Interaction states (emphasis / blur / select) ────────────────────────
  // Off unless a series actually declares emphasis/blur/select/selectedMode:
  // tracking hover means re-rendering when the hovered datum changes, and an
  // ECharts option that says nothing about emphasis should cost nothing.
  private itemStatesOn = false;
  private hoverItem: { seriesIndex: number; dataIndex: number } | null = null;
  private legendFocusIndex: number | null = null;
  private selectedItems = new Set<string>();
  private stateRenderQueued = false;
  // The legend highlight that the last render() actually painted. render()
  // rebuilds the legend DOM, which makes the browser replay blur/focus (and
  // pointerout/pointerover) on the replacement nodes; those callbacks net out
  // to the state already on screen, so without this they would schedule an
  // endless render loop. Measured in Chromium before the guard: focusing one
  // legend item drove 200+ renders and froze the page.
  private paintedFocusIndex: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;

    // Background SVG (behind WebGL canvas) — for grid lines only
    const backsvg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    ) as SVGSVGElement;
    backsvg.style.cssText =
      "position:absolute;top:0;left:0;pointer-events:none;overflow:visible;";
    container.appendChild(backsvg);
    this.backsvg = backsvg;

    const canvas = document.createElement("canvas");
    canvas.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;";
    canvas.setAttribute("aria-hidden", "true");
    container.appendChild(canvas);
    this.canvas = canvas;

    const svg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    ) as SVGSVGElement;
    // pointer-events:none on SVG itself, but legend/datazoom groups override to all
    svg.style.cssText =
      "position:absolute;top:0;left:0;pointer-events:none;overflow:visible;";
    container.appendChild(svg);
    this.overlaysvg = svg;

    this.bindContextLoss();
  }

  // A WebGL context is not permanent: the browser drops it on a GPU reset, on
  // tab backgrounding under memory pressure, and once a page exceeds the
  // per-page context limit (~16 in Chrome — reachable with a dashboard of
  // charts). Without this the canvas stays blank forever. The default action
  // of `webglcontextlost` makes the loss permanent, so it must be prevented
  // for the browser to fire `webglcontextrestored` at all.
  private bindContextLoss(): void {
    const onLost = (event: Event) => {
      // Preventing the default is what lets the browser fire
      // `webglcontextrestored` at all; without it the loss is permanent.
      event.preventDefault();
      this.contextLost = true;
      // Every GPU resource died with the context. The renderer wrappers hold
      // dangling Buffer/Model handles, so drop them — calling destroy() on
      // them would just replay invalid GL calls against the dead context.
      this.barRenderer = null;
      this.lineRenderer = null;
      this.scatterRenderer = null;
      this.pieRenderer = null;
      this.radarRenderer = null;
      this.heatmapRenderer = null;
      this.candlestickRenderer = null;
      this.gaugeRenderer = null;
    };
    const onRestored = () => {
      if (this.destroyed || !this.device) return;
      // This listener is registered in the constructor, i.e. before luma.gl's
      // own — and the browser runs them in registration order. Rebuilding
      // Models here synchronously would compile them against the context luma
      // has not re-adopted yet ("useProgram: object does not belong to this
      // context"). Yield one task so luma's handler lands first.
      setTimeout(() => this.restoreAfterContextLoss(), 0);
    };
    this.canvas.addEventListener("webglcontextlost", onLost);
    this.canvas.addEventListener("webglcontextrestored", onRestored);
    this.contextLossCleanup = () => {
      this.canvas.removeEventListener("webglcontextlost", onLost);
      this.canvas.removeEventListener("webglcontextrestored", onRestored);
    };
  }

  private restoreAfterContextLoss(): void {
    if (this.destroyed) return;
    // Rebuilding Models on the old Device is not enough: luma.gl caches every
    // compiled RenderPipeline on the Device (PipelineFactory lives in the
    // device's module data), so a Model built after the loss gets handed the
    // pre-loss program and the driver rejects it with "useProgram: object does
    // not belong to this context". A new canvas gives a new context, a new
    // Device and therefore an empty pipeline cache — verified in Chromium via
    // WEBGL_lose_context.
    const deadCanvas = this.canvas;
    const canvas = document.createElement("canvas");
    canvas.style.cssText = deadCanvas.style.cssText;
    canvas.setAttribute("aria-hidden", "true");
    deadCanvas.replaceWith(canvas);
    this.canvas = canvas;
    releaseDevice(deadCanvas);
    this.device = null;
    // Re-arm loss handling on the canvas that is actually live now.
    this.contextLossCleanup?.();
    this.bindContextLoss();

    getDevice(canvas)
      .then((device) => {
        if (this.destroyed) return;
        this.contextLost = false;
        this.finishInit(device);
        this.setSize(this.width, this.height);
        this.render();
      })
      .catch((error: unknown) => {
        console.error(
          "@domphy/chart: WebGL context was restored but the device could not be re-created.",
          error,
        );
      });
  }

  async init(): Promise<void> {
    const device = await getDevice(this.canvas);
    this.finishInit(device);
  }

  // Isolated so tests can exercise the destroy-vs-getDevice race without a
  // real WebGL device: destroy() then finishInit() must be a no-op.
  private finishInit(device: Device): void {
    if (this.destroyed) return;
    this.device = device;
    this.barRenderer = new BarRenderer(this.device);
    this.lineRenderer = new LineRenderer(this.device);
    this.scatterRenderer = new ScatterRenderer(this.device);
    this.pieRenderer = new PieRenderer(this.device);
    this.radarRenderer = new RadarRenderer(this.device);
    this.heatmapRenderer = new HeatmapRenderer(this.device);
    this.candlestickRenderer = new CandlestickRenderer(this.device);
    this.gaugeRenderer = new GaugeRenderer();
  }

  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    const dpr = window.devicePixelRatio || 1;
    const physW = Math.round(width * dpr);
    const physH = Math.round(height * dpr);
    this.canvas.width = physW;
    this.canvas.height = physH;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    // Sync luma.gl's drawingBufferWidth/Height so beginRenderPass doesn't reset canvas dims
    (this.device as any)?.canvasContext?.setDrawingBufferSize?.(physW, physH);
    this.backsvg.setAttribute("width", String(width));
    this.backsvg.setAttribute("height", String(height));
    this.overlaysvg.setAttribute("width", String(width));
    this.overlaysvg.setAttribute("height", String(height));
    if (this.brushCleanup) this.mountBrush();
    if (this.toolboxCleanup) this.mountToolbox();
  }

  setOption(option: ChartOption): void {
    // A node removed before async init resolves must not revive the engine.
    if (this.destroyed) return;
    // Only a real user call re-baselines "restore"; an option the toolbox
    // derived (magicType, dataView edit) must not become the restore target.
    if (!this.applyingDerivedOption) this.originalOption = option;
    // ECharts allows `series` as a single object; every render path below
    // iterates it as an array, so normalize once up front instead of crashing
    // on `.filter` later.
    const normalizedOption: ChartOption = Array.isArray(option.series)
      ? option
      : { ...option, series: option.series ? [option.series] : [] };
    const preparedOption = bindDatasetOption(normalizedOption);
    this.option = preparedOption;

    // Honest surface: type/docs may list ECharts-compatible keys that are not
    // implemented yet. Warn once per option so silent no-ops do not ship as
    // "working" enterprise charts.
    warnUnsupportedChartOption(preparedOption);

    // Interaction states are opt-in: a series must declare emphasis, blur,
    // select or selectedMode. Hover tracking re-renders the chart whenever the
    // hovered datum changes, so an option that never asks for emphasis pays
    // nothing for it.
    this.itemStatesOn = itemStatesEnabled(preparedOption.series ?? []);
    // A new option means new data indices; a stale hover or selection would
    // paint the wrong datum.
    this.hoverItem = null;
    this.legendFocusIndex = null;

    // Reset zoom on every option replace. Legend toggles persist unless the
    // set of series names actually changed (a data-only refresh must not
    // un-hide what the user just clicked).
    this.xZoomMap = new Map();
    this.yZoomMap = new Map();
    const nameKey = seriesNameSetKey(preparedOption.series ?? []);
    if (nameKey !== this.seriesNameKey) {
      this.hiddenSeries = new Set();
      // Selection is keyed by (seriesIndex, dataIndex); a different set of
      // series is a different index space, so keeping it would highlight
      // unrelated data. A data-only refresh keeps the user's selection.
      this.selectedItems.clear();
      this.seriesNameKey = nameKey;

      // Seed legend toggles from `legend.selected` (ECharts semantics: a name
      // mapped to `false` starts hidden and is restored by clicking the legend).
      const initialLegends = Array.isArray(preparedOption.legend)
        ? preparedOption.legend
        : preparedOption.legend
          ? [preparedOption.legend]
          : [];
      for (const legend of initialLegends) {
        if (!legend.selected) continue;
        for (const [name, selected] of Object.entries(legend.selected)) {
          if (selected === false) this.hiddenSeries.add(name);
        }
      }

      // ECharts selectedMode "single" constrains the INITIAL state too: at most
      // one series may start visible. When the `selected` map (or the default
      // all-visible state) leaves several visible, the first one in series
      // order wins and the rest start hidden — matching the last-click-wins
      // toggle behavior in render().
      for (const legend of initialLegends) {
        if (legend.selectedMode !== "single") continue;
        const names = (preparedOption.series ?? [])
          .map((s) => s.name ?? "")
          .filter((n) => n !== "");
        const visible = names.filter((n) => !this.hiddenSeries.has(n));
        for (const extra of visible.slice(1)) this.hiddenSeries.add(extra);
      }
    }

    // Initialize DataZoom state from option (skip "inside" — it has no initial range)
    const dataZooms = Array.isArray(option.dataZoom)
      ? option.dataZoom
      : option.dataZoom
        ? [option.dataZoom]
        : [];
    for (const dz of dataZooms) {
      if (dz.type === "inside") continue;
      // ECharts: a dataZoom with a yAxisIndex and no xAxisIndex controls the
      // y axis instead (ChartView.js's axisIndicesMap). A component with
      // neither set defaults to x (this build's pre-existing behavior).
      const window = { start: dz.start ?? 0, end: dz.end ?? 100 };
      if (dz.yAxisIndex !== undefined && dz.xAxisIndex === undefined) {
        const yIndex = typeof dz.yAxisIndex === "number" ? dz.yAxisIndex : 0;
        this.yZoomMap.set(yIndex, window);
      } else {
        const xIndex = typeof dz.xAxisIndex === "number" ? dz.xAxisIndex : 0;
        this.xZoomMap.set(xIndex, window);
      }
    }

    // Tooltip
    this.tooltipCleanup?.();
    this.tooltipCleanup = null;
    if (this.tooltipCtrl) {
      this.tooltipCtrl.destroy();
      this.tooltipCtrl = null;
    }
    const tooltipOption = {
      ...(normalizedOption.tooltip ?? {}),
      trigger:
        normalizedOption.tooltip?.trigger ??
        defaultTooltipTrigger(preparedOption.series ?? []),
    };
    if (normalizedOption.tooltip?.show !== false) {
      this.tooltipCtrl = createTooltip(this.container, tooltipOption);
    }
    // Bound unconditionally: `on("click")` must work with tooltip.show: false
    // too. Without a tooltip controller the move handler returns immediately,
    // and the click handler returns immediately while nothing is subscribed,
    // so no hit-testing happens for a chart nobody is listening to.
    this.bindTooltipEvents({ ...preparedOption, tooltip: tooltipOption });

    this.render();
    this.mountBrush();
    this.mountToolbox();
  }

  // The toolbox snapshots width/height/plot-rect per mount, so it is rebuilt
  // after every option change and every resize.
  private mountToolbox(): void {
    this.toolboxCleanup?.();
    this.toolboxCleanup = null;
    const toolbox = this.option?.toolbox;
    if (!toolbox) return;
    const xAxisCount = Math.max(
      1,
      Array.isArray(this.option?.xAxis) ? this.option.xAxis.length : 1,
    );
    const yAxisCount = Math.max(
      1,
      Array.isArray(this.option?.yAxis) ? this.option.yAxis.length : 1,
    );
    this.toolboxCleanup = renderToolbox(toolbox, {
      container: this.container,
      canvas: this.canvas,
      svgLayers: [this.backsvg, this.overlaysvg],
      width: this.width,
      height: this.height,
      getOriginalOption: () => this.originalOption ?? this.option ?? {},
      getCurrentOption: () => this.option ?? {},
      applyOption: (option) => {
        this.applyingDerivedOption = true;
        try {
          this.setOption(option);
        } finally {
          this.applyingDerivedOption = false;
        }
      },
      restore: () => {
        this.hiddenSeries = new Set();
        this.seriesNameKey = "";
        this.xZoomMap = new Map();
        this.yZoomMap = new Map();
        if (this.originalOption) this.setOption(this.originalOption);
      },
      getPlotRect: () => this.lastGridRect,
      // `window === null` resets both axes (the toolbox "back" button);
      // otherwise only the axis kind present in `window` is replaced — a
      // y-only drag (x disabled via xAxisIndex:'none') must not clear an
      // existing x zoom, and vice versa.
      setZoomWindow: (window) => {
        if (window === null) {
          this.xZoomMap = new Map();
          this.yZoomMap = new Map();
        } else {
          if (window.x) {
            this.xZoomMap = new Map();
            for (let xIndex = 0; xIndex < xAxisCount; xIndex++) {
              this.xZoomMap.set(xIndex, window.x);
            }
          }
          if (window.y) {
            this.yZoomMap = new Map();
            for (let yIndex = 0; yIndex < yAxisCount; yIndex++) {
              this.yZoomMap.set(yIndex, window.y);
            }
          }
        }
        this.render();
      },
      brush: this.brushController
        ? {
            setActiveType: (type) => this.brushController?.setActiveType(type),
            getActiveType: () => this.brushController?.getActiveType() ?? null,
            toggleKeep: () => this.brushController?.toggleKeep() ?? false,
            clear: () => this.brushController?.clear(),
          }
        : undefined,
    });
  }

  // Pixel position of every datum of every point-shaped hit-testable series
  // (scatter, line), for brush area containment. Scoped to coordinateSystem
  // "cartesian2d" (the default). A stacked line series is routed through the
  // SAME accumStackedLines() the actual LineRenderer render call uses, so
  // its hit-tested position is the cumulative one it is actually drawn at,
  // not its own raw datum.
  private brushSeriesPoints(): BrushSeriesPoints[] {
    const option = this.option;
    if (!option) return [];
    const allSeries = option.series ?? [];
    const grids = Array.isArray(option.grid)
      ? option.grid
      : option.grid
        ? [option.grid]
        : [{}];
    const xAxes = Array.isArray(option.xAxis)
      ? option.xAxis
      : option.xAxis
        ? [option.xAxis]
        : [{}];
    const yAxes = Array.isArray(option.yAxis)
      ? option.yAxis
      : option.yAxis
        ? [option.yAxis]
        : [{}];
    const { xScales, yScales } = resolveGrid(
      grids as any,
      xAxes as any,
      yAxes as any,
      allSeries.filter((s) => !s.name || !this.hiddenSeries.has(s.name)),
      this.width,
      this.height,
      this.xZoomMap,
      this.yZoomMap,
    );
    // Cumulative data for stacked line series, keyed by their position in
    // `allSeries` — same accumulator engine.ts's own render() feeds
    // LineRenderer with.
    const stackedLineDataBySeriesIndex = new Map<number, unknown[]>();
    const lineIndices: number[] = [];
    allSeries.forEach((s, index) => {
      if (s.type === "line") lineIndices.push(index);
    });
    if (lineIndices.length > 0) {
      const { series: stacked } = accumStackedLines(
        lineIndices.map((index) => allSeries[index] as LineSeriesOption),
      );
      stacked.forEach((s, localIndex) => {
        stackedLineDataBySeriesIndex.set(lineIndices[localIndex], s.data ?? []);
      });
    }
    const result: BrushSeriesPoints[] = [];
    allSeries.forEach((s, seriesIndex) => {
      if (s.name && this.hiddenSeries.has(s.name)) return;
      if (s.type !== "scatter" && s.type !== "line") return;
      const coordinateSystem = (s as any).coordinateSystem;
      if (coordinateSystem !== undefined && coordinateSystem !== "cartesian2d")
        return;
      const xAxisIndex = (s as any).xAxisIndex ?? 0;
      const yAxisIndex = (s as any).yAxisIndex ?? 0;
      const xScale = xScales[xAxisIndex];
      const yScale = yScales[yAxisIndex];
      if (!xScale || !yScale) return;
      // Mirrors coord/grid.ts's scalarValueDim: a horizontal chart (category
      // y axis, non-category x axis) reads a scalar datum as the x value
      // with the item's own index as y; every other layout reads it as y.
      const scalarIsX =
        yAxes[yAxisIndex]?.type === "category" &&
        xAxes[xAxisIndex]?.type !== "category";
      const data =
        s.type === "line"
          ? (stackedLineDataBySeriesIndex.get(seriesIndex) ?? s.data ?? [])
          : (s.data ?? []);
      const points = data.map((item: unknown, index: number) => {
        const raw = Array.isArray(item)
          ? item
          : typeof item === "object" && item !== null
            ? (item as { value?: unknown }).value
            : item;
        let xVal: number;
        let yVal: number;
        if (Array.isArray(raw)) {
          xVal = Number(raw[0]);
          yVal = Number(raw[1]);
        } else if (scalarIsX) {
          xVal = Number(raw);
          yVal = index;
        } else {
          xVal = index;
          yVal = Number(raw);
        }
        if (!Number.isFinite(xVal) || !Number.isFinite(yVal)) return null;
        return [xScale.map(xVal), yScale.map(yVal)] as const;
      });
      result.push({ seriesIndex, points });
    });
    return result;
  }

  // Rendered rect of every datum of every box-shaped hit-testable series
  // (bar, candlestick), for brush area OVERLAP (not point containment — see
  // overlay/brush.ts's rectInArea). coord/barPositions.ts is the single
  // source of truth both gl/BarRenderer.ts and this share, so a bar's brush
  // hit box can never disagree with where it is actually drawn.
  private brushSeriesRects(): BrushSeriesRects[] {
    const option = this.option;
    if (!option) return [];
    const allSeries = option.series ?? [];
    const grids = Array.isArray(option.grid)
      ? option.grid
      : option.grid
        ? [option.grid]
        : [{}];
    const xAxes = Array.isArray(option.xAxis)
      ? option.xAxis
      : option.xAxis
        ? [option.xAxis]
        : [{}];
    const yAxes = Array.isArray(option.yAxis)
      ? option.yAxis
      : option.yAxis
        ? [option.yAxis]
        : [{}];
    const visibleSeries = allSeries.filter(
      (s) => !s.name || !this.hiddenSeries.has(s.name),
    );
    const { xScales, yScales } = resolveGrid(
      grids as any,
      xAxes as any,
      yAxes as any,
      visibleSeries,
      this.width,
      this.height,
      this.xZoomMap,
      this.yZoomMap,
    );

    const result: BrushSeriesRects[] = [];

    const barIndices: number[] = [];
    allSeries.forEach((s, index) => {
      if (s.type === "bar" && (!s.name || !this.hiddenSeries.has(s.name))) {
        barIndices.push(index);
      }
    });
    if (barIndices.length > 0) {
      const barPositions = layoutBarSeries(
        barIndices.map((index) => allSeries[index] as BarSeriesOption),
        xScales,
        yScales,
      );
      barIndices.forEach((seriesIndex, localIndex) => {
        const rects = barPositions.get(localIndex);
        if (rects) result.push({ seriesIndex, rects });
      });
    }

    const candlestickIndices: number[] = [];
    allSeries.forEach((s, index) => {
      if (
        s.type === "candlestick" &&
        (!s.name || !this.hiddenSeries.has(s.name))
      ) {
        candlestickIndices.push(index);
      }
    });
    if (candlestickIndices.length > 0) {
      const candlePositions = layoutCandlestickSeries(
        candlestickIndices.map((index) => allSeries[index] as any),
        xScales,
        yScales,
      );
      candlestickIndices.forEach((seriesIndex, localIndex) => {
        const rects = candlePositions.get(localIndex);
        if (rects) result.push({ seriesIndex, rects });
      });
    }

    return result;
  }

  // Brush is driven by `option.brush` OR a standalone `toolbox.feature.brush`
  // (ECharts allows the toolbox button to work without an explicit `brush`
  // component, using its defaults) — this mirrors that by falling back to
  // an empty BrushOption when only the toolbox feature is configured.
  private mountBrush(): void {
    this.brushCleanup?.();
    this.brushCleanup = null;
    this.brushController = null;
    const brushOption = this.option?.brush;
    const toolboxBrush = this.option?.toolbox?.feature?.brush;
    if (!brushOption && !toolboxBrush) return;
    const controller = renderBrush(brushOption, {
      container: this.container,
      svg: this.overlaysvg,
      getPlotRect: () => this.lastGridRect,
      getSeriesPoints: () => this.brushSeriesPoints(),
      getSeriesRects: () => this.brushSeriesRects(),
      onSelect: (params) => {
        const entry = params.batch[0];
        this.brushHasAreas = entry.areas.length > 0;
        this.brushSelectedKeys = new Set();
        this.brushedSeriesIndices = new Set();
        for (const { seriesIndex, dataIndex } of entry.selected) {
          if (dataIndex.length === 0) continue;
          this.brushedSeriesIndices.add(seriesIndex);
          for (const index of dataIndex) {
            this.brushSelectedKeys.add(selectionKey(seriesIndex, index));
          }
        }
        // Re-render so inBrush/outOfBrush dimming (see render()'s
        // brushStates) reflects the new selection.
        this.render();
        for (const handler of [...this.brushSelectedHandlers]) handler(params);
      },
    });
    this.brushController = controller;
    this.brushCleanup = () => {
      controller.destroy();
      this.brushController = null;
    };
  }

  render(): void {
    if (!this.device || !this.option || this.destroyed) return;
    // Drawing into a lost context only logs GL errors until it is restored.
    if (this.contextLost) return;
    const { option, width, height } = this;
    if (!width || !height) return;

    const allSeries = option.series ?? [];
    // Filter out hidden series for WebGL renderers
    const series = allSeries.filter(
      (s) => !s.name || !this.hiddenSeries.has(s.name),
    );

    const xAxes = Array.isArray(option.xAxis)
      ? option.xAxis
      : option.xAxis
        ? [option.xAxis]
        : [{ type: "category" as const }];
    const yAxes = Array.isArray(option.yAxis)
      ? option.yAxis
      : option.yAxis
        ? [option.yAxis]
        : [{ type: "value" as const }];
    const rawGrids = Array.isArray(option.grid)
      ? option.grid
      : option.grid
        ? [option.grid]
        : [{}];
    const radars = Array.isArray(option.radar)
      ? option.radar
      : option.radar
        ? [option.radar]
        : [];
    const dataZooms = Array.isArray(option.dataZoom)
      ? option.dataZoom
      : option.dataZoom
        ? [option.dataZoom]
        : [];
    const visualMaps = Array.isArray(option.visualMap)
      ? option.visualMap
      : option.visualMap
        ? [option.visualMap]
        : [];

    // A slider dataZoom is laid out against the canvas bottom; without this
    // it is drawn straight over the x axis tick labels.
    const grids = reserveDataZoomSpace(rawGrids, dataZooms);

    const grid = resolveGrid(
      grids,
      xAxes,
      yAxes,
      series,
      width,
      height,
      this.xZoomMap,
      this.yZoomMap,
    );
    this.lastGridRect = grid.gridRect;

    // Only render Cartesian axes when there are series that use them.
    // A series bound to a non-cartesian coordinate system (calendar heatmap,
    // geo scatter/effectScatter, …) must not drag default axes into the
    // chart — its data is not axis-indexed, so the labels come out mangled.
    // "lines" defaults to geo coordinates (see lines.ts), so it only counts
    // when explicitly cartesian2d, otherwise a geo-only flow map gets
    // spurious default axes drawn over it.
    const cartesianTypes = new Set([
      "line",
      "bar",
      "scatter",
      "heatmap",
      "candlestick",
      "boxplot",
      "effectScatter",
      "pictorialBar",
      "lines",
      "custom",
    ]);
    const hasCartesian = series.some((s) => {
      if (!cartesianTypes.has(s.type ?? "")) return false;
      const coordinateSystem = (s as any).coordinateSystem;
      if (s.type === "lines") return coordinateSystem === "cartesian2d";
      return (
        coordinateSystem === undefined || coordinateSystem === "cartesian2d"
      );
    });

    // Per-pass theme-aware color resolver — resolved against this container's
    // computed style so [data-theme] ancestors and custom themes are honored
    // (see gl/color.ts createColorResolver). One per render pass, threaded
    // through the gauge SVG renderer and every WebGL renderer below.
    const colorResolver = createColorResolver(this.container);

    // ─── SVG Overlay ──────────────────────────────────────────────────────────
    if (hasCartesian)
      renderAxes(
        this.overlaysvg,
        {
          gridRect: grid.gridRect,
          xAxes,
          yAxes,
          xScales: grid.xScales,
          yScales: grid.yScales,
          width,
          height,
        },
        this.backsvg,
      );
    else {
      this.overlaysvg.querySelector(".dc-axes")?.remove();
      this.backsvg.querySelector(".dc-axes-grid")?.remove();
    }

    const titles = Array.isArray(option.title)
      ? option.title
      : option.title
        ? [option.title]
        : [];

    // WCAG 1.1.1: the chart is a meaningful image, but its pixels live on an
    // aria-hidden canvas, so without a name here a screen reader announces
    // nothing at all. ECharts solves this with its `aria` component; the same
    // idea, minus the option surface: the title if there is one, otherwise the
    // series types and names actually rendered.
    this.overlaysvg.setAttribute("role", "img");
    this.overlaysvg.setAttribute("aria-label", chartAccessibleName(option));
    if (titles.length === 0)
      this.overlaysvg
        .querySelectorAll(".dc-title")
        .forEach((node) => node.remove());
    else for (const title of titles) renderTitle(this.overlaysvg, title);

    const legends = Array.isArray(option.legend)
      ? option.legend
      : option.legend
        ? [option.legend]
        : [];

    if (legends.length === 0)
      this.overlaysvg
        .querySelectorAll(".dc-legend")
        .forEach((node) => node.remove());
    for (const legend of legends) {
      renderLegend(
        this.overlaysvg,
        legend,
        allSeries,
        this.hiddenSeries,
        (name) => {
          // ECharts selectedMode semantics: `false` disables toggling;
          // "single" keeps exactly one series selected (clicking the sole
          // visible one hides all); "multiple"/true toggles freely.
          const mode = legend.selectedMode ?? true;
          if (mode === false) return;
          if (mode === "single") {
            const names = allSeries
              .map((s) => s.name ?? "")
              .filter((n) => n !== "");
            const isSoleVisible =
              !this.hiddenSeries.has(name) &&
              names.every((n) => n === name || this.hiddenSeries.has(n));
            this.hiddenSeries = isSoleVisible
              ? new Set(names)
              : new Set(names.filter((n) => n !== name));
          } else if (this.hiddenSeries.has(name)) {
            this.hiddenSeries.delete(name);
          } else {
            this.hiddenSeries.add(name);
          }
          this.render();
        },
        undefined,
        (name) => {
          if (!this.itemStatesOn) return;
          const next =
            name == null ? null : allSeries.findIndex((s) => s.name === name);
          const resolved = next == null || next < 0 ? null : next;
          if (resolved === this.legendFocusIndex) return;
          this.legendFocusIndex = resolved;
          // Deferred: this fires from a focus/blur handler that a render() may
          // itself have triggered (the legend is rebuilt every pass and focus
          // is handed back to the replacement node). Re-entering render() from
          // inside render() would paint a half-built overlay, and a blur
          // immediately followed by a focus coalesces into one pass here.
          this.scheduleStateRender();
        },
      );
    }

    // ECharts assigns a palette color by the series' index in `option.series`.
    // The WebGL renderers instead counted positions inside their own
    // type-filtered, visibility-filtered slice plus a running offset, so the
    // palette shifted whenever series types were interleaved or a legend item
    // was toggled off — the remaining bars repainted in the hidden series'
    // color while the legend swatch (which does index by option order) kept
    // the old one. Pin each series' color to its option index up front;
    // renderers then resolve an explicit color and their fallback index never
    // applies. `s.color` set by the caller always wins.
    const paletteIndex = new Map<SeriesOption, number>(
      allSeries.map((s, index) => [s, index] as const),
    );
    // Emphasis/blur/select is resolved per (series, dataIndex). The renderers
    // are handed CLONES (the palette pass below and the line stacking pass both
    // spread the option), so every clone is registered against its original's
    // index; the resolver reads this map when a renderer calls it, which is
    // always after the clones exist. Computed here (before the SVG-only
    // series below) so radar/gauge/boxplot/funnel can read it too, not just
    // the WebGL-rendered types.
    const stateIndexOf = new Map<object, number>(
      allSeries.map((s, index) => [s as object, index] as const),
    );
    this.paintedFocusIndex = this.legendFocusIndex;
    const itemStates: ItemStateResolver = this.itemStatesOn
      ? createItemStates({
          series: allSeries,
          hover: this.hoverItem,
          focusSeriesIndex: this.legendFocusIndex,
          selected: this.selectedItems,
          indexOf: stateIndexOf,
        })
      : NO_ITEM_STATES;

    for (const radarDef of radars) {
      this.radarRenderer?.renderGridToSvg(
        this.overlaysvg,
        radarDef,
        width,
        height,
      );
    }

    const gaugeSeries = series.filter((s): s is any => s.type === "gauge");
    if (gaugeSeries.length > 0) {
      this.gaugeRenderer?.renderToSvg(
        this.overlaysvg,
        gaugeSeries,
        width,
        height,
        colorResolver,
        itemStates,
      );
    }

    // SVG-only series
    const boxplotSeries = series.filter(
      (s): s is BoxplotSeriesOption => s.type === "boxplot",
    );
    if (boxplotSeries.length > 0) {
      renderBoxplot(
        this.overlaysvg,
        boxplotSeries,
        grid.xScales,
        grid.yScales,
        this.hiddenSeries,
        itemStates,
      );
    }

    const funnelSeries = series.filter(
      (s): s is FunnelSeriesOption => s.type === "funnel",
    );
    if (funnelSeries.length > 0) {
      renderFunnel(
        this.overlaysvg,
        funnelSeries,
        width,
        height,
        this.hiddenSeries,
        itemStates,
      );
    }

    const treemapSeries = series.filter(
      (s): s is TreemapSeriesOption => s.type === "treemap",
    );
    if (treemapSeries.length > 0) {
      renderTreemap(
        this.overlaysvg,
        treemapSeries,
        width,
        height,
        this.hiddenSeries,
      );
    }

    const sankeySeries = series.filter(
      (s): s is SankeySeriesOption => s.type === "sankey",
    );
    if (sankeySeries.length > 0) {
      renderSankey(
        this.overlaysvg,
        sankeySeries,
        width,
        height,
        this.hiddenSeries,
      );
    }

    const graphSeries = series.filter(
      (s): s is GraphSeriesOption => s.type === "graph",
    );
    if (graphSeries.length > 0) {
      renderGraph(
        this.overlaysvg,
        graphSeries,
        width,
        height,
        this.hiddenSeries,
      );
    }

    // Calendar heatmap
    const calendars = Array.isArray(option.calendar)
      ? option.calendar
      : option.calendar
        ? [option.calendar]
        : [];
    const calendarHeatmap = allSeries.filter(
      (s): s is any =>
        s.type === "heatmap" && (s as any).coordinateSystem === "calendar",
    );
    if (calendars.length > 0) {
      renderCalendar(
        this.overlaysvg,
        calendars,
        calendarHeatmap,
        visualMaps,
        width,
        height,
      );
    }

    // Parallel coordinates
    const parallelOpts = Array.isArray(option.parallel)
      ? option.parallel
      : option.parallel
        ? [option.parallel]
        : [];
    const parallelAxes = Array.isArray(option.parallelAxis)
      ? option.parallelAxis
      : option.parallelAxis
        ? [option.parallelAxis]
        : [];
    const parallelSeries = series.filter(
      (s): s is ParallelSeriesOption => s.type === "parallel",
    );
    if (parallelAxes.length > 0 || parallelSeries.length > 0) {
      renderParallel(
        this.overlaysvg,
        parallelOpts,
        parallelAxes,
        parallelSeries,
        width,
        height,
        this.hiddenSeries,
      );
    }

    // ThemeRiver
    const themeRiverSeries = series.filter(
      (s): s is ThemeRiverSeriesOption => s.type === "themeRiver",
    );
    if (themeRiverSeries.length > 0) {
      renderThemeRiver(
        this.overlaysvg,
        themeRiverSeries,
        width,
        height,
        this.hiddenSeries,
      );
    }

    // Geo map
    const geos = Array.isArray(option.geo)
      ? option.geo
      : option.geo
        ? [option.geo]
        : [];
    const mapSeries = series.filter(
      (s): s is MapSeriesOption => s.type === "map",
    );
    const geoScatter = series.filter(
      (s): s is any =>
        s.type === "scatter" && (s as any).coordinateSystem === "geo",
    );
    if (geos.length > 0 || mapSeries.length > 0) {
      renderGeoMap(
        this.overlaysvg,
        geos,
        mapSeries,
        geoScatter,
        visualMaps,
        width,
        height,
      );
    }

    // Lines (flow map)
    const linesSeries = series.filter(
      (s): s is LinesSeriesOption => s.type === "lines",
    );
    if (linesSeries.length > 0) {
      renderLines(this.overlaysvg, geos, linesSeries, width, height);
    }

    // EffectScatter
    const effectScatterSeries = series.filter(
      (s): s is EffectScatterSeriesOption => s.type === "effectScatter",
    );
    if (effectScatterSeries.length > 0) {
      renderEffectScatter(
        this.overlaysvg,
        effectScatterSeries,
        grid.xScales,
        grid.yScales,
        geos,
        width,
        height,
        this.hiddenSeries,
      );
    }

    // PictorialBar
    const pictorialBarSeries = series.filter(
      (s): s is PictorialBarSeriesOption => s.type === "pictorialBar",
    );
    if (pictorialBarSeries.length > 0) {
      renderPictorialBar(
        this.overlaysvg,
        pictorialBarSeries,
        grid.xScales,
        grid.yScales,
        this.hiddenSeries,
      );
    }

    // Custom (renderItem)
    const customSeries = series.filter(
      (s): s is CustomSeriesOption => s.type === "custom",
    );
    if (customSeries.length > 0) {
      renderCustom(
        this.overlaysvg,
        customSeries,
        grid.xScales,
        grid.yScales,
        grid.gridRect,
        width,
        height,
        this.hiddenSeries,
      );
    }

    // 3D charts
    const grid3Ds = Array.isArray(option.grid3D)
      ? option.grid3D
      : option.grid3D
        ? [option.grid3D]
        : [];
    const xAxes3D = Array.isArray(option.xAxis3D)
      ? option.xAxis3D
      : option.xAxis3D
        ? [option.xAxis3D]
        : [];
    const yAxes3D = Array.isArray(option.yAxis3D)
      ? option.yAxis3D
      : option.yAxis3D
        ? [option.yAxis3D]
        : [];
    const zAxes3D = Array.isArray(option.zAxis3D)
      ? option.zAxis3D
      : option.zAxis3D
        ? [option.zAxis3D]
        : [];
    const scatter3DSeries = series.filter(
      (s): s is Scatter3DSeriesOption => s.type === "scatter3D",
    );
    const bar3DSeries = series.filter(
      (s): s is Bar3DSeriesOption => s.type === "bar3D",
    );
    const line3DSeries = series.filter(
      (s): s is Line3DSeriesOption => s.type === "line3D",
    );
    const surface3DSeries = series.filter(
      (s): s is Surface3DSeriesOption => s.type === "surface3D",
    );
    if (
      grid3Ds.length > 0 ||
      scatter3DSeries.length > 0 ||
      bar3DSeries.length > 0 ||
      line3DSeries.length > 0 ||
      surface3DSeries.length > 0
    ) {
      renderGrid3D(
        this.overlaysvg,
        grid3Ds,
        xAxes3D,
        yAxes3D,
        zAxes3D,
        scatter3DSeries,
        bar3DSeries,
        line3DSeries,
        surface3DSeries,
        width,
        height,
        colorResolver,
      );
    }

    // VisualMap legend
    if (visualMaps.length > 0) {
      renderVisualMap(this.overlaysvg, visualMaps, width, height);
    }

    // ─── WebGL Rendering ──────────────────────────────────────────────────────
    const renderPass = this.device.beginRenderPass({
      clearColor: [0, 0, 0, 0],
    });

    let seriesOffset = 0;

    // inBrush/outOfBrush — see overlay/brush.ts + itemStates.ts's
    // createBrushStates(). Only bar/line/scatter/candlestick are
    // brush-hit-tested (see brushSeriesPoints()/brushSeriesRects()), so only
    // those fall back to it; every other series type keeps `itemStates`
    // unchanged even while a brush area is drawn.
    const brushStates: ItemStateResolver = createBrushStates({
      option: this.option?.brush,
      hasAreas: this.brushHasAreas,
      selectedKeys: this.brushSelectedKeys,
      brushedSeriesIndices: this.brushedSeriesIndices,
      seriesIndexOf: (s) =>
        stateIndexOf.get(s as object) ?? allSeries.indexOf(s as SeriesOption),
    });
    // bar/line/scatter/candlestick (the only brush-hit-tested types) switch
    // to brush dimming while an area is drawn; every other series type is
    // unaffected.
    const cartesianStates: ItemStateResolver = this.brushHasAreas
      ? brushStates
      : itemStates;
    const withPaletteColor = <T extends SeriesOption>(list: T[]): T[] =>
      list.map((s) => {
        if ((s as { color?: unknown }).color) return s;
        const clone = {
          ...s,
          color: seriesPaletteFamily(paletteIndex.get(s) ?? 0),
        } as T;
        stateIndexOf.set(clone as object, stateIndexOf.get(s as object) ?? -1);
        return clone;
      });

    const barSeries = withPaletteColor(
      series.filter((s): s is any => s.type === "bar"),
    );
    if (barSeries.length > 0 && this.barRenderer) {
      this.barRenderer.render(
        renderPass,
        barSeries,
        grid.xScales,
        grid.yScales,
        grid.gridRect,
        width,
        height,
        seriesOffset,
        colorResolver,
        cartesianStates,
      );
      seriesOffset += barSeries.length;
    }

    const lineSeries = withPaletteColor(
      series.filter((s): s is any => s.type === "line"),
    );
    if (lineSeries.length > 0 && this.lineRenderer) {
      const { series: stackedLineSeries, baselines: lineBaselines } =
        accumStackedLines(lineSeries);
      stackedLineSeries.forEach((clone, index) => {
        stateIndexOf.set(
          clone as object,
          stateIndexOf.get(lineSeries[index] as object) ?? -1,
        );
      });
      this.lineRenderer.render(
        renderPass,
        stackedLineSeries,
        grid.xScales,
        grid.yScales,
        grid.gridRect,
        width,
        height,
        seriesOffset,
        lineBaselines,
        colorResolver,
        cartesianStates,
      );
      seriesOffset += lineSeries.length;
    }

    const scatterSeries = withPaletteColor(
      series.filter((s): s is any => s.type === "scatter"),
    );
    if (scatterSeries.length > 0 && this.scatterRenderer) {
      this.scatterRenderer.render(
        renderPass,
        scatterSeries,
        grid.xScales,
        grid.yScales,
        grid.gridRect,
        width,
        height,
        seriesOffset,
        colorResolver,
        cartesianStates,
      );
      seriesOffset += scatterSeries.length;
    }

    const pieSeries = series.filter((s): s is any => s.type === "pie");
    if (pieSeries.length > 0 && this.pieRenderer) {
      this.pieRenderer.clearBuffers();
      this.pieRenderer.render(
        renderPass,
        pieSeries,
        width,
        height,
        seriesOffset,
        colorResolver,
        this.hiddenSeries,
        itemStates,
      );
      seriesOffset += pieSeries.length;
    }

    const radarSeries = withPaletteColor(
      series.filter((s): s is any => s.type === "radar"),
    );
    if (radarSeries.length > 0 && this.radarRenderer) {
      this.radarRenderer.render(
        renderPass,
        radarSeries,
        radars,
        width,
        height,
        seriesOffset,
        colorResolver,
        itemStates,
      );
      seriesOffset += radarSeries.length;
    }

    const heatmapSeries = series.filter((s): s is any => s.type === "heatmap");
    if (heatmapSeries.length > 0 && this.heatmapRenderer) {
      this.heatmapRenderer.render(
        renderPass,
        heatmapSeries,
        grid.xScales,
        grid.yScales,
        width,
        height,
        heatmapSeries.map((s) =>
          visualMapForSeries(visualMaps, allSeries.indexOf(s)),
        ),
        colorResolver,
        itemStates,
        seriesOffset,
      );
      seriesOffset += heatmapSeries.length;
    }

    const candleSeries = withPaletteColor(
      series.filter((s): s is any => s.type === "candlestick"),
    );
    if (candleSeries.length > 0 && this.candlestickRenderer) {
      this.candlestickRenderer.render(
        renderPass,
        candleSeries,
        grid.xScales,
        grid.yScales,
        width,
        height,
        seriesOffset,
        colorResolver,
        cartesianStates,
      );
      seriesOffset += candleSeries.length;
    }

    renderPass.end();
    this.device.submit();

    // ─── SVG post-WebGL ───────────────────────────────────────────────────────
    const svgOpts = {
      series: allSeries,
      xScales: grid.xScales,
      yScales: grid.yScales,
      width,
      height,
      hiddenSeries: this.hiddenSeries,
      states: itemStates,
    };

    // Line data-point symbols (below labels so labels render on top).
    // renderSeriesSymbols() only ever iterates `type === "line"` series (see
    // its own filter), so it is safe to hand it `cartesianStates` here — the
    // same brush-aware resolver bar/line/scatter/candlestick already render
    // with — without the blanket-`itemStates` risk `svgOpts` carries for the
    // OTHER series types renderSeriesLabels below still serves generically.
    renderSeriesSymbols(this.overlaysvg, {
      ...svgOpts,
      states: cartesianStates,
    });

    // Series labels (rendered after WebGL so they appear on top)
    renderSeriesLabels(this.overlaysvg, svgOpts);

    // Marks
    const marksData = series
      .filter(
        (s): s is any =>
          (s as any).markPoint || (s as any).markLine || (s as any).markArea,
      )
      .map((s: any) => {
        const xScale = grid.xScales[s.xAxisIndex ?? 0];
        const yScale = grid.yScales[s.yAxisIndex ?? 0];
        const seriesData: [any, number][] = (s.data ?? []).map(
          (item: any, index: number) => {
            if (typeof item === "number") return [index, item];
            if (Array.isArray(item)) return [item[0], item[1]];
            const v = item?.value;
            if (Array.isArray(v)) return [v[0], v[1]];
            return [index, v];
          },
        );
        return {
          markPoint: s.markPoint,
          markLine: s.markLine,
          markArea: s.markArea,
          xScale,
          yScale,
          gridRect: grid.gridRect,
          seriesData,
        };
      })
      .filter((m) => m.xScale && m.yScale);

    if (marksData.length > 0)
      renderMarksToSvg(this.overlaysvg, marksData as any);
    else this.overlaysvg.querySelector(".dc-marks")?.remove();

    // DataZoom sliders. Sliders carry in-progress drag state on document-level
    // listeners, so they must NOT be torn down and re-created on every render
    // (a drag's first mousemove re-renders via onZoom — re-creating mid-drag
    // would remove the very listeners the drag depends on, and would snap the
    // thumbs back to the option's initial start/end). Re-create only when the
    // dataZoom option set or the canvas size changes; otherwise sync the
    // thumbs to the live zoom window.
    if (dataZooms.length > 0) {
      const dataZoomKey = `${width}x${height}:${JSON.stringify(dataZooms)}`;
      if (dataZoomKey !== this.dataZoomKey || !this.dataZoomSliders) {
        this.dataZoomCleanup?.();
        this.dataZoomSliders = setupDataZoom(
          this.overlaysvg,
          dataZooms,
          grid.gridRect,
          width,
          height,
          (xAxisIndex, state) => {
            this.xZoomMap.set(xAxisIndex, state);
            this.render();
          },
        );
        this.dataZoomCleanup = this.dataZoomSliders.cleanup;
        this.dataZoomKey = dataZoomKey;
      }
      // Sync thumbs to the live zoom window (drags write xZoomMap first).
      for (const dz of dataZooms) {
        if (dz.type === "inside") continue;
        const xIndex = typeof dz.xAxisIndex === "number" ? dz.xAxisIndex : 0;
        this.dataZoomSliders.update(
          xIndex,
          this.xZoomMap.get(xIndex) ?? {
            start: dz.start ?? 0,
            end: dz.end ?? 100,
          },
        );
      }

      // The inside-zoom wheel listener is stateless and cheap — safe to
      // re-bind on every render.
      this.insideZoomCleanup?.();
      this.insideZoomCleanup = setupInsideZoom(
        this.container,
        dataZooms,
        (xAxisIndex, state) => {
          this.xZoomMap.set(xAxisIndex, state);
          this.render();
        },
        (xAxisIndex) => this.xZoomMap.get(xAxisIndex) ?? { start: 0, end: 100 },
      );

      // Enable pointer events on SVG for drag interactivity
      this.overlaysvg.style.pointerEvents = "none";
    } else {
      this.dataZoomCleanup?.();
      this.insideZoomCleanup?.();
      this.dataZoomCleanup = null;
      this.insideZoomCleanup = null;
      this.dataZoomSliders = null;
      this.dataZoomKey = "";
    }
  }

  private bindTooltipEvents(option: ChartOption): void {
    const allSeries = option.series ?? [];
    const xAxes = Array.isArray(option.xAxis)
      ? option.xAxis
      : option.xAxis
        ? [option.xAxis]
        : [{}];
    const yAxes = Array.isArray(option.yAxis)
      ? option.yAxis
      : option.yAxis
        ? [option.yAxis]
        : [{}];
    const radars = Array.isArray(option.radar)
      ? option.radar
      : option.radar
        ? [option.radar]
        : [];
    // Same reservation render() applies — hit-testing must read the plot rect
    // the series were actually drawn into, or every tooltip is offset by the
    // slider's band.
    const grids = reserveDataZoomSpace(
      Array.isArray(option.grid)
        ? option.grid
        : option.grid
          ? [option.grid]
          : [{}],
      Array.isArray(option.dataZoom)
        ? option.dataZoom
        : option.dataZoom
          ? [option.dataZoom]
          : [],
    );

    // One hit-test drives both the tooltip and the emphasis/blur states, so a
    // hovered datum can never be highlighted in one and missed in the other.
    const itemHitAt = (mx: number, my: number): TooltipParams | null => {
      const series = allSeries.filter(
        (s) => !s.name || !this.hiddenSeries.has(s.name),
      );
      const pieHit = hitTestPie(
        series,
        mx,
        my,
        this.width,
        this.height,
        allSeries,
        this.hiddenSeries,
      );
      if (pieHit) return pieHit;
      // Radar/gauge/funnel are self-contained coordinate systems (no x/y
      // axis, not clipped to the cartesian grid rect below), same as pie.
      const radarHit = hitTestRadarItem(
        series,
        mx,
        my,
        this.width,
        this.height,
        allSeries,
        radars,
      );
      if (radarHit) return radarHit;
      const gaugeHit = hitTestGaugeItem(
        series,
        mx,
        my,
        this.width,
        this.height,
        allSeries,
      );
      if (gaugeHit) return gaugeHit;
      const funnelHit = hitTestFunnelItem(
        series,
        mx,
        my,
        this.width,
        this.height,
        allSeries,
        this.hiddenSeries,
      );
      if (funnelHit) return funnelHit;
      const { gridRect, xScales, yScales } = resolveGrid(
        grids as any,
        xAxes as any,
        yAxes as any,
        series,
        this.width,
        this.height,
        this.xZoomMap,
        this.yZoomMap,
      );
      if (
        mx < gridRect.x ||
        mx > gridRect.x + gridRect.width ||
        my < gridRect.y ||
        my > gridRect.y + gridRect.height
      )
        return null;
      return (
        hitTestScatter(series, mx, my, xScales, yScales, allSeries) ??
        hitTestCartesianItem(series, mx, my, xScales, yScales, allSeries) ??
        hitTestHeatmapItem(series, mx, my, xScales, yScales, allSeries) ??
        hitTestCandlestickItem(series, mx, my, xScales, yScales, allSeries) ??
        hitTestBoxplotItem(
          series,
          mx,
          my,
          xScales,
          yScales,
          allSeries,
          this.hiddenSeries,
        )
      );
    };

    // Emphasis follows the pointer whatever the tooltip's trigger is (ECharts
    // highlights on hover even with trigger "axis" or "none"). Re-render only
    // when the hovered datum actually changes — a pointermove inside the same
    // bar must not redraw the chart.
    const setHover = (
      next: { seriesIndex: number; dataIndex: number } | null,
    ) => {
      if (!this.itemStatesOn) return;
      const current = this.hoverItem;
      const same =
        current === next ||
        (current != null &&
          next != null &&
          current.seriesIndex === next.seriesIndex &&
          current.dataIndex === next.dataIndex);
      if (same) return;
      this.hoverItem = next;
      this.render();
    };

    const onMove = (event: MouseEvent) => {
      if (!this.option || !this.tooltipCtrl) return;
      const rect = this.container.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;

      if (this.itemStatesOn) {
        const stateHit = itemHitAt(mx, my);
        setHover(
          stateHit
            ? {
                seriesIndex: stateHit.seriesIndex,
                dataIndex: stateHit.dataIndex,
              }
            : null,
        );
      }

      const series = allSeries.filter(
        (s) => !s.name || !this.hiddenSeries.has(s.name),
      );
      const trigger =
        option.tooltip?.trigger ?? defaultTooltipTrigger(allSeries);
      const pieHit = hitTestPie(
        series,
        mx,
        my,
        this.width,
        this.height,
        allSeries,
        this.hiddenSeries,
      );
      if (pieHit && trigger !== "none") {
        this.tooltipCtrl.update({
          visible: true,
          x: mx,
          y: my,
          params: [pieHit],
        });
        return;
      }

      const grid = resolveGrid(
        grids as any,
        xAxes as any,
        yAxes as any,
        series,
        this.width,
        this.height,
        this.xZoomMap,
        this.yZoomMap,
      );
      const { gridRect, xScales, yScales } = grid;

      if (
        mx < gridRect.x ||
        mx > gridRect.x + gridRect.width ||
        my < gridRect.y ||
        my > gridRect.y + gridRect.height
      ) {
        this.tooltipCtrl.update({ visible: false, x: mx, y: my, params: [] });
        renderAxisPointer(this.overlaysvg, null, null, gridRect);
        return;
      }

      const params: TooltipParams[] = [];

      if (trigger === "axis") {
        const xScale = xScales[0];

        for (let si = 0; si < series.length; si++) {
          const s = series[si];
          if (s.type === "pie" || s.type === "radar" || s.type === "gauge")
            continue;
          if (
            s.type === "funnel" ||
            s.type === "treemap" ||
            s.type === "boxplot"
          )
            continue;
          // A heatmap has TWO axes of data (x and y), so "nearest x" below —
          // built for one-value-per-x series like bar/line — picks an
          // arbitrary cell in the right column but the wrong row. Precise
          // cell rect test instead (same geometry HeatmapRenderer.ts paints).
          if (s.type === "heatmap") {
            const heatmapHit = hitTestHeatmapItem(
              [s],
              mx,
              my,
              xScales,
              yScales,
              allSeries,
            );
            if (heatmapHit) params.push(heatmapHit);
            continue;
          }
          const data = (s as any).data ?? [];

          let closestIndex = 0;
          let closestDist = Infinity;
          for (let di = 0; di < data.length; di++) {
            const item = data[di];
            let xVal: any;
            if (typeof item === "number") xVal = di;
            else if (Array.isArray(item)) xVal = item[0];
            else xVal = di;
            const pixX = xScale?.map(xVal) ?? 0;
            const dist = Math.abs(pixX - mx);
            if (dist < closestDist) {
              closestDist = dist;
              closestIndex = di;
            }
          }

          const item = data[closestIndex];
          let value: any;
          let xVal: any;
          if (typeof item === "number") {
            xVal = closestIndex;
            value = item;
          } else if (Array.isArray(item)) {
            xVal = item[0];
            value = item[1];
          } else if (item && typeof item === "object") {
            value = item.value;
            xVal = closestIndex;
          }

          // Find actual series index in allSeries for correct color
          const globalIdx = allSeries.indexOf(s);

          params.push({
            componentType: "series",
            seriesType: s.type ?? "",
            seriesIndex: globalIdx,
            seriesName: s.name ?? "",
            name: String(xVal ?? ""),
            dataIndex: closestIndex,
            data: item,
            value,
            color: cssColor((s as { color?: unknown }).color, globalIdx),
            percent: undefined,
          });
        }

        renderAxisPointer(
          this.overlaysvg,
          mx,
          null,
          gridRect,
          option.tooltip?.axisPointer?.type ?? "line",
        );
      } else if (trigger === "item") {
        // Pie is handled above (before the grid-rect clip). The rest reuses
        // itemHitAt() — the SAME hit-test that drives hover-emphasis and
        // click-select — so a tooltip can never show for a datum that
        // hover/click missed, or vice versa.
        renderAxisPointer(this.overlaysvg, null, null, gridRect);

        const hit = itemHitAt(mx, my);
        if (hit) params.push(hit);
      }

      this.tooltipCtrl.update({
        visible: params.length > 0,
        x: mx,
        y: my,
        params,
      });
    };

    const onLeave = () => {
      this.tooltipCtrl?.update({ visible: false, x: 0, y: 0, params: [] });
      setHover(null);
      const series = allSeries.filter(
        (s) => !s.name || !this.hiddenSeries.has(s.name),
      );
      const grid = resolveGrid(
        grids as any,
        xAxes as any,
        yAxes as any,
        series,
        this.width,
        this.height,
        this.xZoomMap,
        this.yZoomMap,
      );
      renderAxisPointer(this.overlaysvg, null, null, grid.gridRect);
    };

    // ECharts `chart.on("click")`: the handler receives the data item under
    // the cursor and nothing fires on empty space. Item-level hit-testing is
    // used whatever the tooltip's trigger is, because a click identifies one
    // datum — the axis-trigger row set is a hover affordance, not a selection.
    const onClick = (event: MouseEvent) => {
      const handlers = this.clickHandlers;
      if (!this.option) return;
      if (handlers.size === 0 && !this.itemStatesOn) return;
      const rect = this.container.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;
      const hit = itemHitAt(mx, my);
      if (!hit) return;
      this.toggleSelection(hit.seriesIndex, hit.dataIndex);
      for (const handler of [...handlers]) handler(hit);
    };

    this.container.style.pointerEvents = "all";
    this.overlaysvg.style.pointerEvents = "none";
    this.container.addEventListener("click", onClick);
    // Pointer events, not mouse events: touch and pen input produce
    // pointermove/pointerdown but never mousemove, so a touch device used to
    // get no tooltip and no axis pointer at all. pointerdown covers the tap
    // case (a touch pointer emits no move before contact).
    this.container.addEventListener("pointermove", onMove);
    this.container.addEventListener("pointerdown", onMove);
    this.container.addEventListener("pointerleave", onLeave);
    this.container.addEventListener("pointercancel", onLeave);

    this.tooltipCleanup = () => {
      this.container.removeEventListener("pointermove", onMove);
      this.container.removeEventListener("pointerdown", onMove);
      this.container.removeEventListener("pointerleave", onLeave);
      this.container.removeEventListener("pointercancel", onLeave);
      this.container.removeEventListener("click", onClick);
    };
  }

  /**
   * ECharts `selectedMode`: a click toggles the datum's `select` state.
   * "single" keeps one selected datum per series, "multiple" toggles freely,
   * "series" selects every datum of the series at once, `false` (the default)
   * disables selection. Emits `selectchanged` when the set actually changed.
   */
  private scheduleStateRender(): void {
    if (this.stateRenderQueued || this.destroyed) return;
    this.stateRenderQueued = true;
    const run = () => {
      this.stateRenderQueued = false;
      if (this.destroyed) return;
      // The churn a rebuild caused cancelled itself out — nothing to repaint.
      if (this.legendFocusIndex === this.paintedFocusIndex) return;
      this.render();
    };
    if (typeof queueMicrotask === "function") queueMicrotask(run);
    else setTimeout(run, 0);
  }

  private toggleSelection(seriesIndex: number, dataIndex: number): void {
    const allSeries = this.option?.series ?? [];
    const target = allSeries[seriesIndex];
    const mode = selectedModeOf(target);
    if (!mode || dataIndex < 0) return;

    const key = selectionKey(seriesIndex, dataIndex);
    const wasSelected = this.selectedItems.has(key);
    const dropSeries = () => {
      for (const existing of [...this.selectedItems]) {
        if (existing.startsWith(`${seriesIndex}:`))
          this.selectedItems.delete(existing);
      }
    };

    if (mode === "series") {
      const count = ((target as { data?: unknown[] }).data ?? []).length;
      if (wasSelected) dropSeries();
      else
        for (let index = 0; index < count; index++)
          this.selectedItems.add(selectionKey(seriesIndex, index));
    } else if (mode === "single") {
      dropSeries();
      if (!wasSelected) this.selectedItems.add(key);
    } else if (wasSelected) {
      this.selectedItems.delete(key);
    } else {
      this.selectedItems.add(key);
    }

    this.emitSelectChanged(wasSelected ? "unselect" : "select");
    this.render();
  }

  private emitSelectChanged(
    fromAction: SelectChangedParams["fromAction"],
  ): void {
    if (this.selectChangedHandlers.size === 0) return;
    const grouped = new Map<number, number[]>();
    for (const key of this.selectedItems) {
      const [rawSeries, rawData] = key.split(":");
      const seriesIndex = Number(rawSeries);
      if (!grouped.has(seriesIndex)) grouped.set(seriesIndex, []);
      grouped.get(seriesIndex)!.push(Number(rawData));
    }
    const params: SelectChangedParams = {
      type: "selectchanged",
      fromAction,
      isFromClick: true,
      selected: [...grouped.entries()]
        .map(([seriesIndex, dataIndex]) => ({
          seriesIndex,
          dataIndex: dataIndex.sort((a, b) => a - b),
        }))
        .sort((a, b) => a.seriesIndex - b.seriesIndex),
    };
    for (const handler of [...this.selectChangedHandlers]) handler(params);
  }

  /** The currently selected data, grouped by series — ECharts' getSelected. */
  getSelectedDataIndices(): { seriesIndex: number; dataIndex: number[] }[] {
    const grouped = new Map<number, number[]>();
    for (const key of this.selectedItems) {
      const [rawSeries, rawData] = key.split(":");
      const seriesIndex = Number(rawSeries);
      if (!grouped.has(seriesIndex)) grouped.set(seriesIndex, []);
      grouped.get(seriesIndex)!.push(Number(rawData));
    }
    return [...grouped.entries()]
      .map(([seriesIndex, dataIndex]) => ({
        seriesIndex,
        dataIndex: dataIndex.sort((a, b) => a - b),
      }))
      .sort((a, b) => a.seriesIndex - b.seriesIndex);
  }

  /**
   * Subscribe to a chart event. ECharts-compatible shape: `click` receives the
   * params of the data item under the cursor (nothing fires when the click
   * lands on empty space); `selectchanged` receives the whole selection after
   * a `selectedMode` toggle; `brushSelected` receives the ECharts-shaped
   * batch after a brush area is drawn (see `option.brush`). Returns an
   * unsubscribe function; `off()` with the same handler works too.
   */
  on(event: "click", handler: (params: TooltipParams) => void): () => void;
  on(
    event: "selectchanged",
    handler: (params: SelectChangedParams) => void,
  ): () => void;
  on(
    event: "brushSelected",
    handler: (params: BrushSelectedParams) => void,
  ): () => void;
  on(
    event: "click" | "selectchanged" | "brushSelected",
    handler: ((params: TooltipParams) => void) &
      ((params: SelectChangedParams) => void) &
      ((params: BrushSelectedParams) => void),
  ): () => void {
    if (event === "selectchanged") {
      this.selectChangedHandlers.add(handler);
      return () => this.selectChangedHandlers.delete(handler);
    }
    if (event === "brushSelected") {
      this.brushSelectedHandlers.add(handler);
      return () => this.brushSelectedHandlers.delete(handler);
    }
    if (event !== "click") return () => {};
    this.clickHandlers.add(handler);
    return () => this.clickHandlers.delete(handler);
  }

  off(event: "click", handler?: (params: TooltipParams) => void): void;
  off(
    event: "selectchanged",
    handler?: (params: SelectChangedParams) => void,
  ): void;
  off(
    event: "brushSelected",
    handler?: (params: BrushSelectedParams) => void,
  ): void;
  off(
    event: "click" | "selectchanged" | "brushSelected",
    handler?: ((params: TooltipParams) => void) &
      ((params: SelectChangedParams) => void) &
      ((params: BrushSelectedParams) => void),
  ): void {
    if (event === "selectchanged") {
      if (handler) this.selectChangedHandlers.delete(handler);
      else this.selectChangedHandlers.clear();
      return;
    }
    if (event === "brushSelected") {
      if (handler) this.brushSelectedHandlers.delete(handler);
      else this.brushSelectedHandlers.clear();
      return;
    }
    if (event !== "click") return;
    if (handler) this.clickHandlers.delete(handler);
    else this.clickHandlers.clear();
  }

  destroy(): void {
    this.destroyed = true;
    this.clickHandlers.clear();
    this.selectChangedHandlers.clear();
    this.contextLossCleanup?.();
    this.contextLossCleanup = null;
    this.tooltipCleanup?.();
    this.tooltipCleanup = null;
    this.toolboxCleanup?.();
    this.toolboxCleanup = null;
    this.brushCleanup?.();
    this.brushCleanup = null;
    this.brushSelectedHandlers.clear();
    this.dataZoomCleanup?.();
    this.dataZoomCleanup = null;
    this.insideZoomCleanup?.();
    this.insideZoomCleanup = null;
    this.dataZoomSliders = null;
    this.tooltipCtrl?.destroy();
    this.tooltipCtrl = null;
    this.barRenderer?.destroy();
    this.lineRenderer?.destroy();
    this.scatterRenderer?.destroy();
    this.pieRenderer?.destroy();
    this.radarRenderer?.destroy();
    this.heatmapRenderer?.destroy();
    this.candlestickRenderer?.destroy();
    this.gaugeRenderer?.destroy();
    releaseDevice(this.canvas);
    this.backsvg.remove();
    this.canvas.remove();
    this.overlaysvg.remove();
  }
}
