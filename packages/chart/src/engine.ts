import type { Device } from "@luma.gl/core";
import { getDevice, releaseDevice } from "./gl/device.js";
import { BarRenderer } from "./gl/BarRenderer.js";
import { LineRenderer } from "./gl/LineRenderer.js";
import { ScatterRenderer } from "./gl/ScatterRenderer.js";
import { PieRenderer } from "./gl/PieRenderer.js";
import { RadarRenderer } from "./gl/RadarRenderer.js";
import { HeatmapRenderer } from "./gl/HeatmapRenderer.js";
import { CandlestickRenderer } from "./gl/CandlestickRenderer.js";
import { GaugeRenderer } from "./gl/GaugeRenderer.js";
import { resolveGrid } from "./coord/grid.js";
import type { ZoomWindow } from "./coord/grid.js";
import { renderAxes, renderAxisPointer } from "./overlay/axes.js";
import { renderTitle } from "./overlay/title.js";
import { renderLegend } from "./overlay/legend.js";
import { renderSeriesLabels, renderSeriesSymbols } from "./overlay/labels.js";
import { renderBoxplot } from "./overlay/boxplot.js";
import { renderFunnel } from "./overlay/funnel.js";
import { renderTreemap } from "./overlay/treemap.js";
import { renderSankey } from "./overlay/sankey.js";
import { renderGraph } from "./overlay/graph.js";
import { renderVisualMap } from "./overlay/visualmap.js";
import { setupDataZoom, setupInsideZoom } from "./overlay/datazoom.js";
import { createTooltip } from "./overlay/tooltip.js";
import { renderMarksToSvg } from "./marks/index.js";
import type {
  ChartOption, SeriesOption, TooltipParams,
  BoxplotSeriesOption, FunnelSeriesOption, TreemapSeriesOption, SankeySeriesOption, GraphSeriesOption,
  LineSeriesOption,
  CalendarOption, ParallelOption, ParallelAxisOption, ParallelSeriesOption,
  ThemeRiverSeriesOption, GeoOption, MapSeriesOption,
  Grid3DOption, Axis3DOption, Scatter3DSeriesOption, Bar3DSeriesOption, Line3DSeriesOption, Surface3DSeriesOption,
  LinesSeriesOption, EffectScatterSeriesOption, PictorialBarSeriesOption,
} from "./types.js";
import { seriesHex } from "./gl/color.js";
import { renderCalendar } from "./overlay/calendar.js";
import { renderParallel } from "./overlay/parallel.js";
import { renderThemeRiver } from "./overlay/themeriver.js";
import { renderGeoMap } from "./overlay/geomap.js";
import { renderGrid3D } from "./gl/Renderer3D.js";
import { renderLines } from "./overlay/lines.js";
import { renderEffectScatter } from "./overlay/effectscatter.js";
import { renderPictorialBar } from "./overlay/pictorialbar.js";

// Accumulate y-values for line series sharing the same stack name.
// Each stacked series receives the sum of all previous series at the same data index.
//
// Also returns, per series (same index alignment as the input array), the
// "baseline" array — the running total BEFORE this series was added. This is
// the bottom edge of this series' area-fill band (matching gl/BarRenderer.ts's
// stacked bars, which draw each segment between the previous cumulative top
// and the new one rather than from zero). `undefined` for non-stacked series,
// which keep the plain zero baseline in LineRenderer.
function accumStackedLines(
  series: LineSeriesOption[],
): { series: LineSeriesOption[]; baselines: (number[] | undefined)[] } {
  const sums = new Map<string, number[]>(); // stackName → accumulated y per dataIndex
  const baselines: (number[] | undefined)[] = [];
  const stackedSeries = series.map((s) => {
    if (!s.stack) {
      baselines.push(undefined);
      return s;
    }
    if (!sums.has(s.stack)) sums.set(s.stack, []);
    const acc = sums.get(s.stack)!;
    const rawItems = s.data ?? [];
    // Snapshot the running total for every data index up front (defaulting
    // unseen indices to 0) so the baseline array always matches this series'
    // own data length, even for the first series in a stack.
    baselines.push(rawItems.map((_: any, di: number) => acc[di] ?? 0));
    const newData = rawItems.map((item: any, di: number) => {
      let yRaw: number;
      if (typeof item === "number") yRaw = item;
      else if (Array.isArray(item)) yRaw = (item[1] as number) ?? 0;
      else yRaw = typeof item?.value === "number" ? item.value : 0;
      const prev = acc[di] ?? 0;
      const next = prev + (yRaw ?? 0);
      acc[di] = next;
      if (typeof item === "number") return next;
      if (Array.isArray(item)) return [item[0], next];
      return { ...item, value: next };
    });
    return { ...s, data: newData as any };
  });
  return { series: stackedSeries, baselines };
}

// Hit-test cursor position against all pie sectors. Returns params for the hit sector or null.
function hitTestPie(
  series: any[],
  mx: number,
  my: number,
  width: number,
  height: number,
  allSeries: SeriesOption[],
): TooltipParams | null {
  const PI2 = Math.PI * 2;
  const startOffset = -Math.PI / 2;
  const minSize = Math.min(width, height);

  for (const s of series) {
    if (s.type !== "pie") continue;

    const center = s.center ?? ["50%", "50%"];
    const cx = typeof center[0] === "number" ? center[0] : (parseFloat(center[0]) / 100) * width;
    const cy = typeof center[1] === "number" ? center[1] : (parseFloat(center[1]) / 100) * height;

    const halfMin = minSize / 2;
    let innerR = 0;
    let outerR = halfMin * 0.7;
    if (s.radius) {
      const r = s.radius;
      if (Array.isArray(r)) {
        innerR = typeof r[0] === "number" ? r[0] : (parseFloat(r[0]) / 100) * halfMin;
        outerR = typeof r[1] === "number" ? r[1] : (parseFloat(r[1]) / 100) * halfMin;
      } else {
        outerR = typeof r === "number" ? r : (parseFloat(r) / 100) * halfMin;
      }
    }

    const dist = Math.hypot(mx - cx, my - cy);
    if (dist < innerR || dist > outerR) continue;

    let cursorAngle = Math.atan2(my - cy, mx - cx);
    if (cursorAngle < startOffset) cursorAngle += PI2;

    const data: any[] = s.data ?? [];
    const total = data.reduce((sum: number, item: any) => sum + (item.value ?? 0), 0) || 1;
    const globalIdx = allSeries.findIndex((as_) => as_ === s);

    let currentAngle = startOffset;
    for (let di = 0; di < data.length; di++) {
      const item = data[di];
      const fraction = (item.value ?? 0) / total;
      const endAngle = currentAngle + fraction * PI2;

      let a = cursorAngle;
      if (a < currentAngle) a += PI2;
      if (a >= currentAngle && a < endAngle) {
        return {
          componentType: "series",
          seriesType: "pie",
          seriesIndex: globalIdx,
          seriesName: s.name ?? "",
          name: item.name ?? String(di),
          dataIndex: di,
          data: item,
          value: item.value,
          color: seriesHex(di),
          percent: Math.round(fraction * 1000) / 10,
        };
      }
      currentAngle = endAngle;
    }
  }
  return null;
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
    const globalIdx = allSeries.findIndex((as_) => as_ === s);

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
          color: seriesHex(globalIdx),
          percent: undefined,
        };
      }
    }
  }
  return nearest;
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
  private animationFrame = 0;
  private destroyed = false;

  // Interactive state
  private hiddenSeries: Set<string> = new Set();
  private xZoomMap: Map<number, ZoomWindow> = new Map();
  private yZoomMap: Map<number, ZoomWindow> = new Map();
  private dataZoomCleanup: (() => void) | null = null;
  private insideZoomCleanup: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;

    // Background SVG (behind WebGL canvas) — for grid lines only
    const backsvg = document.createElementNS("http://www.w3.org/2000/svg", "svg") as SVGSVGElement;
    backsvg.style.cssText = "position:absolute;top:0;left:0;pointer-events:none;overflow:visible;";
    container.appendChild(backsvg);
    this.backsvg = backsvg;

    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;";
    canvas.setAttribute("aria-hidden", "true");
    container.appendChild(canvas);
    this.canvas = canvas;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg") as SVGSVGElement;
    // pointer-events:none on SVG itself, but legend/datazoom groups override to all
    svg.style.cssText = "position:absolute;top:0;left:0;pointer-events:none;overflow:visible;";
    container.appendChild(svg);
    this.overlaysvg = svg;
  }

  async init(): Promise<void> {
    this.device = await getDevice(this.canvas);
    this.barRenderer = new BarRenderer(this.device);
    this.lineRenderer = new LineRenderer(this.device);
    this.scatterRenderer = new ScatterRenderer(this.device);
    this.pieRenderer = new PieRenderer(this.device);
    this.radarRenderer = new RadarRenderer(this.device);
    this.heatmapRenderer = new HeatmapRenderer(this.device);
    this.candlestickRenderer = new CandlestickRenderer(this.device);
    this.gaugeRenderer = new GaugeRenderer(this.device);
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
  }

  setOption(option: ChartOption): void {
    this.option = option;

    // Reset interactive state when option changes
    this.hiddenSeries = new Set();
    this.xZoomMap = new Map();
    this.yZoomMap = new Map();

    // Initialize DataZoom state from option (skip "inside" — it has no initial range)
    const dataZooms = Array.isArray(option.dataZoom) ? option.dataZoom : option.dataZoom ? [option.dataZoom] : [];
    for (const dz of dataZooms) {
      if (dz.type === "inside") continue;
      const xIndex = typeof dz.xAxisIndex === "number" ? dz.xAxisIndex : 0;
      this.xZoomMap.set(xIndex, { start: dz.start ?? 0, end: dz.end ?? 100 });
    }

    // Tooltip
    this.tooltipCleanup?.();
    this.tooltipCleanup = null;
    if (this.tooltipCtrl) {
      this.tooltipCtrl.destroy();
      this.tooltipCtrl = null;
    }
    if (option.tooltip?.show !== false) {
      this.tooltipCtrl = createTooltip(this.container, option.tooltip ?? {});
      this.bindTooltipEvents(option);
    }

    this.render();
  }

  render(): void {
    if (!this.device || !this.option || this.destroyed) return;
    const { option, width, height } = this;
    if (!width || !height) return;

    // Clean up old DataZoom handlers before re-rendering
    this.dataZoomCleanup?.();
    this.insideZoomCleanup?.();
    this.dataZoomCleanup = null;
    this.insideZoomCleanup = null;

    const allSeries = option.series ?? [];
    // Filter out hidden series for WebGL renderers
    const series = allSeries.filter((s) => !s.name || !this.hiddenSeries.has(s.name));

    const xAxes = Array.isArray(option.xAxis) ? option.xAxis : option.xAxis ? [option.xAxis] : [{ type: "category" as const }];
    const yAxes = Array.isArray(option.yAxis) ? option.yAxis : option.yAxis ? [option.yAxis] : [{ type: "value" as const }];
    const grids = Array.isArray(option.grid) ? option.grid : option.grid ? [option.grid] : [{}];
    const radars = Array.isArray(option.radar) ? option.radar : option.radar ? [option.radar] : [];
    const dataZooms = Array.isArray(option.dataZoom) ? option.dataZoom : option.dataZoom ? [option.dataZoom] : [];
    const visualMaps = Array.isArray(option.visualMap) ? option.visualMap : option.visualMap ? [option.visualMap] : [];

    const grid = resolveGrid(grids, xAxes, yAxes, series, width, height, this.xZoomMap, this.yZoomMap);

    // Only render Cartesian axes when there are series that use them.
    // "lines" defaults to geo coordinates (see lines.ts) — only count it when explicitly cartesian2d,
    // otherwise a geo-only flow map gets spurious default axes drawn over it.
    const cartesianTypes = new Set(["line","bar","scatter","heatmap","candlestick","boxplot","effectScatter","pictorialBar","lines"]);
    const hasCartesian = series.some((s) =>
      cartesianTypes.has(s.type ?? "") && !(s.type === "lines" && (s as any).coordinateSystem !== "cartesian2d"),
    );

    // ─── SVG Overlay ──────────────────────────────────────────────────────────
    if (hasCartesian) renderAxes(this.overlaysvg, {
      gridRect: grid.gridRect,
      xAxes,
      yAxes,
      xScales: grid.xScales,
      yScales: grid.yScales,
      width,
      height,
    }, this.backsvg);

    const titles = Array.isArray(option.title) ? option.title : option.title ? [option.title] : [];
    for (const title of titles) renderTitle(this.overlaysvg, title);

    const legends = Array.isArray(option.legend) ? option.legend : option.legend ? [option.legend] : [];
    const self = this;
    for (const legend of legends) {
      renderLegend(this.overlaysvg, legend, allSeries, this.hiddenSeries, (name) => {
        if (self.hiddenSeries.has(name)) self.hiddenSeries.delete(name);
        else self.hiddenSeries.add(name);
        self.render();
      });
    }

    for (const radarDef of radars) {
      this.radarRenderer?.renderGridToSvg(this.overlaysvg, radarDef, width, height);
    }

    const gaugeSeries = series.filter((s): s is any => s.type === "gauge");
    if (gaugeSeries.length > 0) {
      this.gaugeRenderer?.renderToSvg(this.overlaysvg, gaugeSeries, width, height);
    }

    // SVG-only series
    const boxplotSeries = series.filter((s): s is BoxplotSeriesOption => s.type === "boxplot");
    if (boxplotSeries.length > 0) {
      renderBoxplot(this.overlaysvg, boxplotSeries, grid.xScales, grid.yScales, this.hiddenSeries);
    }

    const funnelSeries = series.filter((s): s is FunnelSeriesOption => s.type === "funnel");
    if (funnelSeries.length > 0) {
      renderFunnel(this.overlaysvg, funnelSeries, width, height, this.hiddenSeries);
    }

    const treemapSeries = series.filter((s): s is TreemapSeriesOption => s.type === "treemap");
    if (treemapSeries.length > 0) {
      renderTreemap(this.overlaysvg, treemapSeries, width, height, this.hiddenSeries);
    }

    const sankeySeries = series.filter((s): s is SankeySeriesOption => s.type === "sankey");
    if (sankeySeries.length > 0) {
      renderSankey(this.overlaysvg, sankeySeries, width, height, this.hiddenSeries);
    }

    const graphSeries = series.filter((s): s is GraphSeriesOption => s.type === "graph");
    if (graphSeries.length > 0) {
      renderGraph(this.overlaysvg, graphSeries, width, height, this.hiddenSeries);
    }

    // Calendar heatmap
    const calendars = Array.isArray(option.calendar) ? option.calendar : option.calendar ? [option.calendar] : [];
    const calendarHeatmap = allSeries.filter((s): s is any => s.type === "heatmap" && (s as any).coordinateSystem === "calendar");
    if (calendars.length > 0) {
      renderCalendar(this.overlaysvg, calendars, calendarHeatmap, visualMaps, width, height);
    }

    // Parallel coordinates
    const parallelOpts = Array.isArray(option.parallel) ? option.parallel : option.parallel ? [option.parallel] : [];
    const parallelAxes = Array.isArray(option.parallelAxis) ? option.parallelAxis : option.parallelAxis ? [option.parallelAxis] : [];
    const parallelSeries = series.filter((s): s is ParallelSeriesOption => s.type === "parallel");
    if (parallelAxes.length > 0 || parallelSeries.length > 0) {
      renderParallel(this.overlaysvg, parallelOpts, parallelAxes, parallelSeries, width, height, this.hiddenSeries);
    }

    // ThemeRiver
    const themeRiverSeries = series.filter((s): s is ThemeRiverSeriesOption => s.type === "themeRiver");
    if (themeRiverSeries.length > 0) {
      renderThemeRiver(this.overlaysvg, themeRiverSeries, width, height, this.hiddenSeries);
    }

    // Geo map
    const geos = Array.isArray(option.geo) ? option.geo : option.geo ? [option.geo] : [];
    const mapSeries = series.filter((s): s is MapSeriesOption => s.type === "map");
    const geoScatter = series.filter((s): s is any => s.type === "scatter" && (s as any).coordinateSystem === "geo");
    if (geos.length > 0 || mapSeries.length > 0) {
      renderGeoMap(this.overlaysvg, geos, mapSeries, geoScatter, visualMaps, width, height);
    }

    // Lines (flow map)
    const linesSeries = series.filter((s): s is LinesSeriesOption => s.type === "lines");
    if (linesSeries.length > 0) {
      renderLines(this.overlaysvg, geos, linesSeries, width, height);
    }

    // EffectScatter
    const effectScatterSeries = series.filter((s): s is EffectScatterSeriesOption => s.type === "effectScatter");
    if (effectScatterSeries.length > 0) {
      renderEffectScatter(this.overlaysvg, effectScatterSeries, grid.xScales, grid.yScales, geos, width, height, this.hiddenSeries);
    }

    // PictorialBar
    const pictorialBarSeries = series.filter((s): s is PictorialBarSeriesOption => s.type === "pictorialBar");
    if (pictorialBarSeries.length > 0) {
      renderPictorialBar(this.overlaysvg, pictorialBarSeries, grid.xScales, grid.yScales, this.hiddenSeries);
    }

    // 3D charts
    const grid3Ds = Array.isArray(option.grid3D) ? option.grid3D : option.grid3D ? [option.grid3D] : [];
    const xAxes3D = Array.isArray(option.xAxis3D) ? option.xAxis3D : option.xAxis3D ? [option.xAxis3D] : [];
    const yAxes3D = Array.isArray(option.yAxis3D) ? option.yAxis3D : option.yAxis3D ? [option.yAxis3D] : [];
    const zAxes3D = Array.isArray(option.zAxis3D) ? option.zAxis3D : option.zAxis3D ? [option.zAxis3D] : [];
    const scatter3DSeries = series.filter((s): s is Scatter3DSeriesOption => s.type === "scatter3D");
    const bar3DSeries = series.filter((s): s is Bar3DSeriesOption => s.type === "bar3D");
    const line3DSeries = series.filter((s): s is Line3DSeriesOption => s.type === "line3D");
    const surface3DSeries = series.filter((s): s is Surface3DSeriesOption => s.type === "surface3D");
    if (grid3Ds.length > 0 || scatter3DSeries.length > 0 || bar3DSeries.length > 0 || line3DSeries.length > 0 || surface3DSeries.length > 0) {
      renderGrid3D(this.overlaysvg, grid3Ds, xAxes3D, yAxes3D, zAxes3D, scatter3DSeries, bar3DSeries, line3DSeries, surface3DSeries, width, height);
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

    const barSeries = series.filter((s): s is any => s.type === "bar");
    if (barSeries.length > 0 && this.barRenderer) {
      this.barRenderer.render(renderPass, barSeries, grid.xScales, grid.yScales, grid.gridRect, width, height, seriesOffset);
      seriesOffset += barSeries.length;
    }

    const lineSeries = series.filter((s): s is any => s.type === "line");
    if (lineSeries.length > 0 && this.lineRenderer) {
      const { series: stackedLineSeries, baselines: lineBaselines } = accumStackedLines(lineSeries);
      this.lineRenderer.render(renderPass, stackedLineSeries, grid.xScales, grid.yScales, grid.gridRect, width, height, seriesOffset, lineBaselines);
      seriesOffset += lineSeries.length;
    }

    const scatterSeries = series.filter((s): s is any => s.type === "scatter");
    if (scatterSeries.length > 0 && this.scatterRenderer) {
      this.scatterRenderer.render(renderPass, scatterSeries, grid.xScales, grid.yScales, grid.gridRect, width, height, seriesOffset);
      seriesOffset += scatterSeries.length;
    }

    const pieSeries = series.filter((s): s is any => s.type === "pie");
    if (pieSeries.length > 0 && this.pieRenderer) {
      this.pieRenderer.clearBuffers();
      this.pieRenderer.render(renderPass, pieSeries, width, height, seriesOffset);
      seriesOffset += pieSeries.length;
    }

    const radarSeries = series.filter((s): s is any => s.type === "radar");
    if (radarSeries.length > 0 && this.radarRenderer) {
      this.radarRenderer.render(renderPass, radarSeries, radars, width, height, seriesOffset);
      seriesOffset += radarSeries.length;
    }

    const heatmapSeries = series.filter((s): s is any => s.type === "heatmap");
    if (heatmapSeries.length > 0 && this.heatmapRenderer) {
      this.heatmapRenderer.render(renderPass, heatmapSeries, grid.xScales, grid.yScales, width, height);
      seriesOffset += heatmapSeries.length;
    }

    const candleSeries = series.filter((s): s is any => s.type === "candlestick");
    if (candleSeries.length > 0 && this.candlestickRenderer) {
      this.candlestickRenderer.render(renderPass, candleSeries, grid.xScales, grid.yScales, width, height, seriesOffset);
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
    };

    // Line data-point symbols (below labels so labels render on top)
    renderSeriesSymbols(this.overlaysvg, svgOpts);

    // Series labels (rendered after WebGL so they appear on top)
    renderSeriesLabels(this.overlaysvg, svgOpts);

    // Marks
    const marksData = series
      .filter((s): s is any => (s as any).markPoint || (s as any).markLine || (s as any).markArea)
      .map((s: any) => {
        const xScale = grid.xScales[s.xAxisIndex ?? 0];
        const yScale = grid.yScales[s.yAxisIndex ?? 0];
        const seriesData: [any, number][] = (s.data ?? []).map((item: any, index: number) => {
          if (typeof item === "number") return [index, item];
          if (Array.isArray(item)) return [item[0], item[1]];
          const v = item?.value;
          if (Array.isArray(v)) return [v[0], v[1]];
          return [index, v];
        });
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

    if (marksData.length > 0) renderMarksToSvg(this.overlaysvg, marksData as any);

    // DataZoom sliders
    if (dataZooms.length > 0) {
      this.dataZoomCleanup = setupDataZoom(
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
    }
  }

  private bindTooltipEvents(option: ChartOption): void {
    const allSeries = option.series ?? [];
    const xAxes = Array.isArray(option.xAxis) ? option.xAxis : option.xAxis ? [option.xAxis] : [{}];
    const yAxes = Array.isArray(option.yAxis) ? option.yAxis : option.yAxis ? [option.yAxis] : [{}];
    const grids = Array.isArray(option.grid) ? option.grid : option.grid ? [option.grid] : [{}];

    const onMove = (event: MouseEvent) => {
      if (!this.option || !this.tooltipCtrl) return;
      const rect = this.container.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;

      const series = allSeries.filter((s) => !s.name || !this.hiddenSeries.has(s.name));
      const grid = resolveGrid(grids as any, xAxes as any, yAxes as any, series, this.width, this.height, this.xZoomMap, this.yZoomMap);
      const { gridRect, xScales, yScales } = grid;

      if (mx < gridRect.x || mx > gridRect.x + gridRect.width ||
          my < gridRect.y || my > gridRect.y + gridRect.height) {
        this.tooltipCtrl.update({ visible: false, x: mx, y: my, params: [] });
        renderAxisPointer(this.overlaysvg, null, null, gridRect);
        return;
      }

      const trigger = option.tooltip?.trigger ?? "axis";
      const params: TooltipParams[] = [];

      if (trigger === "axis") {
        const xScale = xScales[0];

        for (let si = 0; si < series.length; si++) {
          const s = series[si];
          if (s.type === "pie" || s.type === "radar" || s.type === "gauge") continue;
          if (s.type === "funnel" || s.type === "treemap" || s.type === "boxplot") continue;
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
            if (dist < closestDist) { closestDist = dist; closestIndex = di; }
          }

          const item = data[closestIndex];
          let value: any;
          let xVal: any;
          if (typeof item === "number") { xVal = closestIndex; value = item; }
          else if (Array.isArray(item)) { xVal = item[0]; value = item[1]; }
          else if (item && typeof item === "object") { value = item.value; xVal = closestIndex; }

          // Find actual series index in allSeries for correct color
          const globalIdx = allSeries.findIndex((as_) => as_ === s);

          params.push({
            componentType: "series",
            seriesType: s.type ?? "",
            seriesIndex: globalIdx,
            seriesName: s.name ?? "",
            name: String(xVal ?? ""),
            dataIndex: closestIndex,
            data: item,
            value,
            color: seriesHex(globalIdx),
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
        // Item trigger: hit-test pie sectors and scatter points
        renderAxisPointer(this.overlaysvg, null, null, gridRect);

        const hit =
          hitTestPie(series, mx, my, this.width, this.height, allSeries) ??
          hitTestScatter(series, mx, my, xScales, yScales, allSeries);
        if (hit) params.push(hit);
      }

      this.tooltipCtrl.update({ visible: params.length > 0, x: mx, y: my, params });
    };

    const onLeave = () => {
      this.tooltipCtrl?.update({ visible: false, x: 0, y: 0, params: [] });
      const series = allSeries.filter((s) => !s.name || !this.hiddenSeries.has(s.name));
      const grid = resolveGrid(grids as any, xAxes as any, yAxes as any, series, this.width, this.height, this.xZoomMap, this.yZoomMap);
      renderAxisPointer(this.overlaysvg, null, null, grid.gridRect);
    };

    this.container.style.pointerEvents = "all";
    this.overlaysvg.style.pointerEvents = "none";
    this.container.addEventListener("mousemove", onMove);
    this.container.addEventListener("mouseleave", onLeave);

    this.tooltipCleanup = () => {
      this.container.removeEventListener("mousemove", onMove);
      this.container.removeEventListener("mouseleave", onLeave);
    };
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.animationFrame);
    this.tooltipCleanup?.();
    this.tooltipCleanup = null;
    this.dataZoomCleanup?.();
    this.insideZoomCleanup?.();
    this.tooltipCtrl?.destroy();
    this.barRenderer?.destroy();
    this.lineRenderer?.destroy();
    this.scatterRenderer?.destroy();
    this.pieRenderer?.destroy();
    this.radarRenderer?.destroy();
    this.heatmapRenderer?.destroy();
    this.candlestickRenderer?.destroy();
    this.gaugeRenderer?.destroy();
    releaseDevice(this.canvas);
    this.canvas.remove();
    this.overlaysvg.remove();
  }
}
