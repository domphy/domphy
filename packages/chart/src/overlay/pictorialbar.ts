import { themeColor } from "@domphy/theme";
import { barSizingOptions, resolveBarLayout } from "../coord/barLayout.js";
import { cssColor } from "../gl/color.js";
import type {
  ItemStyleOption,
  LabelOption,
  LabelParams,
  PictorialBarSeriesOption,
} from "../types.js";

function svgEl(
  tag: string,
  attrs: Record<string, string | number>,
): SVGElement {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

// Paint attributes (SVG names) resolved from itemStyle for one symbol.
type SymbolPaint = Record<string, string | number>;

// Resolves the itemStyle chain into SVG paint attributes. ECharts precedence:
// data item itemStyle.color > series itemStyle.color > series color > palette.
function resolvePaint(
  seriesStyle: ItemStyleOption | undefined,
  itemStyle: ItemStyleOption | undefined,
  seriesColorOption: unknown,
  paletteIndex: number,
): SymbolPaint {
  const paint: SymbolPaint = {
    fill: cssColor(
      itemStyle?.color ?? seriesStyle?.color ?? seriesColorOption,
      paletteIndex,
    ),
  };
  const opacity = itemStyle?.opacity ?? seriesStyle?.opacity;
  if (opacity !== undefined) paint.opacity = opacity;
  const borderWidth = itemStyle?.borderWidth ?? seriesStyle?.borderWidth;
  const borderColor = itemStyle?.borderColor ?? seriesStyle?.borderColor;
  if (borderColor !== undefined) {
    paint.stroke = cssColor(borderColor, paletteIndex);
  }
  if (borderWidth !== undefined) {
    paint["stroke-width"] = borderWidth;
    // A border color is required for a stroke to paint; ECharts defaults the
    // pictorial symbol border to the fill color when only a width is given.
    if (paint.stroke === undefined) paint.stroke = paint.fill;
  }
  return paint;
}

// Resolves a length option: a number is px, a percent string is a fraction of
// `base` (the category band width for bar*Width, the symbol size for
// symbolMargin). Returns undefined for an unset/unparsable value.
function resolveLength(
  value: number | string | undefined,
  base: number,
): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number") return value;
  const percent = parseFloat(value);
  return Number.isFinite(percent) ? (percent / 100) * base : undefined;
}

// Draw a symbol at (cx, cy) with given size and paint
function drawSymbol(
  group: SVGElement,
  symbol: string,
  cx: number,
  cy: number,
  width: number,
  height: number,
  paint: SymbolPaint,
  rotate: number,
  clipRect?: { x: number; y: number; w: number; h: number },
  clipId?: string,
): void {
  const half = Math.min(width, height) / 2;
  let el: SVGElement;

  if (symbol.startsWith("path://")) {
    el = svgEl("path", { d: symbol.slice(7), ...paint });
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute(
      "transform",
      `translate(${cx},${cy}) rotate(${rotate}) scale(${half / 10})`,
    );
    g.appendChild(el);
    if (clipRect && clipId) g.setAttribute("clip-path", `url(#${clipId})`);
    group.appendChild(g);
    return;
  }

  switch (symbol) {
    case "rect":
    case "roundRect":
      el = svgEl("rect", {
        x: cx - width / 2,
        y: cy - height / 2,
        width,
        height,
        ...paint,
        rx: symbol === "roundRect" ? 3 : 0,
      });
      break;
    case "triangle":
      el = svgEl("polygon", {
        points: `${cx},${cy - half} ${cx - half},${cy + half} ${cx + half},${cy + half}`,
        ...paint,
      });
      break;
    case "diamond":
      el = svgEl("polygon", {
        points: `${cx},${cy - half} ${cx + half},${cy} ${cx},${cy + half} ${cx - half},${cy}`,
        ...paint,
      });
      break;
    case "arrow":
      el = svgEl("polygon", {
        points: `${cx},${cy - half} ${cx + half * 0.5},${cy} ${cx + half * 0.25},${cy} ${cx + half * 0.25},${cy + half} ${cx - half * 0.25},${cy + half} ${cx - half * 0.25},${cy} ${cx - half * 0.5},${cy}`,
        ...paint,
      });
      break;
    case "pin":
      el = svgEl("path", {
        d: `M${cx},${cy + half} C${cx - half},${cy} ${cx - half},${cy - half} ${cx},${cy - half} C${cx + half},${cy - half} ${cx + half},${cy} ${cx},${cy + half}`,
        ...paint,
      });
      break;
    default: // circle
      el = svgEl("circle", { cx, cy, r: half, ...paint });
  }

  if (rotate !== 0) {
    el.setAttribute("transform", `rotate(${rotate},${cx},${cy})`);
  }
  if (clipRect && clipId) {
    el.setAttribute("clip-path", `url(#${clipId})`);
  }
  group.appendChild(el);
}

// ECharts label template placeholders: {a} series name, {b} item name,
// {c} value. A function formatter receives the params object instead.
function formatLabel(
  formatter: LabelOption["formatter"],
  params: LabelParams,
): string {
  if (typeof formatter === "function") return formatter(params);
  if (typeof formatter === "string") {
    return formatter
      .replace(/\{a\}/g, params.seriesName)
      .replace(/\{b\}/g, params.name)
      .replace(/\{c\}/g, String(params.value));
  }
  return String(params.value);
}

// ECharts `label.distance` default is 5 (px between the symbol edge and the
// label box).
const LABEL_DISTANCE_DEFAULT = 5;
// ECharts `label.fontSize` default is 12.
const LABEL_FONT_SIZE_DEFAULT = 12;

const LABEL_ANCHOR_BY_ALIGN = {
  left: "start",
  center: "middle",
  right: "end",
} as const;

function drawLabel(
  group: SVGElement,
  label: LabelOption,
  params: LabelParams,
  geometry: { centerX: number; top: number; bottom: number; width: number },
): void {
  const distance = label.distance ?? LABEL_DISTANCE_DEFAULT;
  const position = label.position ?? "top";
  const middleY = (geometry.top + geometry.bottom) / 2;

  let x = geometry.centerX;
  let y: number;
  let baseline = "auto";
  let anchor = "middle";

  switch (position) {
    case "bottom":
      y = geometry.bottom + distance;
      baseline = "hanging";
      break;
    case "inside":
      y = middleY;
      baseline = "middle";
      break;
    case "left":
      x = geometry.centerX - geometry.width / 2 - distance;
      y = middleY;
      baseline = "middle";
      anchor = "end";
      break;
    case "right":
      x = geometry.centerX + geometry.width / 2 + distance;
      y = middleY;
      baseline = "middle";
      anchor = "start";
      break;
    default: // "top"
      y = geometry.top - distance;
  }
  if (label.align) anchor = LABEL_ANCHOR_BY_ALIGN[label.align];

  const el = svgEl("text", {
    x,
    y,
    fill: label.color
      ? cssColor(label.color, params.seriesIndex)
      : themeColor(null, "shift-10", "neutral"),
    "font-size": label.fontSize ?? LABEL_FONT_SIZE_DEFAULT,
    "text-anchor": anchor,
    "dominant-baseline": baseline,
    "pointer-events": "none",
  });
  if (label.fontWeight !== undefined) {
    el.setAttribute("font-weight", String(label.fontWeight));
  }
  el.textContent = formatLabel(label.formatter, params);
  group.appendChild(el);
}

export function renderPictorialBar(
  svg: SVGSVGElement,
  series: PictorialBarSeriesOption[],
  xScales: any[],
  yScales: any[],
  hiddenSeries: Set<string>,
): void {
  const old = svg.querySelector(".dc-pictorial-bar");
  if (old) old.remove();
  if (series.length === 0) return;

  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "dc-pictorial-bar");

  // Defs for clip paths
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  group.appendChild(defs);

  let clipCounter = 0;

  // barGap/barCategoryGap are band-level, like `bar`: pictorialBar series
  // sharing an x/y axis pair share one category band and get their own
  // column in it (ECharts' calBarWidthAndOffset), instead of every series
  // drawing its symbol centered on the same category and fully overlapping.
  const visibleSeries = series.filter(
    (s) => !(s.name && hiddenSeries.has(s.name)),
  );
  const axisGroups = new Map<string, PictorialBarSeriesOption[]>();
  for (const s of visibleSeries) {
    const key = `${(s as any).xAxisIndex ?? 0}\0${(s as any).yAxisIndex ?? 0}`;
    if (!axisGroups.has(key)) axisGroups.set(key, []);
    axisGroups.get(key)!.push(s);
  }
  // Shared bar layout per axis pair — barWidth/barMaxWidth/barMinWidth/
  // barGap/barCategoryGap are band-level options (barSizingOptions: first
  // series in the group that declares one wins), same house convention as
  // BarRenderer/coord/barLayout.ts.
  const axisGroupLayouts = new Map<
    string,
    ReturnType<typeof resolveBarLayout>
  >();
  for (const [key, groupSeries] of axisGroups) {
    const xAxisIndex = Number(key.split("\0")[0]);
    const bandwidth = xScales[xAxisIndex]?.bandwidth?.() ?? 20;
    axisGroupLayouts.set(
      key,
      resolveBarLayout({
        bandwidth,
        seriesCount: Math.max(1, groupSeries.length),
        ...barSizingOptions(groupSeries),
      }),
    );
  }

  for (let si = 0; si < series.length; si++) {
    const s = series[si];
    if (s.name && hiddenSeries.has(s.name)) continue;

    const xScale = xScales[(s as any).xAxisIndex ?? 0];
    const yScale = yScales[(s as any).yAxisIndex ?? 0];
    if (!xScale || !yScale) continue;

    const groupKey = `${(s as any).xAxisIndex ?? 0}\0${(s as any).yAxisIndex ?? 0}`;
    const groupSeries = axisGroups.get(groupKey)!;
    const columnIndex = groupSeries.indexOf(s);
    const groupLayout = axisGroupLayouts.get(groupKey)!;
    // Left-edge offset from resolveBarLayout, converted to a center offset
    // (pictorialBar symbols are centered, not left-anchored like a bar rect).
    const columnCenterOffset =
      groupLayout.offsetFor(columnIndex) + groupLayout.barSize / 2;

    const symbol = s.symbol ?? "circle";
    const rotate = s.symbolRotate ?? 0;
    const repeat = s.symbolRepeat ?? false;
    const clip = s.symbolClip ?? false;
    const [offsetX, offsetY] = s.symbolOffset ?? [0, 0];
    const bandwidth = xScale.bandwidth?.() ?? 20;
    const colorBy = s.colorBy ?? "series";

    // Width resolution, ECharts order: an explicit barWidth (resolved into
    // groupLayout.barSize above, shared by the whole axis group) wins,
    // otherwise this series' own symbolSize, otherwise the shared layout's
    // solved column width (barGap/barCategoryGap already applied).
    const rawSize = s.symbolSize;
    const [sizeW, sizeH] = Array.isArray(rawSize)
      ? (rawSize as [number, number])
      : rawSize !== undefined
        ? [rawSize as number, rawSize as number]
        : [undefined, undefined];
    const symW =
      resolveLength(s.barWidth, bandwidth) ?? sizeW ?? groupLayout.barSize;
    const symH = sizeH ?? symW;

    // ECharts `symbolMargin` default is 0; a percent string is relative to the
    // symbol size along the repeat axis.
    const symbolMargin = resolveLength(s.symbolMargin, symH) ?? 0;

    const yZero = yScale.map(0);

    const data = s.data ?? [];
    data.forEach((item, index) => {
      const value =
        typeof item === "number" ? item : ((item as any)?.value ?? 0);
      const itemStyle =
        typeof item === "number" ? undefined : (item as any)?.itemStyle;
      const paint = resolvePaint(
        s.itemStyle,
        itemStyle,
        s.color,
        colorBy === "data" ? index : si,
      );
      const xCenter = xScale.map(index);
      const yValue = yScale.map(value);
      const barH = Math.abs(yZero - yValue);
      const isPositive = yValue <= yZero;

      const baseX =
        xCenter +
        columnCenterOffset +
        (typeof offsetX === "string"
          ? (parseFloat(offsetX) / 100) * bandwidth
          : offsetX);
      const _baseY = isPositive ? yZero : yValue;

      if (repeat) {
        // Repeat symbols stacked to fill bar height
        const step = symH + symbolMargin;
        const count =
          repeat === true
            ? // A non-positive step (zero-size symbol, symbolMargin now
              // defaulting to ECharts' 0) divides to Infinity; one symbol is
              // the only finite answer.
              step > 0
              ? Math.max(1, Math.floor(barH / step))
              : 1
            : typeof repeat === "number"
              ? repeat
              : 1;

        for (let ri = 0; ri < count; ri++) {
          const cyPos = isPositive
            ? yZero - symH / 2 - ri * step
            : yValue + symH / 2 + ri * step;

          const isLast = ri === count - 1 && clip;
          let clipRectData:
            | { x: number; y: number; w: number; h: number }
            | undefined;
          let clipId: string | undefined;

          if (isLast && clip) {
            // Clip the last symbol to the remaining bar height
            const used = ri * step;
            const remaining = barH - used;
            clipId = `dc-pbar-clip-${clipCounter++}`;
            clipRectData = {
              x: baseX - symW / 2,
              y: isPositive ? yZero - barH : yValue,
              w: symW,
              h: remaining,
            };
            const clipPath = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "clipPath",
            );
            clipPath.setAttribute("id", clipId);
            clipPath.appendChild(svgEl("rect", clipRectData));
            defs.appendChild(clipPath);
          }

          drawSymbol(
            group,
            symbol,
            baseX,
            cyPos +
              (typeof offsetY === "string" ? parseFloat(offsetY) : offsetY),
            symW,
            symH,
            paint,
            rotate,
            clipRectData,
            clipId,
          );
        }
      } else {
        // Single symbol scaled to bar height
        const scaledH = barH;
        const cyPos = isPositive ? yZero - scaledH / 2 : yValue + scaledH / 2;
        drawSymbol(
          group,
          symbol,
          baseX,
          cyPos + (typeof offsetY === "string" ? parseFloat(offsetY) : offsetY),
          symW,
          scaledH || symH,
          paint,
          rotate,
        );
      }

      if (s.label?.show) {
        const name =
          typeof item === "number"
            ? String(index)
            : ((item as any)?.name ?? String(index));
        drawLabel(
          group,
          s.label,
          {
            name,
            value,
            dataIndex: index,
            seriesIndex: si,
            seriesName: s.name ?? "",
          },
          {
            centerX: baseX,
            top: Math.min(yValue, yZero),
            bottom: Math.max(yValue, yZero),
            width: symW,
          },
        );
      }
    });
  }

  svg.appendChild(group);
}
