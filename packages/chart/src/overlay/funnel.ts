import { themeColor } from "@domphy/theme";
import { seriesColor } from "../gl/color.js";
import { type ItemStateResolver, NO_ITEM_STATES } from "../itemStates.js";
import type { FunnelSeriesOption } from "../types.js";

function svgEl(
  tag: string,
  attrs: Record<string, string | number>,
): SVGElement {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

export interface FunnelTrapezoidLayout {
  seriesIndex: number;
  /** Index into the series' own (unsorted) `data` array. */
  dataIndex: number;
  item: { name?: string; value?: number };
  color: string;
  topLeft: number;
  topRight: number;
  botLeft: number;
  botRight: number;
  itemTop: number;
  itemBottom: number;
}

// Geometry only — one trapezoid per data item, widest-to-narrowest (ECharts
// sorts a funnel by value by default). renderFunnel() below draws from this;
// hitTestFunnelItem() in engine.ts point-in-trapezoid tests against the SAME
// output, so a hover/click can never land on a shape the renderer did not
// actually paint.
export function computeFunnelLayout(
  series: FunnelSeriesOption[],
  width: number,
  height: number,
  hiddenSeries: ReadonlySet<string>,
): FunnelTrapezoidLayout[] {
  const result: FunnelTrapezoidLayout[] = [];
  for (let si = 0; si < series.length; si++) {
    const s = series[si];
    if (s.name && hiddenSeries.has(s.name)) continue;

    const rawData = (s.data ?? []) as Array<{ name?: string; value?: number }>;
    const sorted = [...rawData].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    if (sorted.length === 0) continue;

    const maxVal = sorted[0].value ?? 1;
    const left = typeof s.left === "number" ? s.left : width * 0.15;
    const top = typeof s.top === "number" ? s.top : height * 0.1;
    const funnelW = typeof s.width === "number" ? s.width : width * 0.7;
    const funnelH = typeof s.height === "number" ? s.height : height * 0.8;
    const itemH = funnelH / sorted.length;
    const gap = s.gap ?? 1;

    sorted.forEach((item, index) => {
      const pct = (item.value ?? 0) / maxVal;
      const originalIndex = rawData.findIndex((d) => d.name === item.name);
      const color =
        (s.color as string[] | undefined)?.[index] ??
        seriesColor(originalIndex);

      const topW =
        index === 0
          ? funnelW
          : ((sorted[index - 1].value ?? 0) / maxVal) * funnelW;
      const bottomW = pct * funnelW;

      const itemTop = top + index * itemH + gap / 2;
      const itemBottom = itemTop + itemH - gap;

      const topLeft = left + (funnelW - topW) / 2;
      const topRight = topLeft + topW;
      const botLeft = left + (funnelW - bottomW) / 2;
      const botRight = botLeft + bottomW;

      result.push({
        seriesIndex: si,
        dataIndex: originalIndex,
        item,
        color,
        topLeft,
        topRight,
        botLeft,
        botRight,
        itemTop,
        itemBottom,
      });
    });
  }
  return result;
}

/**
 * Point-in-trapezoid test for a funnel slice: the shape's left/right edges
 * are straight lines between the top and bottom widths, so at a given y the
 * slice's horizontal extent is a linear interpolation between them.
 */
export function pointInFunnelTrapezoid(
  px: number,
  py: number,
  slice: FunnelTrapezoidLayout,
): boolean {
  if (py < slice.itemTop || py > slice.itemBottom) return false;
  const span = slice.itemBottom - slice.itemTop || 1;
  const t = (py - slice.itemTop) / span;
  const left = slice.topLeft + (slice.botLeft - slice.topLeft) * t;
  const right = slice.topRight + (slice.botRight - slice.topRight) * t;
  return px >= left && px <= right;
}

export function renderFunnel(
  svg: SVGSVGElement,
  series: FunnelSeriesOption[],
  width: number,
  height: number,
  hiddenSeries: Set<string>,
  states: ItemStateResolver = NO_ITEM_STATES,
): void {
  const old = svg.querySelector(".dc-funnel");
  if (old) old.remove();
  if (series.length === 0) return;

  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "dc-funnel");
  const _labelColor = themeColor(null, "shift-9", "neutral");

  // Geometry (sort-by-value, trapezoid banding) lives in one place —
  // computeFunnelLayout() above — shared with engine.ts's
  // hitTestFunnelItem(), so a hover/click can never land on a different
  // trapezoid than what is actually drawn here.
  const slices = computeFunnelLayout(series, width, height, hiddenSeries);
  for (const slice of slices) {
    const s = series[slice.seriesIndex];
    // No ColorResolver in this SVG-only overlay (color is a static
    // seriesColor() hex) — only the state's opacity delta applies, same
    // scope boundary as overlay/boxplot.ts.
    const stateOpacity = states(s, slice.dataIndex).opacity;

    const points = `${slice.topLeft},${slice.itemTop} ${slice.topRight},${slice.itemTop} ${slice.botRight},${slice.itemBottom} ${slice.botLeft},${slice.itemBottom}`;
    const poly = svgEl("polygon", {
      points,
      fill: slice.color,
      opacity: 0.85 * stateOpacity,
      stroke: "none",
    });
    group.appendChild(poly);

    // Label in center
    if (s.label?.show !== false) {
      const midY = (slice.itemTop + slice.itemBottom) / 2;
      const funnelW = typeof s.width === "number" ? s.width : width * 0.7;
      const left = typeof s.left === "number" ? s.left : width * 0.15;
      const midX = left + funnelW / 2;
      const label = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      label.textContent = slice.item.name ?? "";
      label.setAttribute("x", String(midX));
      label.setAttribute("y", String(midY));
      label.setAttribute("fill", "#fff");
      label.setAttribute("font-size", "12");
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("dominant-baseline", "middle");
      label.setAttribute("pointer-events", "none");
      group.appendChild(label);
    }
  }

  svg.appendChild(group);
}
