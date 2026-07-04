import type { AxisOption, ChartRect, GridOption } from "../types.js";
import { createLinearScale, createOrdinalScale, createTimeScale, createLogScale } from "../scale/index.js";
import type { AnyScale } from "../scale/index.js";

export interface GridCoord {
  gridRect: ChartRect;
  xScales: AnyScale[];
  yScales: AnyScale[];
}

export interface ZoomWindow {
  start: number; // 0–100 percentage
  end: number;   // 0–100 percentage
}

function resolvePercent(value: number | string | undefined, total: number, fallback: number): number {
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
  const left   = resolvePercent(grid.left, containerWidth, 60);
  const top    = resolvePercent(grid.top, containerHeight, 40);
  const right  = resolvePercent(grid.right, containerWidth, 20);
  const bottom = resolvePercent(grid.bottom, containerHeight, 50);
  return {
    x: left,
    y: top,
    width: containerWidth - left - right,
    height: containerHeight - top - bottom,
  };
}

function dataExtentFromSeries(
  series: any[],
  dim: "x" | "y" | "value",
  axisIndex: number,
  axisKey: "xAxisIndex" | "yAxisIndex",
): [number, number] {
  let min = Infinity;
  let max = -Infinity;

  // Series sharing a `stack` id are rendered as a cumulative running total on
  // this dimension (see engine.ts's accumStackedLines and gl/BarRenderer.ts's
  // stackTops/stackRights) — the axis extent must be computed from that same
  // cumulative sum, not each series' own raw values, or the topmost stacked
  // layer overflows past an axis that was auto-sized from individual-series
  // maxima (each stacked series' running total is tracked in its own map
  // entry so unrelated stack groups don't bleed into each other).
  const stackRunningTotal = new Map<string, number[]>();

  for (const s of series) {
    if ((s[axisKey] ?? 0) !== axisIndex) continue;
    const data: any[] = s.data ?? [];
    const stackName: string | undefined = typeof s.stack === "string" ? s.stack : undefined;
    let acc: number[] | undefined;
    if (stackName) {
      if (!stackRunningTotal.has(stackName)) stackRunningTotal.set(stackName, []);
      acc = stackRunningTotal.get(stackName)!;
    }

    data.forEach((item, itemIndex) => {
      if (Array.isArray(item)) {
        if (s.type === "boxplot") {
          // boxplot: [min, Q1, median, Q3, max] — capture full range on y dim
          if (dim === "y") {
            for (const v of item) {
              if (typeof v === "number" && !Number.isNaN(v)) { min = Math.min(min, v); max = Math.max(max, v); }
            }
          } else {
            // x is the category index (handled by OrdinalScale)
          }
          return;
        }
        let value = dim === "x" ? item[0] : item[1];
        if (typeof value === "number" && !Number.isNaN(value)) {
          if (acc) { value = (acc[itemIndex] ?? 0) + value; acc[itemIndex] = value; }
          min = Math.min(min, value); max = Math.max(max, value);
        }
        return;
      }
      let value: number | null = null;
      if (typeof item === "number") {
        value = dim === "y" ? item : null;
      } else if (item && typeof item === "object") {
        const raw = (item as any).value;
        if (typeof raw === "number") value = raw;
        else if (Array.isArray(raw)) value = dim === "x" ? raw[0] : raw[1];
      }
      if (value !== null && !Number.isNaN(value)) {
        if (acc) { value = (acc[itemIndex] ?? 0) + value; acc[itemIndex] = value; }
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    });
  }
  return [
    Number.isFinite(min) ? min : 0,
    Number.isFinite(max) ? max : 1,
  ];
}

function buildScale(
  axis: AxisOption,
  pixelRange: [number, number],
  extent: [number, number],
  categories: string[],
  zoom?: ZoomWindow,
): AnyScale {
  const type = axis.type ?? "value";
  const [pMin, pMax] = pixelRange;

  if (type === "category") {
    const domain = (axis.data as string[] | undefined) ?? categories;
    // Apply zoom to category axis by slicing visible domain
    if (zoom && (zoom.start !== 0 || zoom.end !== 100)) {
      const startIdx = Math.floor((zoom.start / 100) * domain.length);
      const endIdx = Math.ceil((zoom.end / 100) * domain.length);
      const visible = domain.slice(startIdx, endIdx);
      return createOrdinalScale(visible.length > 0 ? visible : domain, [pMin, pMax]);
    }
    return createOrdinalScale(domain, [pMin, pMax]);
  }
  if (type === "time") {
    const [min, max] = [
      axis.min !== undefined ? Number(axis.min) : extent[0],
      axis.max !== undefined ? Number(axis.max) : extent[1],
    ];
    return createTimeScale([new Date(min), new Date(max)], [pMin, pMax]);
  }
  if (type === "log") {
    const [min, max] = [
      typeof axis.min === "number" ? axis.min : Math.max(extent[0], 1),
      typeof axis.max === "number" ? axis.max : extent[1],
    ];
    return createLogScale([min, max], [pMin, pMax], axis.logBase ?? 10);
  }
  // Default: value (linear)
  let [rawMin, rawMax] = [
    typeof axis.min === "number" ? axis.min : extent[0],
    typeof axis.max === "number" ? axis.max : extent[1],
  ];
  // Apply zoom window for linear/time/log axes
  if (zoom && (zoom.start !== 0 || zoom.end !== 100)) {
    const span = rawMax - rawMin;
    const zoomMin = rawMin + (zoom.start / 100) * span;
    const zoomMax = rawMin + (zoom.end / 100) * span;
    rawMin = zoomMin;
    rawMax = zoomMax;
  }
  // Expand by 5% for aesthetics if no explicit bounds set and range is not zero
  const span = rawMax - rawMin;
  const padMin = axis.min !== undefined ? rawMin : rawMin - span * 0.02;
  const padMax = axis.max !== undefined ? rawMax : rawMax + span * 0.05;
  return createLinearScale([padMin === padMax ? padMin - 1 : padMin, padMax === rawMin ? padMax + 1 : padMax], [pMin, pMax]);
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

  const xScales: AnyScale[] = xAxes.map((axis, index) => {
    const [min, max] = dataExtentFromSeries(series, "x", index, "xAxisIndex");
    const categories: string[] = (axis.data as string[] | undefined) ?? [];
    return buildScale(axis, [rect.x, rect.x + rect.width], [min, max], categories, xZoom?.get(index));
  });

  const yScales: AnyScale[] = yAxes.map((axis, index) => {
    const [min, max] = dataExtentFromSeries(series, "y", index, "yAxisIndex");
    const categories: string[] = (axis.data as string[] | undefined) ?? [];
    // y runs bottom to top in data, but SVG/canvas is top-down, so flip
    return buildScale(axis, [rect.y + rect.height, rect.y], [min, max], categories, yZoom?.get(index));
  });

  return { gridRect: rect, xScales, yScales };
}
