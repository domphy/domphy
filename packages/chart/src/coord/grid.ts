import type { AnyScale } from "../scale/index.js";
import {
  createLinearScale,
  createLogScale,
  createOrdinalScale,
  createTimeScale,
} from "../scale/index.js";
import type { AxisOption, ChartRect, GridOption } from "../types.js";

export interface GridCoord {
  gridRect: ChartRect;
  xScales: AnyScale[];
  yScales: AnyScale[];
}

export interface ZoomWindow {
  start: number; // 0–100 percentage
  end: number; // 0–100 percentage
}

function resolvePercent(
  value: number | string | undefined,
  total: number,
  fallback: number,
): number {
  if (value === undefined) return fallback;
  if (typeof value === "number") return value;
  if (value.endsWith("%")) return (parseFloat(value) / 100) * total;
  return parseFloat(value);
}

function computeGridRect(
  grid: GridOption,
  containerWidth: number,
  containerHeight: number,
): ChartRect {
  const left = resolvePercent(grid.left, containerWidth, 60);
  const top = resolvePercent(grid.top, containerHeight, 40);
  const right = resolvePercent(grid.right, containerWidth, 20);
  const bottom = resolvePercent(grid.bottom, containerHeight, 50);
  return {
    x: left,
    y: top,
    // A container smaller than the axis margins (a chart in a narrow sidebar,
    // a collapsing flex cell) otherwise yields a negative extent, which
    // reverses every scale's pixel range and draws the whole plot outside the
    // rect. Collapse to zero instead: degenerate but still inside the box.
    width: Math.max(0, containerWidth - left - right),
    height: Math.max(0, containerHeight - top - bottom),
  };
}

// A time axis carries Date objects / ISO date strings as its dimension values.
// Reading them as `typeof value === "number"` (the only branch that existed
// before) dropped every point, collapsing the extent to the [0, 1] fallback —
// i.e. 1970-01-01T00:00:00.000Z … .001Z — so an auto-ranged time chart mapped
// all of its data millions of pixels off-canvas.
function toAxisNumber(value: unknown, acceptDates: boolean): number | null {
  if (typeof value === "number") return Number.isNaN(value) ? null : value;
  if (!acceptDates) return null;
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isNaN(ms) ? null : ms;
  }
  if (typeof value === "string") {
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? null : ms;
  }
  return null;
}

function dataExtentFromSeries(
  series: any[],
  dim: "x" | "y" | "value",
  axisIndex: number,
  axisKey: "xAxisIndex" | "yAxisIndex",
  acceptDates = false,
  // Which dimension a SCALAR datum's number belongs to, per series. Vertical
  // charts (the default) read it as y; a horizontal one — category y axis —
  // reads it as x. The other dimension is then the item's index.
  scalarValueDim: (s: any) => "x" | "y" = () => "y",
): [number, number] {
  let min = Infinity;
  let max = -Infinity;

  // Series sharing a `stack` id are rendered as a cumulative total on this
  // dimension (see engine.ts's accumStackedLines and gl/BarRenderer.ts's
  // stackTops/stackRights) — the axis extent must be computed from that same
  // cumulative sum, not each series' own raw values, or the topmost stacked
  // layer overflows past an axis that was auto-sized from individual-series
  // maxima (each stacked series' running total is tracked in its own map
  // entry so unrelated stack groups don't bleed into each other).
  // ECharts mixed-sign stacking: positive and negative values accumulate in
  // separate running totals (up/down from the zero baseline), so the extent
  // must track both — same-sign stacks leave one total at zero and match the
  // old single-total math exactly.
  const stackRunningTotalPos = new Map<string, number[]>();
  const stackRunningTotalNeg = new Map<string, number[]>();

  for (const s of series) {
    if ((s[axisKey] ?? 0) !== axisIndex) continue;
    const data: any[] = s.data ?? [];
    const stackName: string | undefined =
      typeof s.stack === "string" ? s.stack : undefined;
    let accPos: number[] | undefined;
    let accNeg: number[] | undefined;
    if (stackName) {
      if (!stackRunningTotalPos.has(stackName))
        stackRunningTotalPos.set(stackName, []);
      if (!stackRunningTotalNeg.has(stackName))
        stackRunningTotalNeg.set(stackName, []);
      accPos = stackRunningTotalPos.get(stackName)!;
      accNeg = stackRunningTotalNeg.get(stackName)!;
    }

    data.forEach((item, itemIndex) => {
      if (Array.isArray(item)) {
        // boxplot: [min, Q1, median, Q3, max]
        // candlestick: [open, close, lowest, highest]
        // Both draw between their own extremes, so the value axis has to cover
        // every number in the tuple — reading item[1] alone (close / Q1) left
        // the wicks hanging outside the plot rect.
        if (s.type === "boxplot" || s.type === "candlestick") {
          if (dim === "y") {
            for (const v of item) {
              if (typeof v === "number" && !Number.isNaN(v)) {
                min = Math.min(min, v);
                max = Math.max(max, v);
              }
            }
          } else {
            // x is the category index (handled by OrdinalScale)
          }
          return;
        }
        let value = toAxisNumber(dim === "x" ? item[0] : item[1], acceptDates);
        if (value !== null) {
          if (accPos && accNeg) {
            const acc = value >= 0 ? accPos : accNeg;
            value = (acc[itemIndex] ?? 0) + value;
            acc[itemIndex] = value;
          }
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
        return;
      }
      // A scalar datum (a plain number, or an object whose `value` is not a
      // pair) carries only ONE dimension; the other is the item's index —
      // exactly what LineRenderer/ScatterRenderer/dataItemXY map through the
      // opposite scale. Reporting no extent at all for the index dimension
      // left a `type: "value"` x axis on the [0, 1] fallback domain, so index
      // 4 of a 5-point series mapped to 1262px on a 400px-wide chart. Index
      // extents are positional and never take part in stack accumulation.
      const valueDim = scalarValueDim(s);
      let value: number | null = null;
      let isIndex = false;
      if (typeof item === "number") {
        if (dim === valueDim) value = toAxisNumber(item, acceptDates);
        else {
          value = itemIndex;
          isIndex = true;
        }
      } else if (item && typeof item === "object") {
        const raw = (item as any).value;
        if (Array.isArray(raw))
          value = toAxisNumber(dim === "x" ? raw[0] : raw[1], acceptDates);
        else if (dim === valueDim) value = toAxisNumber(raw, acceptDates);
        else {
          value = itemIndex;
          isIndex = true;
        }
      }
      if (isIndex) {
        min = Math.min(min, value as number);
        max = Math.max(max, value as number);
        return;
      }
      if (value !== null) {
        if (accPos && accNeg) {
          const acc = value >= 0 ? accPos : accNeg;
          value = (acc[itemIndex] ?? 0) + value;
          acc[itemIndex] = value;
        }
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    });
  }
  return [Number.isFinite(min) ? min : 0, Number.isFinite(max) ? max : 1];
}

function applyZoomWindow(
  min: number,
  max: number,
  zoom?: ZoomWindow,
): [number, number] {
  if (!zoom || (zoom.start === 0 && zoom.end === 100)) return [min, max];
  const span = max - min;
  return [min + (zoom.start / 100) * span, min + (zoom.end / 100) * span];
}

// ECharts: `min`/`max` accept the literals "dataMin"/"dataMax" as well as a
// number (and, on a time axis, a Date or a date string). Anything else falls
// back to the data extent rather than poisoning the domain with NaN.
function resolveBound(
  bound: AxisOption["min"],
  fallback: number,
  acceptDates: boolean,
): number {
  if (bound === undefined || bound === "dataMin" || bound === "dataMax")
    return fallback;
  const value = toAxisNumber(bound, acceptDates);
  return value === null ? fallback : value;
}

function buildScale(
  axis: AxisOption,
  pixelRange: [number, number],
  extent: [number, number],
  categories: string[],
  zoom?: ZoomWindow,
  hasBarSeries = false,
): AnyScale {
  const type = axis.type ?? "value";
  // ECharts axis.inverse: flip the pixel range so the domain runs the other
  // way. Doing it here keeps every renderer and hit-test on the same scale.
  const [pMin, pMax] = axis.inverse
    ? [pixelRange[1], pixelRange[0]]
    : pixelRange;

  if (type === "category") {
    const domain = (axis.data as string[] | undefined) ?? categories;
    // ECharts axis.boundaryGap defaults to true on a category axis.
    const boundaryGap = axis.boundaryGap !== false;
    // Apply zoom to category axis by slicing visible domain
    if (zoom && (zoom.start !== 0 || zoom.end !== 100)) {
      const startIdx = Math.floor((zoom.start / 100) * domain.length);
      const endIdx = Math.ceil((zoom.end / 100) * domain.length);
      const visible = domain.slice(startIdx, endIdx);
      return createOrdinalScale(
        visible.length > 0 ? visible : domain,
        [pMin, pMax],
        undefined,
        boundaryGap,
      );
    }
    return createOrdinalScale(domain, [pMin, pMax], undefined, boundaryGap);
  }
  if (type === "time") {
    let [min, max] = [
      resolveBound(axis.min, extent[0], true),
      resolveBound(axis.max, extent[1], true),
    ];
    [min, max] = applyZoomWindow(min, max, zoom);
    return createTimeScale([new Date(min), new Date(max)], [pMin, pMax]);
  }
  if (type === "log") {
    // Do not force min to 1 — that clips (0, 1) data. Use the positive
    // data min when the extent is already above zero; otherwise keep the
    // historical floor of 1 (zeros/negatives cannot sit on a log axis).
    let [min, max] = [
      typeof axis.min === "number" ? axis.min : extent[0] > 0 ? extent[0] : 1,
      typeof axis.max === "number" ? axis.max : extent[1],
    ];
    [min, max] = applyZoomWindow(min, max, zoom);
    return createLogScale([min, max], [pMin, pMax], axis.logBase ?? 10);
  }
  // Default: value (linear)
  let [rawMin, rawMax] = [
    resolveBound(axis.min, extent[0], false),
    resolveBound(axis.max, extent[1], false),
  ];
  // ECharts: a value axis carrying bar-like series always spans the zero
  // baseline, because the bars are drawn from scale.map(0). Without this the
  // baseline lands outside the plot rect (data [70…200] gave map(0) = 500px on
  // a 350px-tall grid) and every bar length is read against an axis it does
  // not actually start on. An explicit min/max still wins.
  if (hasBarSeries) {
    if (axis.min === undefined) rawMin = Math.min(rawMin, 0);
    if (axis.max === undefined) rawMax = Math.max(rawMax, 0);
  }
  [rawMin, rawMax] = applyZoomWindow(rawMin, rawMax, zoom);
  // Expand by 5% for aesthetics if no explicit bounds set and range is not zero
  const span = rawMax - rawMin;
  // Never pad past the zero baseline a bar chart is anchored to.
  const padMin =
    axis.min !== undefined || (hasBarSeries && rawMin === 0)
      ? rawMin
      : rawMin - span * 0.02;
  const padMax =
    axis.max !== undefined || (hasBarSeries && rawMax === 0)
      ? rawMax
      : rawMax + span * 0.05;
  return createLinearScale(
    [
      padMin === padMax ? padMin - 1 : padMin,
      padMax === rawMin ? padMax + 1 : padMax,
    ],
    [pMin, pMax],
  );
}

export function resolveGrid(
  grids: GridOption[],
  xAxes: AxisOption[],
  yAxes: AxisOption[],
  series: any[],
  containerWidth: number,
  containerHeight: number,
  xZoom?: Map<number, ZoomWindow>,
  yZoom?: Map<number, ZoomWindow>,
): GridCoord {
  const grid = grids[0] ?? {};
  const rect = computeGridRect(grid, containerWidth, containerHeight);

  // A value axis that any bar-like series is attached to must span zero (see
  // buildScale). Candlestick/boxplot are NOT bar-like here: they draw between
  // their own high/low values, not from a zero baseline.
  const hasBarOn = (axisKey: "xAxisIndex" | "yAxisIndex", index: number) =>
    series.some(
      (s) =>
        (s?.type === "bar" || s?.type === "pictorialBar") &&
        (s[axisKey] ?? 0) === index,
    );

  // Horizontal orientation: the renderers decide it by "the y scale has a
  // bandwidth", i.e. the y axis is a category axis. A scalar datum's number is
  // then the x value and its index is the y position.
  const scalarValueDim = (s: any): "x" | "y" =>
    yAxes[s?.yAxisIndex ?? 0]?.type === "category" &&
    xAxes[s?.xAxisIndex ?? 0]?.type !== "category"
      ? "x"
      : "y";

  const xScales: AnyScale[] = xAxes.map((axis, index) => {
    const isTime = axis.type === "time";
    const [min, max] = dataExtentFromSeries(
      series,
      "x",
      index,
      "xAxisIndex",
      isTime,
      scalarValueDim,
    );
    const categories: string[] = (axis.data as string[] | undefined) ?? [];
    return buildScale(
      axis,
      [rect.x, rect.x + rect.width],
      [min, max],
      categories,
      xZoom?.get(index),
      hasBarOn("xAxisIndex", index),
    );
  });

  const yScales: AnyScale[] = yAxes.map((axis, index) => {
    const isTime = axis.type === "time";
    const [min, max] = dataExtentFromSeries(
      series,
      "y",
      index,
      "yAxisIndex",
      isTime,
      scalarValueDim,
    );
    const categories: string[] = (axis.data as string[] | undefined) ?? [];
    // y runs bottom to top in data, but SVG/canvas is top-down, so flip
    return buildScale(
      axis,
      [rect.y + rect.height, rect.y],
      [min, max],
      categories,
      yZoom?.get(index),
      hasBarOn("yAxisIndex", index),
    );
  });

  return { gridRect: rect, xScales, yScales };
}
