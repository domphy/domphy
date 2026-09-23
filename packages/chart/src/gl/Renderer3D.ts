import type {
  Axis3DOption,
  Bar3DSeriesOption,
  Grid3DOption,
  ItemStyleOption,
  LabelOption,
  Line3DSeriesOption,
  LineStyleOption,
  Scatter3DSeriesOption,
  Surface3DSeriesOption,
} from "../types.js";
import type { ColorResolver } from "./color.js";
import { cssColor, hexToRgba } from "./color.js";

function svgEl(
  tag: string,
  attrs: Record<string, string | number>,
): SVGElement {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

// Opacity defaults — INHERITED: the literals this renderer painted before
// itemStyle/lineStyle were readable (Renderer3D.ts, circle/bar/surface 0.85 and
// line3D 0.9). Kept so a chart that sets no style renders exactly as before.
const DEFAULT_MARK_OPACITY = 0.85;
const DEFAULT_LINE_OPACITY = 0.9;

// INHERITED from ECharts' documented label defaults: `label.distance` = 5,
// `label.fontSize` = 12.
const DEFAULT_LABEL_DISTANCE = 5;
const DEFAULT_LABEL_FONT_SIZE = 12;

// Lambert shading — INHERITED from ECharts-GL's documented light defaults:
// `grid3D.light.main.intensity` = 1, `.alpha` = 40, `.beta` = 40, and
// `grid3D.light.ambient.intensity` = 0.2.
const LIGHT_ALPHA_DEGREES = 40;
const LIGHT_BETA_DEGREES = 40;
const AMBIENT_INTENSITY = 0.2;

// DERIVED from those two angles, in box space (x right, y up, z away from the
// viewer — see project3D, where a larger z is farther):
//   L = (-sin(beta) * cos(alpha), sin(alpha), -cos(beta) * cos(alpha))
// which is upper-front-left, and unit length by construction.
const LIGHT_DIRECTION: [number, number, number] = [
  -Math.sin((LIGHT_BETA_DEGREES * Math.PI) / 180) *
    Math.cos((LIGHT_ALPHA_DEGREES * Math.PI) / 180),
  Math.sin((LIGHT_ALPHA_DEGREES * Math.PI) / 180),
  -Math.cos((LIGHT_BETA_DEGREES * Math.PI) / 180) *
    Math.cos((LIGHT_ALPHA_DEGREES * Math.PI) / 180),
];

// DERIVED: shade = ambient + (1 - ambient) * max(0, dot(normal, light)), so the
// factor spans [AMBIENT_INTENSITY, 1] — an unlit face is dimmed, never black.
function lambertShade(normal: [number, number, number]): number {
  const length = Math.hypot(normal[0], normal[1], normal[2]);
  if (length === 0) return 1;
  const diffuse = Math.max(
    0,
    (normal[0] * LIGHT_DIRECTION[0] +
      normal[1] * LIGHT_DIRECTION[1] +
      normal[2] * LIGHT_DIRECTION[2]) /
      length,
  );
  return AMBIENT_INTENSITY + (1 - AMBIENT_INTENSITY) * diffuse;
}

// Multiplies an "rgb(…)" / "#hex" color by a scalar. Returns null for a color
// that carries no channels here (a var(--…) theme reference only resolves at
// paint time) — callers fall back to a CSS brightness filter for those.
function shadeCssColor(color: string, factor: number): string | null {
  let channels: number[] | null = null;
  if (color.startsWith("#")) {
    channels = hexToRgba(color)
      .slice(0, 3)
      .map((channel) => channel * 255);
  } else if (color.startsWith("rgb")) {
    const inner = color.slice(color.indexOf("(") + 1, color.lastIndexOf(")"));
    const parts = inner.split(",").map((part) => Number(part.trim()));
    if (parts.length >= 3) channels = parts.slice(0, 3);
  }
  if (!channels || channels.some((channel) => Number.isNaN(channel))) {
    return null;
  }
  const scaled = channels.map((channel) =>
    Math.round(Math.min(255, Math.max(0, channel * factor))),
  );
  return `rgb(${scaled[0]},${scaled[1]},${scaled[2]})`;
}

interface ShadedPaint {
  color: string;
  filter?: string;
}

// `color` is the CSS paint string (var(--…) ref, hex, or rgb()) already
// resolved for SVG fill/stroke — `shadeCssColor` multiplies it directly when
// it carries literal channels. A var(--…) reference has none, so `resolver`
// (built per render pass from the chart's computed style, see engine.ts)
// looks up the SAME underlying color as concrete floats and multiplies those
// instead — a real shaded color, not a CSS filter approximation.
function shadedPaint(
  color: string,
  factor: number,
  resolver?: ColorResolver,
  colorSrc?: unknown,
  fallbackIndex?: number,
): ShadedPaint {
  const shaded = shadeCssColor(color, factor);
  if (shaded) return { color: shaded };
  if (resolver && fallbackIndex !== undefined) {
    const [r, g, b] = resolver.rgba(colorSrc, fallbackIndex);
    const scale = (channel: number) =>
      Math.round(Math.min(255, Math.max(0, channel * 255 * factor)));
    return { color: `rgb(${scale(r)},${scale(g)},${scale(b)})` };
  }
  // No resolver available (e.g. a detached/SSR render) — fall back to a CSS
  // brightness filter so the shading still shows up visually.
  return { color, filter: `brightness(${factor.toFixed(3)})` };
}

interface LabelContext {
  name: string;
  value: number[];
  dataIndex: number;
  seriesIndex: number;
  seriesName: string;
}

// ECharts template semantics: `{b}` is the data item name, `{c}` its value —
// here the [x, y, z] triple. A function formatter receives the full params.
function formatLabel(label: LabelOption, context: LabelContext): string {
  const formatter = label.formatter;
  if (typeof formatter === "function") {
    return String(
      formatter({
        name: context.name,
        value: context.value,
        dataIndex: context.dataIndex,
        seriesIndex: context.seriesIndex,
        seriesName: context.seriesName,
      }),
    );
  }
  const valueText = context.value.join(", ");
  if (typeof formatter === "string") {
    return formatter
      .replace(/\{b\}/g, context.name)
      .replace(/\{c\}/g, valueText);
  }
  return valueText;
}

function appendLabel(
  group: SVGElement,
  label: LabelOption,
  context: LabelContext,
  px: number,
  py: number,
): void {
  const distance = label.distance ?? DEFAULT_LABEL_DISTANCE;
  const position = label.position ?? "top";
  let x = px;
  let y = py;
  let anchor = "middle";
  let baseline = "auto";
  if (position === "right") {
    x = px + distance;
    anchor = "start";
    baseline = "middle";
  } else if (position === "inside") {
    baseline = "middle";
  } else {
    y = py - distance;
  }

  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.textContent = formatLabel(label, context);
  text.setAttribute("x", String(x));
  text.setAttribute("y", String(y));
  text.setAttribute(
    "font-size",
    String(label.fontSize ?? DEFAULT_LABEL_FONT_SIZE),
  );
  text.setAttribute(
    "fill",
    cssColor(label.color ?? "neutral", context.seriesIndex),
  );
  text.setAttribute("text-anchor", anchor);
  text.setAttribute("dominant-baseline", baseline);
  text.setAttribute("pointer-events", "none");
  group.appendChild(text);
}

// SVG dash pattern for a LineStyleOption.type. DERIVED from the stroke width so
// the pattern scales with the line: dashed = 4 widths drawn / 2 skipped,
// dotted = 1 width drawn / 2 skipped. An explicit array passes through.
function dashArray(
  type: LineStyleOption["type"],
  width: number,
): string | null {
  if (Array.isArray(type)) return type.join(",");
  if (type === "dashed") return `${4 * width},${2 * width}`;
  if (type === "dotted") return `${width},${2 * width}`;
  return null;
}

// ECharts precedence: itemStyle/lineStyle.color > series.color > palette.
function resolveSeriesColor(
  styleColor: unknown,
  seriesColor: unknown,
  fallbackIndex: number,
): string {
  return cssColor(styleColor ?? seriesColor, fallbackIndex);
}

// Data item name for `{b}` — ECharts falls back to the item index.
function itemName(item: unknown, index: number): string {
  const name = (item as { name?: unknown } | null)?.name;
  return typeof name === "string" ? name : String(index);
}

// Perspective projection: 3D → 2D
// x, y, z are in normalized box space [-0.5, 0.5]
function project3D(
  x: number,
  y: number,
  z: number,
  alpha: number,
  beta: number,
  dist: number,
): [number, number] {
  const ar = (alpha * Math.PI) / 180;
  const br = (beta * Math.PI) / 180;

  // Rotate around Y axis by beta
  const x1 = x * Math.cos(br) + z * Math.sin(br);
  const y1 =
    -x * Math.sin(ar) * Math.sin(br) +
    y * Math.cos(ar) +
    z * Math.sin(ar) * Math.cos(br);
  const z1 =
    -x * Math.cos(ar) * Math.sin(br) -
    y * Math.sin(ar) +
    z * Math.cos(ar) * Math.cos(br);

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
  const min =
    axis.min !== undefined ? Number(axis.min) : Math.min(...values, 0);
  const max =
    axis.max !== undefined ? Number(axis.max) : Math.max(...values, 1);
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

function computeBoxRect(
  grid: Grid3DOption,
  width: number,
  height: number,
): BoxRect {
  const left =
    typeof grid.left === "number"
      ? grid.left
      : typeof grid.left === "string"
        ? parseFloat(grid.left)
        : width * 0.1;
  const top =
    typeof grid.top === "number"
      ? grid.top
      : typeof grid.top === "string"
        ? parseFloat(grid.top)
        : height * 0.1;
  const right =
    typeof grid.right === "number"
      ? grid.right
      : typeof grid.right === "string"
        ? parseFloat(grid.right)
        : width * 0.1;
  const bottom =
    typeof grid.bottom === "number"
      ? grid.bottom
      : typeof grid.bottom === "string"
        ? parseFloat(grid.bottom)
        : height * 0.1;

  const drawW = width - left - right;
  const drawH = height - top - bottom;

  return {
    centerX: left + drawW / 2,
    centerY: top + drawH / 2,
    scale: Math.min(drawW, drawH) * 0.45,
  };
}

// Map a 0-1 value to a hex color along a blue→green→red gradient
function zToColor(t: number): string {
  const r = Math.round(Math.max(0, t * 2 - 1) * 200 + 55);
  const g = Math.round(Math.max(0, 1 - Math.abs(t * 2 - 1)) * 200 + 55);
  const b = Math.round(Math.max(0, 1 - t * 2) * 200 + 55);
  return `rgb(${r},${g},${b})`;
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
  surface3D: Surface3DSeriesOption[],
  width: number,
  height: number,
  colorResolver: ColorResolver,
): void {
  const old = svg.querySelector(".dc-3d");
  if (old) old.remove();

  const allSeries = [...scatter3D, ...bar3D, ...line3D, ...surface3D];
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

  const xRange = computeAxisRange(
    xAxis,
    allPoints.map((p) => p[0]),
  );
  const yRange = computeAxisRange(
    yAxis,
    allPoints.map((p) => p[1]),
  );
  const zRange = computeAxisRange(
    zAxis,
    allPoints.map((p) => p[2]),
  );

  function toPixel(nx: number, ny: number, nz: number): [number, number] {
    const [px, py] = project3D(nx, ny, nz, alpha, beta, dist);
    return [centerX + px * scale, centerY + py * scale];
  }

  // Draw box wireframe
  const corners: [number, number, number][] = [
    [-0.5, -0.5, -0.5],
    [0.5, -0.5, -0.5],
    [0.5, 0.5, -0.5],
    [-0.5, 0.5, -0.5],
    [-0.5, -0.5, 0.5],
    [0.5, -0.5, 0.5],
    [0.5, 0.5, 0.5],
    [-0.5, 0.5, 0.5],
  ];
  const edges: [number, number][] = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0], // bottom face
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4], // top face
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7], // verticals
  ];

  const wireGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  wireGroup.setAttribute("opacity", "0.3");
  for (const [a, b] of edges) {
    const [ax, ay] = toPixel(...corners[a]);
    const [bx, by] = toPixel(...corners[b]);
    wireGroup.appendChild(
      svgEl("line", {
        x1: ax,
        y1: ay,
        x2: bx,
        y2: by,
        stroke: "#888",
        "stroke-width": 1,
      }),
    );
  }
  group.appendChild(wireGroup);

  // Draw axis labels
  const tickCount = 5;
  const axisLabelsGroup = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "g",
  );

  for (let i = 0; i <= tickCount; i++) {
    const t = i / tickCount;

    // X axis ticks along bottom-front edge
    const xVal = xRange.min + t * (xRange.max - xRange.min);
    const [xx, xy] = toPixel(t - 0.5, -0.5, 0.5);
    const xLabel = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text",
    );
    xLabel.textContent = xAxis.axisLabel?.formatter
      ? String(xAxis.axisLabel.formatter(xVal))
      : xVal.toFixed(1);
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
    const yLabel = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text",
    );
    yLabel.textContent = yAxis.axisLabel?.formatter
      ? String(yAxis.axisLabel.formatter(yVal))
      : yVal.toFixed(1);
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
    const zLabel = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text",
    );
    zLabel.textContent = zAxis.axisLabel?.formatter
      ? String(zAxis.axisLabel.formatter(zVal))
      : zVal.toFixed(1);
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
    const label = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text",
    );
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
    const label = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text",
    );
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
    const label = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text",
    );
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
    const itemStyle: ItemStyleOption = s.itemStyle ?? {};
    const color = resolveSeriesColor(itemStyle.color, s.color, si);
    const opacity = itemStyle.opacity ?? DEFAULT_MARK_OPACITY;
    // ECharts' itemStyle.borderWidth defaults to 0 — a border shows only when a
    // width is given; its color falls back to the item color.
    const borderWidth = itemStyle.borderWidth ?? 0;
    const borderColor = resolveSeriesColor(itemStyle.borderColor, s.color, si);
    const r = (s.symbolSize ?? 8) / 2;
    const data = s.data ?? [];

    for (let index = 0; index < data.length; index++) {
      const item = data[index];
      const v = Array.isArray(item) ? item : (item as any).value;
      if (!Array.isArray(v) || v.length < 3) continue;
      const nx = normalize(Number(v[0]), xRange);
      const ny = normalize(Number(v[1]), yRange);
      const nz = normalize(Number(v[2]), zRange);
      const [px, py] = toPixel(nx, ny, nz);
      const attrs: Record<string, string | number> = {
        cx: px,
        cy: py,
        r,
        fill: color,
        opacity,
      };
      if (borderWidth > 0) {
        attrs.stroke = borderColor;
        attrs["stroke-width"] = borderWidth;
      }
      group.appendChild(svgEl("circle", attrs));

      if (s.label?.show) {
        appendLabel(
          group,
          s.label,
          {
            name: itemName(item, index),
            value: [Number(v[0]), Number(v[1]), Number(v[2])],
            dataIndex: index,
            seriesIndex: si,
            seriesName: s.name ?? "",
          },
          px,
          py - r,
        );
      }
    }
  }

  // Draw line3D
  for (let si = 0; si < line3D.length; si++) {
    const s = line3D[si];
    const lineStyle: LineStyleOption = s.lineStyle ?? {};
    const color = resolveSeriesColor(
      lineStyle.color,
      s.color,
      scatter3D.length + si,
    );
    const lineW = lineStyle.width ?? s.lineWidth ?? 2;
    const opacity = lineStyle.opacity ?? DEFAULT_LINE_OPACITY;
    const dash = dashArray(lineStyle.type, lineW);
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
      const polyline = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "polyline",
      );
      polyline.setAttribute("points", projected.join(" "));
      polyline.setAttribute("fill", "none");
      polyline.setAttribute("stroke", color);
      polyline.setAttribute("stroke-width", String(lineW));
      polyline.setAttribute("opacity", String(opacity));
      if (dash) polyline.setAttribute("stroke-dasharray", dash);
      group.appendChild(polyline);
    }
  }

  // Draw bar3D as projected thin rectangles
  for (let si = 0; si < bar3D.length; si++) {
    const s = bar3D[si];
    const fallbackIndex = scatter3D.length + line3D.length + si;
    const itemStyle: ItemStyleOption = s.itemStyle ?? {};
    let color = resolveSeriesColor(itemStyle.color, s.color, fallbackIndex);
    let colorFilter: string | undefined;
    const opacity = itemStyle.opacity ?? DEFAULT_MARK_OPACITY;
    const borderWidth = itemStyle.borderWidth ?? 0;
    const borderColor = resolveSeriesColor(
      itemStyle.borderColor,
      s.color,
      fallbackIndex,
    );
    const barSize = s.barSize ?? 0.05;
    const barWidth = Math.max(2, barSize * scale * 0.3);

    if (s.shading === "lambert") {
      // The stroke stands for the bar's camera-facing vertical side face, so
      // its normal is horizontal and points at the viewer. DERIVED from the
      // projection: depth grows with z1 = -x·cos(a)·sin(b) - y·sin(a) +
      // z·cos(a)·cos(b), so toward-viewer = -grad(z1), with the vertical
      // component dropped because the face is vertical.
      const alphaRadians = (alpha * Math.PI) / 180;
      const betaRadians = (beta * Math.PI) / 180;
      const shade = lambertShade([
        Math.cos(alphaRadians) * Math.sin(betaRadians),
        0,
        -Math.cos(alphaRadians) * Math.cos(betaRadians),
      ]);
      const paint = shadedPaint(
        color,
        shade,
        colorResolver,
        itemStyle.color ?? s.color,
        fallbackIndex,
      );
      color = paint.color;
      colorFilter = paint.filter;
    }

    const data = s.data ?? [];
    for (let index = 0; index < data.length; index++) {
      const item = data[index];
      const v = Array.isArray(item) ? item : (item as any).value;
      if (!Array.isArray(v) || v.length < 3) continue;
      const nx = normalize(Number(v[0]), xRange);
      const ny = normalize(Number(v[1]), yRange);
      const nz = normalize(Number(v[2]), zRange);

      // Draw bar as line from floor (ny = -0.5) to actual y position
      const [topX, topY] = toPixel(nx, ny, nz);
      const [botX, botY] = toPixel(nx, -0.5, nz);

      if (borderWidth > 0) {
        // A stroked bar has no fill/stroke pair, so the border is a wider line
        // painted underneath: the fill width plus one border width per side.
        group.appendChild(
          svgEl("line", {
            x1: botX,
            y1: botY,
            x2: topX,
            y2: topY,
            stroke: borderColor,
            "stroke-width": barWidth + 2 * borderWidth,
            "stroke-linecap": "round",
            opacity,
          }),
        );
      }

      const line = svgEl("line", {
        x1: botX,
        y1: botY,
        x2: topX,
        y2: topY,
        stroke: color,
        "stroke-width": barWidth,
        "stroke-linecap": "round",
        opacity,
      });
      if (colorFilter) line.setAttribute("style", `filter: ${colorFilter}`);
      group.appendChild(line);

      if (s.label?.show) {
        appendLabel(
          group,
          s.label,
          {
            name: itemName(item, index),
            value: [Number(v[0]), Number(v[1]), Number(v[2])],
            dataIndex: index,
            seriesIndex: si,
            seriesName: s.name ?? "",
          },
          topX,
          topY - barWidth / 2,
        );
      }
    }
  }

  // Draw surface3D as colored quad mesh using perspective projection
  for (let si = 0; si < surface3D.length; si++) {
    const s = surface3D[si];
    const rawData = s.data ?? [];
    const points: [number, number, number][] = rawData.map((item) => {
      const v = Array.isArray(item) ? item : (item as any).value;
      return [Number(v[0]), Number(v[1]), Number(v[2])];
    });

    if (points.length === 0) continue;

    const shapeW = s.shapeW ?? Math.round(Math.sqrt(points.length));
    const shapeH = s.shapeH ?? Math.ceil(points.length / shapeW);

    // Compute z range for color mapping
    const zValues = points.map((p) => p[2]);
    const zMin = Math.min(...zValues);
    const zMax = Math.max(...zValues, zMin + 1);

    const showWireframe = s.wireframe?.show !== false;
    const itemStyle: ItemStyleOption = s.itemStyle ?? {};
    const fillOpacity = itemStyle.opacity ?? DEFAULT_MARK_OPACITY;
    // A flat itemStyle.color replaces the z-gradient entirely; without one the
    // gradient stays (so `undefined` must NOT fall through to the palette).
    const fallbackIndex = scatter3D.length + line3D.length + bar3D.length + si;
    const flatFill =
      itemStyle.color == null ? null : cssColor(itemStyle.color, fallbackIndex);

    // Draw quads back-to-front (painter's algorithm — approximate, good enough for SVG)
    const quads: {
      avgZ: number;
      path: string;
      fill: string;
      filter?: string;
    }[] = [];

    for (let row = 0; row < shapeH - 1; row++) {
      for (let col = 0; col < shapeW - 1; col++) {
        const i00 = row * shapeW + col;
        const i10 = row * shapeW + col + 1;
        const i01 = (row + 1) * shapeW + col;
        const i11 = (row + 1) * shapeW + col + 1;

        if (
          i00 >= points.length ||
          i10 >= points.length ||
          i01 >= points.length ||
          i11 >= points.length
        )
          continue;

        const p00 = points[i00];
        const p10 = points[i10];
        const p01 = points[i01];
        const p11 = points[i11];

        const [x00, y00] = toPixel(
          normalize(p00[0], xRange),
          normalize(p00[2], zRange),
          normalize(p00[1], yRange),
        );
        const [x10, y10] = toPixel(
          normalize(p10[0], xRange),
          normalize(p10[2], zRange),
          normalize(p10[1], yRange),
        );
        const [x11, y11] = toPixel(
          normalize(p11[0], xRange),
          normalize(p11[2], zRange),
          normalize(p11[1], yRange),
        );
        const [x01, y01] = toPixel(
          normalize(p01[0], xRange),
          normalize(p01[2], zRange),
          normalize(p01[1], yRange),
        );

        const avgZ = (p00[2] + p10[2] + p11[2] + p01[2]) / 4;
        const t = (avgZ - zMin) / (zMax - zMin);
        let fill = flatFill ?? zToColor(t);
        let filter: string | undefined;

        if (s.shading === "lambert") {
          // Geometric normal of the quad, in the same normalized box space the
          // projection consumes (x → box x, data z → box y = up, data y → box
          // z). Normalized, not raw data units, because a raw-unit normal is
          // dominated by whichever axis happens to have the widest range.
          const boxPoint = (
            p: [number, number, number],
          ): [number, number, number] => [
            normalize(p[0], xRange),
            normalize(p[2], zRange),
            normalize(p[1], yRange),
          ];
          const origin = boxPoint(p00);
          const edgeA = boxPoint(p10);
          const edgeB = boxPoint(p01);
          const ax = edgeA[0] - origin[0];
          const ay = edgeA[1] - origin[1];
          const az = edgeA[2] - origin[2];
          const bx = edgeB[0] - origin[0];
          const by = edgeB[1] - origin[1];
          const bz = edgeB[2] - origin[2];
          let normal: [number, number, number] = [
            ay * bz - az * by,
            az * bx - ax * bz,
            ax * by - ay * bx,
          ];
          // The surface is a height field, so the outward normal is the one
          // with a non-negative up component; the cross-product sign otherwise
          // just follows the row/column order of the data.
          if (normal[1] < 0) normal = [-normal[0], -normal[1], -normal[2]];
          const paint = shadedPaint(
            fill,
            lambertShade(normal),
            colorResolver,
            itemStyle.color,
            fallbackIndex,
          );
          fill = paint.color;
          filter = paint.filter;
        }

        const path = `M${x00.toFixed(1)},${y00.toFixed(1)} L${x10.toFixed(1)},${y10.toFixed(1)} L${x11.toFixed(1)},${y11.toFixed(1)} L${x01.toFixed(1)},${y01.toFixed(1)} Z`;
        quads.push({ avgZ, path, fill, filter });
      }
    }

    // Sort by avgZ descending (paint far quads first)
    quads.sort((a, b) => b.avgZ - a.avgZ);

    const surfaceGroup = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g",
    );
    for (const q of quads) {
      const pathEl = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      pathEl.setAttribute("d", q.path);
      pathEl.setAttribute("fill", q.fill);
      pathEl.setAttribute("fill-opacity", String(fillOpacity));
      if (q.filter) pathEl.setAttribute("style", `filter: ${q.filter}`);
      if (showWireframe) {
        pathEl.setAttribute("stroke", "rgba(0,0,0,0.15)");
        pathEl.setAttribute("stroke-width", "0.5");
      } else {
        pathEl.setAttribute("stroke", "none");
      }
      surfaceGroup.appendChild(pathEl);
    }
    group.appendChild(surfaceGroup);
  }

  svg.appendChild(group);
}
