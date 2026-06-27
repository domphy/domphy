import type {
  Grid3DOption, Axis3DOption, Scatter3DSeriesOption, Bar3DSeriesOption, Line3DSeriesOption,
} from "../types.js";
import { seriesHex } from "./color.js";

function svgEl(tag: string, attrs: Record<string, string | number>): SVGElement {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

// Perspective projection: 3D → 2D
// x, y, z are in normalized box space [-0.5, 0.5]
function project3D(
  x: number, y: number, z: number,
  alpha: number, beta: number, dist: number,
): [number, number] {
  const ar = alpha * Math.PI / 180;
  const br = beta * Math.PI / 180;

  // Rotate around Y axis by beta
  const x1 = x * Math.cos(br) + z * Math.sin(br);
  const y1 = -x * Math.sin(ar) * Math.sin(br) + y * Math.cos(ar) + z * Math.sin(ar) * Math.cos(br);
  const z1 = -x * Math.cos(ar) * Math.sin(br) - y * Math.sin(ar) + z * Math.cos(ar) * Math.cos(br);

  // Perspective divide
  const scale = dist / (dist + z1 + dist * 0.5);
  return [x1 * scale, -y1 * scale];
}

interface AxisRange {
  min: number;
  max: number;
}

function computeAxisRange(axis: Axis3DOption, values: number[]): AxisRange {
  if (axis.min !== undefined && axis.max !== undefined) {
    return { min: Number(axis.min), max: Number(axis.max) };
  }
  const min = axis.min !== undefined ? Number(axis.min) : Math.min(...values, 0);
  const max = axis.max !== undefined ? Number(axis.max) : Math.max(...values, 1);
  return { min: min === max ? min - 1 : min, max: min === max ? max + 1 : max };
}

function normalize(value: number, range: AxisRange): number {
  return (value - range.min) / (range.max - range.min) - 0.5;
}

interface BoxRect {
  centerX: number;
  centerY: number;
  scale: number;
}

function computeBoxRect(grid: Grid3DOption, width: number, height: number): BoxRect {
  const left = typeof grid.left === "number" ? grid.left : typeof grid.left === "string" ? parseFloat(grid.left) : width * 0.1;
  const top = typeof grid.top === "number" ? grid.top : typeof grid.top === "string" ? parseFloat(grid.top) : height * 0.1;
  const right = typeof grid.right === "number" ? grid.right : typeof grid.right === "string" ? parseFloat(grid.right) : width * 0.1;
  const bottom = typeof grid.bottom === "number" ? grid.bottom : typeof grid.bottom === "string" ? parseFloat(grid.bottom) : height * 0.1;

  const drawW = width - left - right;
  const drawH = height - top - bottom;

  return {
    centerX: left + drawW / 2,
    centerY: top + drawH / 2,
    scale: Math.min(drawW, drawH) * 0.45,
  };
}

export function renderGrid3D(
  svg: SVGSVGElement,
  grid3Ds: Grid3DOption[],
  xAxes3D: Axis3DOption[],
  yAxes3D: Axis3DOption[],
  zAxes3D: Axis3DOption[],
  scatter3D: Scatter3DSeriesOption[],
  bar3D: Bar3DSeriesOption[],
  line3D: Line3DSeriesOption[],
  width: number,
  height: number,
): void {
  const old = svg.querySelector(".dc-3d");
  if (old) old.remove();

  const allSeries = [...scatter3D, ...bar3D, ...line3D];
  if (allSeries.length === 0 && grid3Ds.length === 0) return;

  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "dc-3d");

  const grid = grid3Ds[0] ?? {};
  const viewControl = grid.viewControl ?? {};
  const alpha = viewControl.alpha ?? 40;
  const beta = viewControl.beta ?? 40;
  const dist = viewControl.distance ?? 200;

  const boxRect = computeBoxRect(grid, width, height);
  const { centerX, centerY, scale } = boxRect;

  // Collect all 3D points to compute axis ranges
  const allPoints: [number, number, number][] = [];
  for (const s of allSeries) {
    for (const item of s.data ?? []) {
      const v = Array.isArray(item) ? item : (item as any).value;
      if (Array.isArray(v) && v.length >= 3) {
        allPoints.push([Number(v[0]), Number(v[1]), Number(v[2])]);
      }
    }
  }

  const xAxis = xAxes3D[0] ?? {};
  const yAxis = yAxes3D[0] ?? {};
  const zAxis = zAxes3D[0] ?? {};

  const xRange = computeAxisRange(xAxis, allPoints.map((p) => p[0]));
  const yRange = computeAxisRange(yAxis, allPoints.map((p) => p[1]));
  const zRange = computeAxisRange(zAxis, allPoints.map((p) => p[2]));

  function toPixel(nx: number, ny: number, nz: number): [number, number] {
    const [px, py] = project3D(nx, ny, nz, alpha, beta, dist);
    return [centerX + px * scale, centerY + py * scale];
  }

  // Draw box wireframe
  const corners: [number, number, number][] = [
    [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5],
    [-0.5, -0.5, 0.5],  [0.5, -0.5, 0.5],  [0.5, 0.5, 0.5],  [-0.5, 0.5, 0.5],
  ];
  const edges: [number, number][] = [
    [0,1],[1,2],[2,3],[3,0], // bottom face
    [4,5],[5,6],[6,7],[7,4], // top face
    [0,4],[1,5],[2,6],[3,7], // verticals
  ];

  const wireGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  wireGroup.setAttribute("opacity", "0.3");
  for (const [a, b] of edges) {
    const [ax, ay] = toPixel(...corners[a]);
    const [bx, by] = toPixel(...corners[b]);
    wireGroup.appendChild(svgEl("line", { x1: ax, y1: ay, x2: bx, y2: by, stroke: "#888", "stroke-width": 1 }));
  }
  group.appendChild(wireGroup);

  // Draw axis labels
  const tickCount = 5;
  const axisLabelsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");

  for (let i = 0; i <= tickCount; i++) {
    const t = i / tickCount;

    // X axis ticks along bottom-front edge
    const xVal = xRange.min + t * (xRange.max - xRange.min);
    const [xx, xy] = toPixel(t - 0.5, -0.5, 0.5);
    const xLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    xLabel.textContent = xAxis.axisLabel?.formatter ? String(xAxis.axisLabel.formatter(xVal)) : xVal.toFixed(1);
    xLabel.setAttribute("x", String(xx));
    xLabel.setAttribute("y", String(xy + 14));
    xLabel.setAttribute("font-size", "9");
    xLabel.setAttribute("fill", "#888");
    xLabel.setAttribute("text-anchor", "middle");
    xLabel.setAttribute("pointer-events", "none");
    axisLabelsGroup.appendChild(xLabel);

    // Y axis ticks along left-front edge
    const yVal = yRange.min + t * (yRange.max - yRange.min);
    const [yx, yy] = toPixel(-0.5, t - 0.5, 0.5);
    const yLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    yLabel.textContent = yAxis.axisLabel?.formatter ? String(yAxis.axisLabel.formatter(yVal)) : yVal.toFixed(1);
    yLabel.setAttribute("x", String(yx - 8));
    yLabel.setAttribute("y", String(yy));
    yLabel.setAttribute("font-size", "9");
    yLabel.setAttribute("fill", "#888");
    yLabel.setAttribute("text-anchor", "end");
    yLabel.setAttribute("dominant-baseline", "middle");
    yLabel.setAttribute("pointer-events", "none");
    axisLabelsGroup.appendChild(yLabel);

    // Z axis ticks along left-back vertical
    const zVal = zRange.min + t * (zRange.max - zRange.min);
    const [zx, zy] = toPixel(-0.5, -0.5, t - 0.5);
    const zLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    zLabel.textContent = zAxis.axisLabel?.formatter ? String(zAxis.axisLabel.formatter(zVal)) : zVal.toFixed(1);
    zLabel.setAttribute("x", String(zx - 8));
    zLabel.setAttribute("y", String(zy));
    zLabel.setAttribute("font-size", "9");
    zLabel.setAttribute("fill", "#888");
    zLabel.setAttribute("text-anchor", "end");
    zLabel.setAttribute("dominant-baseline", "middle");
    zLabel.setAttribute("pointer-events", "none");
    axisLabelsGroup.appendChild(zLabel);
  }

  // Axis name labels
  if (xAxis.name) {
    const [nx, ny] = toPixel(0, -0.5, 0.5);
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.textContent = xAxis.name;
    label.setAttribute("x", String(nx));
    label.setAttribute("y", String(ny + 28));
    label.setAttribute("font-size", "11");
    label.setAttribute("fill", "#555");
    label.setAttribute("text-anchor", "middle");
    axisLabelsGroup.appendChild(label);
  }
  if (yAxis.name) {
    const [nx, ny] = toPixel(-0.5, 0, 0.5);
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.textContent = yAxis.name;
    label.setAttribute("x", String(nx - 24));
    label.setAttribute("y", String(ny));
    label.setAttribute("font-size", "11");
    label.setAttribute("fill", "#555");
    label.setAttribute("text-anchor", "middle");
    axisLabelsGroup.appendChild(label);
  }
  if (zAxis.name) {
    const [nx, ny] = toPixel(-0.5, -0.5, 0);
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.textContent = zAxis.name;
    label.setAttribute("x", String(nx - 24));
    label.setAttribute("y", String(ny));
    label.setAttribute("font-size", "11");
    label.setAttribute("fill", "#555");
    label.setAttribute("text-anchor", "middle");
    axisLabelsGroup.appendChild(label);
  }

  group.appendChild(axisLabelsGroup);

  // Draw scatter3D
  for (let si = 0; si < scatter3D.length; si++) {
    const s = scatter3D[si];
    const color = typeof s.color === "string" ? s.color : seriesHex(si);
    const r = (s.symbolSize ?? 8) / 2;

    for (const item of s.data ?? []) {
      const v = Array.isArray(item) ? item : (item as any).value;
      if (!Array.isArray(v) || v.length < 3) continue;
      const nx = normalize(Number(v[0]), xRange);
      const ny = normalize(Number(v[1]), yRange);
      const nz = normalize(Number(v[2]), zRange);
      const [px, py] = toPixel(nx, ny, nz);
      group.appendChild(svgEl("circle", { cx: px, cy: py, r, fill: color, opacity: 0.85 }));
    }
  }

  // Draw line3D
  for (let si = 0; si < line3D.length; si++) {
    const s = line3D[si];
    const color = typeof s.color === "string" ? s.color : seriesHex(scatter3D.length + si);
    const lineW = s.lineWidth ?? 2;
    const data = s.data ?? [];
    const projected: string[] = [];

    for (const item of data) {
      const v = Array.isArray(item) ? item : (item as any).value;
      if (!Array.isArray(v) || v.length < 3) continue;
      const nx = normalize(Number(v[0]), xRange);
      const ny = normalize(Number(v[1]), yRange);
      const nz = normalize(Number(v[2]), zRange);
      const [px, py] = toPixel(nx, ny, nz);
      projected.push(`${px.toFixed(1)},${py.toFixed(1)}`);
    }

    if (projected.length >= 2) {
      const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      polyline.setAttribute("points", projected.join(" "));
      polyline.setAttribute("fill", "none");
      polyline.setAttribute("stroke", color);
      polyline.setAttribute("stroke-width", String(lineW));
      polyline.setAttribute("opacity", "0.9");
      group.appendChild(polyline);
    }
  }

  // Draw bar3D as projected thin rectangles
  for (let si = 0; si < bar3D.length; si++) {
    const s = bar3D[si];
    const color = typeof s.color === "string" ? s.color : seriesHex(scatter3D.length + line3D.length + si);
    const barSize = s.barSize ?? 0.05;

    for (const item of s.data ?? []) {
      const v = Array.isArray(item) ? item : (item as any).value;
      if (!Array.isArray(v) || v.length < 3) continue;
      const nx = normalize(Number(v[0]), xRange);
      const ny = normalize(Number(v[1]), yRange);
      const nz = normalize(Number(v[2]), zRange);

      // Draw bar as line from floor (ny = -0.5) to actual y position
      const [topX, topY] = toPixel(nx, ny, nz);
      const [botX, botY] = toPixel(nx, -0.5, nz);

      const line = svgEl("line", {
        x1: botX, y1: botY, x2: topX, y2: topY,
        stroke: color, "stroke-width": Math.max(2, barSize * scale * 0.3),
        "stroke-linecap": "round", opacity: 0.85,
      });
      group.appendChild(line);
    }
  }

  svg.appendChild(group);
}
