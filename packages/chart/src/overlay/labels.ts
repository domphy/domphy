import { themeColorToken } from "@domphy/theme";
import type {
  SeriesOption, BarSeriesOption, LineSeriesOption, PieSeriesOption,
  ScatterSeriesOption,
} from "../types.js";
import type { AnyScale } from "../scale/index.js";
import { seriesHex } from "../gl/color.js";

function svgNS(tag: string): Element {
  return document.createElementNS("http://www.w3.org/2000/svg", tag);
}

function text(content: string, x: number, y: number, attrs: Record<string, string | number>): Element {
  const el = svgNS("text");
  el.textContent = content;
  el.setAttribute("x", String(x));
  el.setAttribute("y", String(y));
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

function formatValue(v: number): string {
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(1)}k`;
  if (!Number.isFinite(v)) return "";
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

// ─── Bar Labels ───────────────────────────────────────────────────────────────

function renderBarLabels(
  group: Element,
  series: BarSeriesOption[],
  xScales: AnyScale[],
  yScales: AnyScale[],
  _seriesOffset: number,
  hiddenSeries: Set<string>,
): void {
  const labelColor = themeColorToken(null, "shift-10", "neutral");
  const labelColorInside = "#fff";
  const gap = 2;

  // Build group layout info (mirrors BarRenderer grouping)
  const grouped = series.filter((s) => !s.stack);
  const groupCount = Math.max(1, grouped.length);

  for (let si = 0; si < series.length; si++) {
    const s = series[si];
    if (!s.label?.show) continue;
    if (s.name && hiddenSeries.has(s.name)) continue;
    const xScale = xScales[s.xAxisIndex ?? 0];
    const yScale = yScales[s.yAxisIndex ?? 0];
    if (!xScale || !yScale) continue;

    const position = s.label?.position ?? "top";
    const bandwidth = xScale.bandwidth();
    const groupBarWidth = groupCount > 1
      ? (bandwidth * 0.85 - (groupCount - 1) * gap) / groupCount
      : bandwidth * 0.65;
    const totalGroupWidth = groupCount * groupBarWidth + (groupCount - 1) * gap;
    const groupIndex = grouped.indexOf(s);
    const data = s.data ?? [];
    const baselineY = yScale.map(0);

    data.forEach((item, index) => {
      const rawValue = typeof item === "number" ? item
        : Array.isArray(item) ? (item[1] as number)
        : typeof (item as any)?.value === "number" ? (item as any).value : null;
      if (rawValue === null) return;

      const xArg = typeof item === "number" ? index : Array.isArray(item) ? item[0] : index;
      const xCenter = xScale.map(xArg as number);
      const yTop = yScale.map(rawValue);
      if (!Number.isFinite(xCenter) || !Number.isFinite(yTop)) return;

      // For grouped bars, label above the specific bar; stacked bars use category center
      const lx = groupIndex >= 0
        ? xCenter - totalGroupWidth / 2 + groupIndex * (groupBarWidth + gap) + groupBarWidth / 2
        : xCenter;

      const barHeight = Math.abs(baselineY - yTop);
      const labelStr = s.label?.formatter
        ? (typeof s.label.formatter === "function" ? s.label.formatter({ value: rawValue, name: String(xArg), dataIndex: index, seriesIndex: si, seriesName: s.name ?? "" }) : String(s.label.formatter))
        : formatValue(rawValue);

      let ly: number;
      const anchor = "middle";
      let color = labelColor;

      if (position === "inside" || (position === "top" && barHeight < 20)) {
        if (barHeight < 14 && position === "inside") return;
        ly = yTop + (baselineY - yTop) / 2;
        color = labelColorInside;
      } else if (position === "top") {
        ly = yTop - 4;
      } else if (position === "bottom") {
        ly = baselineY + 14;
      } else {
        ly = yTop - 4;
      }

      group.appendChild(text(labelStr, lx, ly, {
        fill: color,
        "font-size": s.label?.fontSize ?? 11,
        "text-anchor": anchor,
        "dominant-baseline": position === "inside" ? "middle" : "auto",
        "pointer-events": "none",
      }));
    });
  }
}

// ─── Line / Area Point Labels ─────────────────────────────────────────────────

function renderLineLabels(
  group: Element,
  series: LineSeriesOption[],
  xScales: AnyScale[],
  yScales: AnyScale[],
  hiddenSeries: Set<string>,
): void {
  const labelColor = themeColorToken(null, "shift-9", "neutral");

  for (const s of series) {
    if (!s.label?.show) continue;
    if (s.name && hiddenSeries.has(s.name)) continue;
    const xScale = xScales[s.xAxisIndex ?? 0];
    const yScale = yScales[s.yAxisIndex ?? 0];
    if (!xScale || !yScale) continue;

    (s.data ?? []).forEach((item, index) => {
      let xVal: any;
      let yVal: number | null = null;

      if (typeof item === "number") { xVal = index; yVal = item; }
      else if (Array.isArray(item)) { xVal = item[0]; yVal = item[1] as number; }
      else if (item && typeof item === "object") {
        const raw = (item as any).value;
        if (Array.isArray(raw)) { xVal = raw[0]; yVal = raw[1]; }
        else { xVal = index; yVal = raw; }
      }
      if (yVal === null || !Number.isFinite(yVal)) return;

      const px = xScale.map(xVal);
      const py = yScale.map(yVal);
      const label = s.label?.formatter
        ? (typeof s.label.formatter === "function" ? s.label.formatter({ value: yVal, name: String(xVal), dataIndex: index, seriesIndex: 0, seriesName: s.name ?? "" }) : String(s.label.formatter))
        : formatValue(yVal);

      group.appendChild(text(label, px, py - 6, {
        fill: labelColor,
        "font-size": s.label?.fontSize ?? 11,
        "text-anchor": "middle",
        "pointer-events": "none",
      }));
    });
  }
}

// ─── Pie Labels ───────────────────────────────────────────────────────────────

function renderPieLabels(
  group: Element,
  series: PieSeriesOption[],
  width: number,
  height: number,
  hiddenSeries: Set<string>,
): void {
  const minSize = Math.min(width, height);
  const labelColor = themeColorToken(null, "shift-9", "neutral");
  const PI2 = Math.PI * 2;

  for (const s of series) {
    if (!s.label?.show && s.label?.show !== undefined) continue;
    if (s.name && hiddenSeries.has(s.name)) continue;

    const center = s.center ?? ["50%", "50%"];
    const cx = typeof center[0] === "number" ? center[0] : (parseFloat(center[0]) / 100) * width;
    const cy = typeof center[1] === "number" ? center[1] : (parseFloat(center[1]) / 100) * height;
    const halfMin = minSize / 2;
    let outerR = halfMin * 0.7;
    if (s.radius) {
      const r = s.radius;
      if (Array.isArray(r)) outerR = typeof r[1] === "number" ? r[1] : (parseFloat(r[1]) / 100) * halfMin;
      else outerR = typeof r === "number" ? r : (parseFloat(r) / 100) * halfMin;
    }

    const data = (s.data ?? []) as Array<{ value?: number; name?: string }>;
    const total = data.reduce((sum, item) => sum + (item.value ?? 0), 0) || 1;
    let currentAngle = -Math.PI / 2;

    data.forEach((item, index) => {
      const fraction = (item.value ?? 0) / total;
      const sweepAngle = fraction * PI2;
      const midAngle = currentAngle + sweepAngle / 2;
      currentAngle += sweepAngle;

      if (fraction < 0.02) return; // skip tiny slices

      const labelR = outerR * 1.25;
      const lx = cx + labelR * Math.cos(midAngle);
      const ly = cy + labelR * Math.sin(midAngle);
      const anchor = lx > cx ? "start" : "end";

      // Leader line
      const lineStart = { x: cx + outerR * 0.9 * Math.cos(midAngle), y: cy + outerR * 0.9 * Math.sin(midAngle) };
      const lineMid = { x: cx + outerR * 1.1 * Math.cos(midAngle), y: cy + outerR * 1.1 * Math.sin(midAngle) };
      const lineEnd = { x: lx + (lx > cx ? 8 : -8), y: ly };

      const polyline = svgNS("polyline");
      polyline.setAttribute("points", `${lineStart.x},${lineStart.y} ${lineMid.x},${lineMid.y} ${lineEnd.x},${lineEnd.y}`);
      polyline.setAttribute("fill", "none");
      polyline.setAttribute("stroke", labelColor);
      polyline.setAttribute("stroke-width", "1");
      polyline.setAttribute("opacity", "0.6");
      polyline.setAttribute("pointer-events", "none");
      group.appendChild(polyline);

      // Label: name + percentage
      const pct = `${(fraction * 100).toFixed(1)}%`;
      const name = item.name ?? String(index);
      const label = s.label?.formatter
        ? (typeof s.label.formatter === "function"
          ? s.label.formatter({ name, value: item.value ?? 0, percent: fraction * 100, dataIndex: index, seriesIndex: 0, seriesName: s.name ?? "" })
          : String(s.label.formatter).replace("{b}", name).replace("{c}", String(item.value)).replace("{d}", pct))
        : `${name} ${pct}`;

      group.appendChild(text(label, lineEnd.x + (lx > cx ? 3 : -3), ly, {
        fill: labelColor,
        "font-size": s.label?.fontSize ?? 11,
        "text-anchor": anchor,
        "dominant-baseline": "middle",
        "pointer-events": "none",
      }));
    });
  }
}

// ─── Scatter Labels ───────────────────────────────────────────────────────────

function renderScatterLabels(
  group: Element,
  series: ScatterSeriesOption[],
  xScales: AnyScale[],
  yScales: AnyScale[],
  hiddenSeries: Set<string>,
): void {
  const labelColor = themeColorToken(null, "shift-9", "neutral");
  for (const s of series) {
    if (!s.label?.show) continue;
    if (s.name && hiddenSeries.has(s.name)) continue;
    const xScale = xScales[s.xAxisIndex ?? 0];
    const yScale = yScales[s.yAxisIndex ?? 0];
    if (!xScale || !yScale) continue;

    (s.data ?? []).forEach((item, index) => {
      let xVal: any;
      let yVal: number;
      if (Array.isArray(item)) { xVal = item[0]; yVal = item[1] as number; }
      else if (typeof item === "number") { xVal = index; yVal = item; }
      else { return; }
      const px = xScale.map(xVal);
      const py = yScale.map(yVal);
      const label = s.label?.formatter
        ? (typeof s.label.formatter === "function" ? s.label.formatter({ value: yVal, name: String(xVal), dataIndex: index, seriesIndex: 0, seriesName: s.name ?? "" }) : String(s.label.formatter))
        : formatValue(yVal);
      group.appendChild(text(label, px, py - 8, {
        fill: labelColor, "font-size": 10, "text-anchor": "middle", "pointer-events": "none",
      }));
    });
  }
}

// ─── Public: render all series labels ─────────────────────────────────────────

export interface SeriesLabelOptions {
  series: SeriesOption[];
  xScales: AnyScale[];
  yScales: AnyScale[];
  width: number;
  height: number;
  hiddenSeries: Set<string>;
}

export function renderSeriesSymbols(svg: SVGSVGElement, opts: SeriesLabelOptions, seriesOffset = 0): void {
  const old = svg.querySelector(".dc-symbols");
  if (old) old.remove();

  const lines = opts.series.filter((s): s is LineSeriesOption => s.type === "line");
  // Auto-hide symbols for dense series (>30 points) unless explicitly enabled
  const visible = lines.filter((s) => {
    if (s.name && opts.hiddenSeries.has(s.name)) return false;
    if (s.showSymbol === false) return false;
    if (s.showSymbol === true) return true;
    return (s.data ?? []).length <= 30;
  });
  if (visible.length === 0) return;

  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "dc-symbols");

  visible.forEach((s, si) => {
    const xScale = opts.xScales[s.xAxisIndex ?? 0];
    const yScale = opts.yScales[s.yAxisIndex ?? 0];
    if (!xScale || !yScale) return;

    const color = s.color ? String(s.color) : seriesHex(seriesOffset + lines.indexOf(s));
    const r = typeof s.symbolSize === "number" ? s.symbolSize / 2 : 4;

    (s.data ?? []).forEach((item, index) => {
      let xVal: any;
      let yVal: number | null = null;
      if (typeof item === "number") { xVal = index; yVal = item; }
      else if (Array.isArray(item)) { xVal = item[0]; yVal = item[1] as number; }
      else if (item && typeof item === "object") {
        const raw = (item as any).value;
        if (Array.isArray(raw)) { xVal = raw[0]; yVal = raw[1]; }
        else { xVal = index; yVal = raw; }
      }
      if (yVal === null || !Number.isFinite(yVal)) return;
      const px = xScale.map(xVal);
      const py = yScale.map(yVal);
      if (!Number.isFinite(px) || !Number.isFinite(py)) return;

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", String(px));
      circle.setAttribute("cy", String(py));
      circle.setAttribute("r", String(r));
      circle.setAttribute("fill", "#fff");
      circle.setAttribute("stroke", color);
      circle.setAttribute("stroke-width", "2");
      circle.setAttribute("pointer-events", "none");
      group.appendChild(circle);
    });
  });

  svg.appendChild(group);
}

export function renderSeriesLabels(svg: SVGSVGElement, opts: SeriesLabelOptions): void {
  const old = svg.querySelector(".dc-labels");
  if (old) old.remove();

  const hasLabels = opts.series.some((s) => (s as any).label?.show);
  if (!hasLabels) return;

  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "dc-labels");

  const bars = opts.series.filter((s): s is BarSeriesOption => s.type === "bar");
  const lines = opts.series.filter((s): s is LineSeriesOption => s.type === "line");
  const pies = opts.series.filter((s): s is PieSeriesOption => s.type === "pie");
  const scatters = opts.series.filter((s): s is ScatterSeriesOption => s.type === "scatter");

  renderBarLabels(group, bars, opts.xScales, opts.yScales, 0, opts.hiddenSeries);
  renderLineLabels(group, lines, opts.xScales, opts.yScales, opts.hiddenSeries);
  renderPieLabels(group, pies, opts.width, opts.height, opts.hiddenSeries);
  renderScatterLabels(group, scatters, opts.xScales, opts.yScales, opts.hiddenSeries);

  svg.appendChild(group);
}
