import type { AxisOption, ChartRect, GridOption } from "../types.js";
import { createLinearScale, createOrdinalScale, createTimeScale, createLogScale } from "../scale/index.js";
import type { AnyScale } from "../scale/index.js";

export interface GridCoord {
  gridRect: ChartRect;
  xScales: AnyScale[];
  yScales: AnyScale[];
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
  for (const s of series) {
    if ((s[axisKey] ?? 0) !== axisIndex) continue;
    const data: any[] = s.data ?? [];
    for (const item of data) {
      let value: number | null = null;
      if (typeof item === "number") {
        value = dim === "y" ? item : null;
      } else if (Array.isArray(item)) {
        value = dim === "x" ? item[0] : item[1];
      } else if (item && typeof item === "object") {
        const raw = item.value;
        if (typeof raw === "number") value = raw;
        else if (Array.isArray(raw)) value = dim === "x" ? raw[0] : raw[1];
      }
      if (value !== null && !Number.isNaN(value)) {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }
  }
  return [
    Number.isFinite(min) ? min : 0,
    Number.isFinite(max) ? max : 1,
  ];
}

function buildScale(axis: AxisOption, pixelRange: [number, number], extent: [number, number], categories: string[]): AnyScale {
  const type = axis.type ?? "value";
  const [pMin, pMax] = pixelRange;

  if (type === "category") {
    const domain = (axis.data as string[] | undefined) ?? categories;
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
  const [rawMin, rawMax] = [
    typeof axis.min === "number" ? axis.min : extent[0],
    typeof axis.max === "number" ? axis.max : extent[1],
  ];
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
): GridCoord {
  const grid = grids[0] ?? {};
  const rect = computeGridRect(grid, containerWidth, containerHeight);

  const xScales: AnyScale[] = xAxes.map((axis, index) => {
    const [min, max] = dataExtentFromSeries(series, "x", index, "xAxisIndex");
    const categories: string[] = (axis.data as string[] | undefined) ?? [];
    // x runs left to right
    return buildScale(axis, [rect.x, rect.x + rect.width], [min, max], categories);
  });

  const yScales: AnyScale[] = yAxes.map((axis, index) => {
    const [min, max] = dataExtentFromSeries(series, "y", index, "yAxisIndex");
    const categories: string[] = (axis.data as string[] | undefined) ?? [];
    // y runs bottom to top in data, but SVG/canvas is top-down, so flip
    return buildScale(axis, [rect.y + rect.height, rect.y], [min, max], categories);
  });

  return { gridRect: rect, xScales, yScales };
}
