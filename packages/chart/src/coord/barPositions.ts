// Single source of truth for a bar's rendered pixel rect — grouped or
// stacked, vertical or horizontal, mixed sign. gl/BarRenderer.ts uses this to
// know where to draw; overlay/brush.ts uses the SAME positions to hit-test a
// drag against, so a brush selection can never disagree with what is
// actually painted on screen. Geometry only — no color/state resolution.

import type { AnyScale } from "../scale/index.js";
import type { BarSeriesOption, CandlestickSeriesOption } from "../types.js";
import {
  applyBarMinHeight,
  barSizingOptions,
  resolveBarLayout,
} from "./barLayout.js";

export interface BarRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function rawValueOf(item: unknown): number | null {
  if (typeof item === "number") return item;
  if (Array.isArray(item)) return item[1] as number;
  const value = (item as { value?: unknown } | null)?.value;
  return typeof value === "number" ? value : null;
}

function xArgOf(item: unknown, dataIndex: number): number {
  if (typeof item === "number") return dataIndex;
  if (Array.isArray(item)) return item[0] as number;
  return dataIndex;
}

// Positions for every datum of every bar series sharing one x/y axis pair —
// keyed by the series' position in the `series` array passed in (so callers
// index the result the same way they indexed their input).
export function layoutBarSeries(
  series: BarSeriesOption[],
  xScales: AnyScale[],
  yScales: AnyScale[],
): Map<number, (BarRect | null)[]> {
  const result = new Map<number, (BarRect | null)[]>();

  const axisGroups = new Map<
    string,
    { series: BarSeriesOption[]; indices: number[] }
  >();
  series.forEach((s, index) => {
    const key = `${s.xAxisIndex ?? 0}\0${s.yAxisIndex ?? 0}`;
    if (!axisGroups.has(key)) axisGroups.set(key, { series: [], indices: [] });
    const group = axisGroups.get(key)!;
    group.series.push(s);
    group.indices.push(index);
  });

  for (const axisGroup of axisGroups.values()) {
    const axisSeries = axisGroup.series;
    const firstSeries = axisSeries[0];
    const xScale = xScales[firstSeries?.xAxisIndex ?? 0];
    const yScale = yScales[firstSeries?.yAxisIndex ?? 0];
    if (!xScale || !yScale) continue;

    const stackGroups = new Map<
      string | null,
      { series: BarSeriesOption[]; indices: number[] }
    >();
    axisSeries.forEach((s, localIndex) => {
      const key = s.stack ?? null;
      if (!stackGroups.has(key))
        stackGroups.set(key, { series: [], indices: [] });
      const group = stackGroups.get(key)!;
      group.series.push(s);
      group.indices.push(axisGroup.indices[localIndex]);
    });

    const grouped = stackGroups.get(null) ?? { series: [], indices: [] };
    const stacked = [...stackGroups.entries()].filter(([key]) => key !== null);

    const isHorizontal = Math.abs(yScale.bandwidth()) > 0;

    if (isHorizontal) {
      const bandH = Math.abs(yScale.bandwidth());
      const columnCount = grouped.series.length + stacked.length;
      const groupLayout = resolveBarLayout({
        bandwidth: bandH,
        seriesCount: Math.max(1, columnCount),
        ...barSizingOptions(axisSeries),
      });
      const groupBarH = groupLayout.barSize;
      const zeroX = xScale.map(0);
      const baselineX = Number.isFinite(zeroX) ? zeroX : xScale.range[0];

      grouped.series.forEach((s, groupIndex) => {
        const seriesIndex = grouped.indices[groupIndex];
        const data = s.data ?? [];
        const rects: (BarRect | null)[] = data.map((item, dataIndex) => {
          const rawValue = rawValueOf(item);
          if (rawValue === null) return null;
          const yCenter = yScale.map(dataIndex);
          const xRight = xScale.map(rawValue);
          const signedW = applyBarMinHeight(
            xRight - baselineX,
            rawValue,
            s.barMinHeight,
          );
          return {
            x: Math.min(baselineX, baselineX + signedW),
            y: yCenter + groupLayout.offsetFor(groupIndex),
            width: Math.abs(signedW),
            height: groupBarH,
          };
        });
        result.set(seriesIndex, rects);
      });

      stacked.forEach(([, stackGroup], stackIndex) => {
        const stackRightsPos = new Map<number, number>();
        const stackRightsNeg = new Map<number, number>();
        const columnIndex = grouped.series.length + stackIndex;
        stackGroup.series.forEach((s, localIndex) => {
          const seriesIndex = stackGroup.indices[localIndex];
          const data = s.data ?? [];
          const rects: (BarRect | null)[] = data.map((item, dataIndex) => {
            const rawValue = rawValueOf(item);
            if (rawValue === null) return null;
            const stackRights = rawValue >= 0 ? stackRightsPos : stackRightsNeg;
            const prevRight = stackRights.get(dataIndex) ?? 0;
            const newRight = prevRight + rawValue;
            stackRights.set(dataIndex, newRight);
            const yCenter = yScale.map(dataIndex);
            const xLeft = xScale.map(prevRight);
            const xRight = xScale.map(newRight);
            const signedW = applyBarMinHeight(
              xRight - xLeft,
              rawValue,
              s.barMinHeight,
            );
            return {
              x: Math.min(xLeft, xLeft + signedW),
              y: yCenter + groupLayout.offsetFor(columnIndex),
              width: Math.abs(signedW),
              height: groupLayout.barSize,
            };
          });
          result.set(seriesIndex, rects);
        });
      });
    } else {
      const bandwidth = xScale.bandwidth();
      const columnCount = grouped.series.length + stacked.length;
      const groupLayout = resolveBarLayout({
        bandwidth,
        seriesCount: Math.max(1, columnCount),
        ...barSizingOptions(axisSeries),
      });
      const groupBarWidth = groupLayout.barSize;
      const zeroY = yScale.map(0);
      const baselineY = Number.isFinite(zeroY) ? zeroY : yScale.range[0];

      grouped.series.forEach((s, groupIndex) => {
        const seriesIndex = grouped.indices[groupIndex];
        const data = s.data ?? [];
        const rects: (BarRect | null)[] = data.map((item, dataIndex) => {
          const rawValue = rawValueOf(item);
          if (rawValue === null) return null;
          const xArg = xArgOf(item, dataIndex);
          const xCenter = xScale.map(xArg);
          const yTop = yScale.map(rawValue);
          const xLeft = xCenter + groupLayout.offsetFor(groupIndex);
          const signedH = applyBarMinHeight(
            baselineY - yTop,
            rawValue,
            s.barMinHeight,
          );
          return {
            x: xLeft,
            y: Math.min(baselineY, baselineY - signedH),
            width: groupBarWidth,
            height: Math.abs(signedH),
          };
        });
        result.set(seriesIndex, rects);
      });

      stacked.forEach(([, stackGroup], stackIndex) => {
        const stackTopsPos = new Map<number, number>();
        const stackTopsNeg = new Map<number, number>();
        const columnIndex = grouped.series.length + stackIndex;
        stackGroup.series.forEach((s, localIndex) => {
          const seriesIndex = stackGroup.indices[localIndex];
          const data = s.data ?? [];
          const rects: (BarRect | null)[] = data.map((item, dataIndex) => {
            const rawValue = rawValueOf(item);
            if (rawValue === null) return null;
            const stackTops = rawValue >= 0 ? stackTopsPos : stackTopsNeg;
            const prevTop = stackTops.get(dataIndex) ?? 0;
            const newTop = prevTop + rawValue;
            stackTops.set(dataIndex, newTop);
            const xArg = xArgOf(item, dataIndex);
            const xCenter = xScale.map(xArg);
            const xLeft = xCenter + groupLayout.offsetFor(columnIndex);
            const yTop = yScale.map(newTop);
            const yBottom = yScale.map(prevTop);
            const signedH = applyBarMinHeight(
              yBottom - yTop,
              rawValue,
              s.barMinHeight,
            );
            return {
              x: xLeft,
              y: Math.min(yBottom, yBottom - signedH),
              width: groupLayout.barSize,
              height: Math.abs(signedH),
            };
          });
          result.set(seriesIndex, rects);
        });
      });
    }
  }

  return result;
}

// A candlestick's whole visual extent (body + wick), for brush hit-testing
// only — gl/CandlestickRenderer.ts draws the body rect and the wick line as
// two separate shapes with their own up/down color logic, so unlike bars
// there is no single "the renderer draws exactly this rect" to share; this
// mirrors ONLY the position math (xCenter = xScale.map(index), bandwidth =
// xScale.bandwidth() * 0.7 — see CandlestickRenderer.ts render()) as a
// bounding box wide enough to cover the body (open/close, always between low
// and high) and the wick (low/high) alike.
export function layoutCandlestickSeries(
  series: CandlestickSeriesOption[],
  xScales: AnyScale[],
  yScales: AnyScale[],
): Map<number, (BarRect | null)[]> {
  const result = new Map<number, (BarRect | null)[]>();
  series.forEach((s, seriesIndex) => {
    const xScale = xScales[s.xAxisIndex ?? 0];
    const yScale = yScales[s.yAxisIndex ?? 0];
    if (!xScale || !yScale) return;
    const bandwidth = xScale.bandwidth() * 0.7;
    const data = s.data ?? [];
    const rects: (BarRect | null)[] = data.map((item, index) => {
      const raw = Array.isArray(item)
        ? item
        : (item as { value?: unknown })?.value;
      if (!Array.isArray(raw) || raw.length < 4) return null;
      const [, , low, high] = raw as [number, number, number, number];
      const xCenter = xScale.map(index);
      const yLow = yScale.map(low);
      const yHigh = yScale.map(high);
      return {
        x: xCenter - bandwidth / 2,
        y: Math.min(yHigh, yLow),
        width: bandwidth,
        height: Math.abs(yLow - yHigh) || 1,
      };
    });
    result.set(seriesIndex, rects);
  });
  return result;
}
