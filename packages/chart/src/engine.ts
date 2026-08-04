import type { Device } from "@luma.gl/core";
import type { ZoomWindow } from "./coord/grid.js";
import { resolveGrid } from "./coord/grid.js";
import { BarRenderer } from "./gl/BarRenderer.js";
import { CandlestickRenderer } from "./gl/CandlestickRenderer.js";
import { createColorResolver, seriesColor } from "./gl/color.js";
import { getDevice, releaseDevice } from "./gl/device.js";
import { GaugeRenderer } from "./gl/GaugeRenderer.js";
import { HeatmapRenderer } from "./gl/HeatmapRenderer.js";
import { LineRenderer } from "./gl/LineRenderer.js";
import { PieRenderer } from "./gl/PieRenderer.js";
import { RadarRenderer } from "./gl/RadarRenderer.js";
import { renderGrid3D } from "./gl/Renderer3D.js";
import { ScatterRenderer } from "./gl/ScatterRenderer.js";
import { renderMarksToSvg } from "./marks/index.js";
import { renderAxes, renderAxisPointer } from "./overlay/axes.js";
import { renderBoxplot } from "./overlay/boxplot.js";
import { renderCalendar } from "./overlay/calendar.js";
import { setupDataZoom, setupInsideZoom } from "./overlay/datazoom.js";
import { renderEffectScatter } from "./overlay/effectscatter.js";
import { renderFunnel } from "./overlay/funnel.js";
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
import { createTooltip } from "./overlay/tooltip.js";
import { renderTreemap } from "./overlay/treemap.js";
import { renderVisualMap } from "./overlay/visualmap.js";
import type {
  Bar3DSeriesOption,
  BoxplotSeriesOption,
  ChartOption,
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

// Hit-test cursor position against all pie sectors. Returns params for the hit sector or null.
// Legend-hidden slices (item names in `hiddenSeries`) are skipped — a hidden
// slice must not fire a tooltip — but still consume their angle span so the
// walk stays aligned with PieRenderer, which draws every slice.
function hitTestPie(
  series: any[],
  mx: number,
  my: number,
  width: number,
  height: number,
  allSeries: SeriesOption[],
  hiddenSeries: ReadonlySet<string>,
): TooltipParams | null {
  const PI2 = Math.PI * 2;
  const startOffset = -Math.PI / 2;
  const minSize = Math.min(width, height);

  for (const s of series) {
    if (s.type !== "pie") continue;

    const center = s.center ?? ["50%", "50%"];
    const cx =
      typeof center[0] === "number"
        ? center[0]
        : (parseFloat(center[0]) / 100) * width;
    const cy =
      typeof center[1] === "number"
        ? center[1]
        : (parseFloat(center[1]) / 100) * height;

    const halfMin = minSize / 2;
    let innerR = 0;
    let outerR = halfMin * 0.7;
    if (s.radius) {
      const r = s.radius;
      if (Array.isArray(r)) {
        innerR =
          typeof r[0] === "number" ? r[0] : (parseFloat(r[0]) / 100) * halfMin;
        outerR =
          typeof r[1] === "number" ? r[1] : (parseFloat(r[1]) / 100) * halfMin;
      } else {
        outerR = typeof r === "number" ? r : (parseFloat(r) / 100) * halfMin;
      }
    }

    const dist = Math.hypot(mx - cx, my - cy);
    if (dist < innerR || dist > outerR) continue;

    let cursorAngle = Math.atan2(my - cy, mx - cx);
    if (cursorAngle < startOffset) cursorAngle += PI2;

    const data: any[] = s.data ?? [];
    const total =
      data.reduce((sum: number, item: any) => sum + (item.value ?? 0), 0) || 1;
    const globalIdx = allSeries.indexOf(s);

    let currentAngle = startOffset;
    for (let di = 0; di < data.length; di++) {
      const item = data[di];
      const fraction = (item.value ?? 0) / total;
      const endAngle = currentAngle + fraction * PI2;

      let a = cursorAngle;
      if (a < currentAngle) a += PI2;
      const isLegendHidden =
        typeof item?.name === "string" && hiddenSeries.has(item.name);
      if (!isLegendHidden && a >= currentAngle && a < endAngle) {
        return {
          componentType: "series",
          seriesType: "pie",
          seriesIndex: globalIdx,
          seriesName: s.name ?? "",
          name: item.name ?? String(di),
          dataIndex: di,
          data: item,
          value: item.value,
          color: seriesColor(di),
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
          color: seriesColor(globalIdx),
          percent: undefined,
        };
      }
    }
  }
  return nearest;
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

function warnUnsupportedChartOption(option: ChartOption): void {
  if (option.toolbox != null) {
    warnOnce(
      "@domphy/chart: option.toolbox is typed for ECharts interop but is not implemented yet; it has no effect.",
    );
  }
  if (option.brush != null) {
    warnOnce(
      "@domphy/chart: option.brush is typed for ECharts interop but is not implemented yet; it has no effect.",
    );
  }
  // TooltipOption keys that are typed for ECharts interop but ignored.
  // (backgroundColor/borderColor/borderWidth/padding/textStyle/extraCssText/
  // className/confine ARE implemented — do not warn for those.)
  const UNSUPPORTED_TOOLTIP_KEYS = [
    "position",
    "appendToBody",
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
  private destroyed = false;

  // Interactive state
  private hiddenSeries: Set<string> = new Set();
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
  }

  setOption(option: ChartOption): void {
    // A node removed before async init resolves must not revive the engine.
    if (this.destroyed) return;
    // ECharts allows `series` as a single object; every render path below
    // iterates it as an array, so normalize once up front instead of crashing
    // on `.filter` later.
    const normalizedOption: ChartOption = Array.isArray(option.series)
      ? option
      : { ...option, series: option.series ? [option.series] : [] };
    this.option = normalizedOption;

    // Honest surface: type/docs may list ECharts-compatible keys that are not
    // implemented yet. Warn once per option so silent no-ops do not ship as
    // "working" enterprise charts.
    warnUnsupportedChartOption(normalizedOption);

    // Reset interactive state when option changes
    this.hiddenSeries = new Set();
    this.xZoomMap = new Map();
    this.yZoomMap = new Map();

    // Seed legend toggles from `legend.selected` (ECharts semantics: a name
    // mapped to `false` starts hidden and is restored by clicking the legend).
    const initialLegends = Array.isArray(normalizedOption.legend)
      ? normalizedOption.legend
      : normalizedOption.legend
        ? [normalizedOption.legend]
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
      const names = (normalizedOption.series ?? [])
        .map((s) => s.name ?? "")
        .filter((n) => n !== "");
      const visible = names.filter((n) => !this.hiddenSeries.has(n));
      for (const extra of visible.slice(1)) this.hiddenSeries.add(extra);
    }

    // Initialize DataZoom state from option (skip "inside" — it has no initial range)
    const dataZooms = Array.isArray(option.dataZoom)
      ? option.dataZoom
      : option.dataZoom
        ? [option.dataZoom]
        : [];
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
    if (normalizedOption.tooltip?.show !== false) {
      this.tooltipCtrl = createTooltip(
        this.container,
        normalizedOption.tooltip ?? {},
      );
      this.bindTooltipEvents(normalizedOption);
    }

    this.render();
  }

  render(): void {
    if (!this.device || !this.option || this.destroyed) return;
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
    const grids = Array.isArray(option.grid)
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

    // Only render Cartesian axes when there are series that use them.
    // "lines" defaults to geo coordinates (see lines.ts) — only count it when explicitly cartesian2d,
    // otherwise a geo-only flow map gets spurious default axes drawn over it.
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
    ]);
    const hasCartesian = series.some(
      (s) =>
        cartesianTypes.has(s.type ?? "") &&
        !(s.type === "lines" && (s as any).coordinateSystem !== "cartesian2d"),
    );

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

    const titles = Array.isArray(option.title)
      ? option.title
      : option.title
        ? [option.title]
        : [];
    for (const title of titles) renderTitle(this.overlaysvg, title);

    const legends = Array.isArray(option.legend)
      ? option.legend
      : option.legend
        ? [option.legend]
        : [];

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
      );
    }

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

    const barSeries = series.filter((s): s is any => s.type === "bar");
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
      );
      seriesOffset += barSeries.length;
    }

    const lineSeries = series.filter((s): s is any => s.type === "line");
    if (lineSeries.length > 0 && this.lineRenderer) {
      const { series: stackedLineSeries, baselines: lineBaselines } =
        accumStackedLines(lineSeries);
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
      );
      seriesOffset += lineSeries.length;
    }

    const scatterSeries = series.filter((s): s is any => s.type === "scatter");
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
      );
      seriesOffset += pieSeries.length;
    }

    const radarSeries = series.filter((s): s is any => s.type === "radar");
    if (radarSeries.length > 0 && this.radarRenderer) {
      this.radarRenderer.render(
        renderPass,
        radarSeries,
        radars,
        width,
        height,
        seriesOffset,
        colorResolver,
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
      );
      seriesOffset += heatmapSeries.length;
    }

    const candleSeries = series.filter(
      (s): s is any => s.type === "candlestick",
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
    };

    // Line data-point symbols (below labels so labels render on top)
    renderSeriesSymbols(this.overlaysvg, svgOpts);

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
    const grids = Array.isArray(option.grid)
      ? option.grid
      : option.grid
        ? [option.grid]
        : [{}];

    const onMove = (event: MouseEvent) => {
      if (!this.option || !this.tooltipCtrl) return;
      const rect = this.container.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;

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

      const trigger = option.tooltip?.trigger ?? "axis";
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
            color: seriesColor(globalIdx),
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
          hitTestPie(
            series,
            mx,
            my,
            this.width,
            this.height,
            allSeries,
            this.hiddenSeries,
          ) ?? hitTestScatter(series, mx, my, xScales, yScales, allSeries);
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
    this.backsvg.remove();
    this.canvas.remove();
    this.overlaysvg.remove();
  }
}
