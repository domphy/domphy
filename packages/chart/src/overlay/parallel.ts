import type { ParallelOption, ParallelAxisOption, ParallelSeriesOption } from "../types.js";
import { seriesHex } from "../gl/color.js";

function svgEl(tag: string, attrs: Record<string, string | number>): SVGElement {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

interface AxisMeta {
  min: number;
  max: number;
  categories: string[];
  type: "value" | "category" | "time" | "log";
  x: number;
  top: number;
  bottom: number;
  name: string;
}

function buildAxisMeta(axis: ParallelAxisOption, data: number[][], axisX: number, top: number, bottom: number): AxisMeta {
  const type = axis.type ?? "value";
  const categories = axis.data ?? [];

  if (type === "category") {
    return { min: 0, max: categories.length - 1, categories, type, x: axisX, top, bottom, name: axis.name ?? "" };
  }

  const colValues = data.map((row) => row[axis.dim ?? 0] ?? 0).filter((v) => isFinite(v));
  let min = axis.min !== undefined ? Number(axis.min) : Math.min(...colValues, 0);
  let max = axis.max !== undefined ? Number(axis.max) : Math.max(...colValues, 1);
  if (min === max) { min -= 1; max += 1; }

  return { min, max, categories, type, x: axisX, top, bottom, name: axis.name ?? "" };
}

function normalizeValue(meta: AxisMeta, value: number | string): number {
  if (meta.type === "category") {
    const idx = meta.categories.indexOf(String(value));
    const i = idx >= 0 ? idx : Number(value);
    return (i - meta.min) / (meta.max - meta.min || 1);
  }
  const v = typeof value === "string" ? parseFloat(value) : value;
  return (v - meta.min) / (meta.max - meta.min || 1);
}

function valueToY(meta: AxisMeta, value: number | string): number {
  const t = Math.max(0, Math.min(1, normalizeValue(meta, value)));
  // Invert: 0=bottom, 1=top
  return meta.bottom - t * (meta.bottom - meta.top);
}

export function renderParallel(
  svg: SVGSVGElement,
  parallelOpts: ParallelOption[],
  parallelAxes: ParallelAxisOption[],
  parallelSeries: ParallelSeriesOption[],
  width: number,
  height: number,
  hiddenSeries: Set<string>,
): void {
  const old = svg.querySelector(".dc-parallel");
  if (old) old.remove();
  if (parallelAxes.length === 0 || parallelSeries.length === 0) return;

  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "dc-parallel");

  const parallelOpt = parallelOpts[0] ?? {};
  const left = typeof parallelOpt.left === "number" ? parallelOpt.left : typeof parallelOpt.left === "string" ? parseFloat(parallelOpt.left) : width * 0.1;
  const top = typeof parallelOpt.top === "number" ? parallelOpt.top : typeof parallelOpt.top === "string" ? parseFloat(parallelOpt.top) : height * 0.1;
  const right = typeof parallelOpt.right === "number" ? parallelOpt.right : typeof parallelOpt.right === "string" ? parseFloat(parallelOpt.right) : width * 0.05;
  const bottom = typeof parallelOpt.bottom === "number" ? parallelOpt.bottom : typeof parallelOpt.bottom === "string" ? parseFloat(parallelOpt.bottom) : height * 0.1;

  const drawTop = top;
  const drawBottom = height - bottom;
  const drawLeft = left;
  const drawRight = width - right;
  const drawW = drawRight - drawLeft;

  const numAxes = parallelAxes.length;
  if (numAxes < 2) return;

  const axisSpacing = drawW / (numAxes - 1);

  // Collect all series data for extent calculation
  const allData: number[][][] = parallelSeries
    .filter((s) => !s.name || !hiddenSeries.has(s.name))
    .map((s) => s.data ?? []);
  const flatData: number[][] = allData.flat();

  // Build axis metadata
  const axisMetas: AxisMeta[] = parallelAxes.map((axis, i) => {
    const x = drawLeft + i * axisSpacing;
    return buildAxisMeta(axis, flatData, x, drawTop, drawBottom);
  });

  // Draw axes
  for (let i = 0; i < axisMetas.length; i++) {
    const meta = axisMetas[i];

    // Axis line
    const line = svgEl("line", {
      x1: meta.x, y1: meta.top, x2: meta.x, y2: meta.bottom,
      stroke: "#aaa", "stroke-width": 1,
    });
    group.appendChild(line);

    // Axis name
    if (meta.name) {
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.textContent = meta.name;
      label.setAttribute("x", String(meta.x));
      label.setAttribute("y", String(meta.top - 8));
      label.setAttribute("font-size", "11");
      label.setAttribute("fill", "#555");
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("pointer-events", "none");
      group.appendChild(label);
    }

    // Ticks and labels
    const tickCount = meta.type === "category" ? meta.categories.length : 5;
    for (let t = 0; t <= tickCount; t++) {
      let tickValue: number | string;
      if (meta.type === "category") {
        if (t >= meta.categories.length) break;
        tickValue = meta.categories[t];
      } else {
        tickValue = meta.min + (t / tickCount) * (meta.max - meta.min);
      }
      const y = valueToY(meta, tickValue);

      const tick = svgEl("line", { x1: meta.x - 3, y1: y, x2: meta.x + 3, y2: y, stroke: "#aaa", "stroke-width": 1 });
      group.appendChild(tick);

      const tickLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      tickLabel.textContent = meta.type === "category" ? String(tickValue) : Number(tickValue).toFixed(1);
      tickLabel.setAttribute("x", String(meta.x - 6));
      tickLabel.setAttribute("y", String(y));
      tickLabel.setAttribute("font-size", "9");
      tickLabel.setAttribute("fill", "#888");
      tickLabel.setAttribute("text-anchor", "end");
      tickLabel.setAttribute("dominant-baseline", "middle");
      tickLabel.setAttribute("pointer-events", "none");
      group.appendChild(tickLabel);
    }
  }

  // Draw series polylines
  for (let si = 0; si < parallelSeries.length; si++) {
    const s = parallelSeries[si];
    if (s.name && hiddenSeries.has(s.name)) continue;

    const color = typeof s.color === "string" ? s.color : seriesHex(si);
    const data = s.data ?? [];

    for (const row of data) {
      const points: string[] = [];
      let valid = true;
      for (let ai = 0; ai < axisMetas.length; ai++) {
        const meta = axisMetas[ai];
        const dim = parallelAxes[ai].dim ?? ai;
        const value = row[dim];
        if (value === undefined || value === null || !isFinite(Number(value))) { valid = false; break; }
        const y = valueToY(meta, value);
        points.push(`${meta.x},${y}`);
      }
      if (!valid || points.length < 2) continue;

      const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      polyline.setAttribute("points", points.join(" "));
      polyline.setAttribute("fill", "none");
      polyline.setAttribute("stroke", color);
      polyline.setAttribute("stroke-width", String(s.lineStyle?.width ?? 1));
      polyline.setAttribute("opacity", String(s.lineStyle?.opacity ?? 0.5));
      group.appendChild(polyline);
    }
  }

  svg.appendChild(group);
}
