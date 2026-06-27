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
import { renderVisualMap } from "./overlay/visualmap.js";
import { setupDataZoom, setupInsideZoom } from "./overlay/datazoom.js";
import { createTooltip } from "./overlay/tooltip.js";
import { renderMarksToSvg } from "./marks/index.js";
import type {
  ChartOption, SeriesOption, TooltipParams,
  BoxplotSeriesOption, FunnelSeriesOption, TreemapSeriesOption,
} from "./types.js";
import { seriesHex } from "./gl/color.js";

export class ChartEngine {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
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

    // Only render Cartesian axes when there are series that use them
    const cartesianTypes = new Set(["line","bar","scatter","heatmap","candlestick","boxplot","effectScatter","lines"]);
    const hasCartesian = series.some((s) => cartesianTypes.has(s.type ?? ""));

    // ─── SVG Overlay ──────────────────────────────────────────────────────────
    if (hasCartesian) renderAxes(this.overlaysvg, {
      gridRect: grid.gridRect,
      xAxes,
      yAxes,
      xScales: grid.xScales,
      yScales: grid.yScales,
      width,
      height,
    });

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
      this.lineRenderer.render(renderPass, lineSeries, grid.xScales, grid.yScales, grid.gridRect, width, height, seriesOffset);
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

    (this as any).__tooltipCleanup = () => {
      this.container.removeEventListener("mousemove", onMove);
      this.container.removeEventListener("mouseleave", onLeave);
    };
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.animationFrame);
    (this as any).__tooltipCleanup?.();
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
