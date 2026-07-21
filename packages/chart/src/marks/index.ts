import { themeColorToken } from "@domphy/theme";
import type { AnyScale } from "../scale/index.js";
import type {
  ChartRect,
  MarkAreaOption,
  MarkLineOption,
  MarkPointOption,
} from "../types.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function svgEl(tag: string, attrs: Record<string, string | number>): Element {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

function svgText(
  content: string,
  x: number,
  y: number,
  attrs: Record<string, string | number> = {},
): Element {
  const el = svgEl("text", { x, y, ...attrs });
  el.textContent = content;
  return el;
}

function resolveSpecialValue(
  type: "max" | "min" | "average" | undefined,
  seriesData: number[],
  scale: AnyScale,
  isX: boolean,
): number | null {
  if (!type) return null;
  const values = seriesData.filter((v) => !Number.isNaN(v));
  if (values.length === 0) return null;
  if (type === "max") return scale.map(Math.max(...values));
  if (type === "min") return scale.map(Math.min(...values));
  if (type === "average")
    return scale.map(values.reduce((a, b) => a + b, 0) / values.length);
  return null;
}

// ─── Mark Points ──────────────────────────────────────────────────────────────
export function renderMarkPoints(
  group: Element,
  mark: MarkPointOption,
  xScale: AnyScale,
  yScale: AnyScale,
  gridRect: ChartRect,
  seriesData: [any, number][],
): void {
  if (!mark.data) return;
  const labelColor = themeColorToken(null, "shift-9", "neutral");
  const dotColor = themeColorToken(null, "shift-9", "primary");

  for (const item of mark.data) {
    let px: number | null = null;
    let py: number | null = null;
    const yValues = seriesData.map(([, y]) => y);
    const yValuesNum = yValues.filter((v) => typeof v === "number") as number[];

    if (item.type === "max" && yValuesNum.length > 0) {
      const maxVal = Math.max(...yValuesNum);
      const maxIndex = yValues.indexOf(maxVal);
      px = xScale.map(seriesData[maxIndex][0]);
      py = yScale.map(maxVal);
    } else if (item.type === "min" && yValuesNum.length > 0) {
      const minVal = Math.min(...yValuesNum);
      const minIndex = yValues.indexOf(minVal);
      px = xScale.map(seriesData[minIndex][0]);
      py = yScale.map(minVal);
    } else if (item.type === "average" && yValuesNum.length > 0) {
      const avg = yValuesNum.reduce((a, b) => a + b, 0) / yValuesNum.length;
      px = gridRect.x + gridRect.width / 2;
      py = yScale.map(avg);
    } else if (item.coord) {
      px = xScale.map(item.coord[0]);
      py = yScale.map(item.coord[1]);
    }

    if (px === null || py === null) continue;

    // Pin dot
    const circle = svgEl("circle", {
      cx: px,
      cy: py,
      r: 5,
      fill: dotColor,
      stroke: "white",
      "stroke-width": 1.5,
    });
    group.appendChild(circle);

    // Label
    const label =
      item.name ??
      (item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : "");
    if (label) {
      group.appendChild(
        svgText(label, px, py - 10, {
          fill: labelColor,
          "text-anchor": "middle",
          "font-size": 11,
          "font-weight": "600",
        }),
      );
    }
  }
}

// ─── Mark Lines ───────────────────────────────────────────────────────────────
export function renderMarkLines(
  group: Element,
  mark: MarkLineOption,
  xScale: AnyScale,
  yScale: AnyScale,
  gridRect: ChartRect,
  seriesData: [any, number][],
): void {
  if (!mark.data) return;
  const lineColor = themeColorToken(null, "shift-7", "primary");
  const labelColor = themeColorToken(null, "shift-9", "neutral");
  const yValues = seriesData
    .map(([, y]) => y)
    .filter((v) => typeof v === "number") as number[];

  for (const segment of mark.data) {
    const [startDef, endDef] = segment;
    let x1: number | null = null;
    let y1: number | null = null;
    let x2: number | null = null;
    let y2: number | null = null;
    let label = "";

    for (const [def, isEnd] of [
      [startDef, false],
      [endDef, true],
    ] as [any, boolean][]) {
      let px: number | null = null;
      let py: number | null = null;
      if (def.type === "average" && yValues.length) {
        const avg = yValues.reduce((a, b) => a + b, 0) / yValues.length;
        px = isEnd ? gridRect.x + gridRect.width : gridRect.x;
        py = yScale.map(avg);
        label = `avg: ${avg.toFixed(2)}`;
      } else if (def.type === "max" && yValues.length) {
        const max = Math.max(...yValues);
        px = isEnd ? gridRect.x + gridRect.width : gridRect.x;
        py = yScale.map(max);
        label = `max: ${max}`;
      } else if (def.type === "min" && yValues.length) {
        const min = Math.min(...yValues);
        px = isEnd ? gridRect.x + gridRect.width : gridRect.x;
        py = yScale.map(min);
        label = `min: ${min}`;
      } else if (def.xAxis !== undefined) {
        px = xScale.map(def.xAxis);
        py = isEnd ? gridRect.y : gridRect.y + gridRect.height;
      } else if (def.yAxis !== undefined) {
        py = yScale.map(def.yAxis);
        px = isEnd ? gridRect.x + gridRect.width : gridRect.x;
      } else if (def.coord) {
        px = xScale.map(def.coord[0]);
        py = yScale.map(def.coord[1]);
      }
      if (isEnd) {
        x2 = px;
        y2 = py;
      } else {
        x1 = px;
        y1 = py;
      }
    }

    if (x1 === null || y1 === null || x2 === null || y2 === null) continue;

    const line = svgEl("line", {
      x1,
      y1,
      x2,
      y2,
      stroke: lineColor,
      "stroke-width": mark.lineStyle?.width ?? 1,
      "stroke-dasharray": "6,4",
      opacity: 0.8,
    });
    group.appendChild(line);

    if (label) {
      group.appendChild(
        svgText(label, (x1 + x2) / 2, (y1 + y2) / 2 - 6, {
          fill: labelColor,
          "text-anchor": "middle",
          "font-size": 10,
        }),
      );
    }
  }
}

// ─── Mark Areas ───────────────────────────────────────────────────────────────
export function renderMarkAreas(
  group: Element,
  mark: MarkAreaOption,
  xScale: AnyScale,
  yScale: AnyScale,
  gridRect: ChartRect,
): void {
  if (!mark.data) return;
  const fillColor = themeColorToken(null, "shift-3", "primary");

  for (const [corner1, corner2] of mark.data) {
    let x1 = gridRect.x;
    let y1 = gridRect.y;
    let x2 = gridRect.x + gridRect.width;
    let y2 = gridRect.y + gridRect.height;

    if (corner1.xAxis !== undefined) x1 = xScale.map(corner1.xAxis as number);
    if (corner1.yAxis !== undefined) y1 = yScale.map(corner1.yAxis as number);
    if (corner2.xAxis !== undefined) x2 = xScale.map(corner2.xAxis as number);
    if (corner2.yAxis !== undefined) y2 = yScale.map(corner2.yAxis as number);

    if (corner1.coord) {
      x1 = xScale.map(corner1.coord[0] as number);
      y1 = yScale.map(corner1.coord[1] as number);
    }
    if (corner2.coord) {
      x2 = xScale.map(corner2.coord[0] as number);
      y2 = yScale.map(corner2.coord[1] as number);
    }

    const rectEl = svgEl("rect", {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
      fill: fillColor,
      opacity: 0.2,
    });
    group.appendChild(rectEl);
  }
}

export function renderMarksToSvg(
  svg: SVGSVGElement,
  marksData: {
    markPoint?: MarkPointOption;
    markLine?: MarkLineOption;
    markArea?: MarkAreaOption;
    xScale: AnyScale;
    yScale: AnyScale;
    gridRect: ChartRect;
    seriesData: [any, number][];
  }[],
): void {
  const old = svg.querySelector(".dc-marks");
  if (old) old.remove();
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "dc-marks");
  group.setAttribute("pointer-events", "none");

  for (const {
    markPoint,
    markLine,
    markArea,
    xScale,
    yScale,
    gridRect,
    seriesData,
  } of marksData) {
    if (markArea) renderMarkAreas(group, markArea, xScale, yScale, gridRect);
    if (markLine)
      renderMarkLines(group, markLine, xScale, yScale, gridRect, seriesData);
    if (markPoint)
      renderMarkPoints(group, markPoint, xScale, yScale, gridRect, seriesData);
  }
  svg.appendChild(group);
}
