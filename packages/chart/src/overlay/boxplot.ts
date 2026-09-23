import { seriesColor } from "../gl/color.js";
import { type ItemStateResolver, NO_ITEM_STATES } from "../itemStates.js";
import type { AnyScale } from "../scale/index.js";
import type { BoxplotSeriesOption } from "../types.js";

function svgEl(
  tag: string,
  attrs: Record<string, string | number>,
): SVGElement {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

export interface BoxplotItemLayout {
  seriesIndex: number;
  dataIndex: number;
  xLeft: number;
  xRight: number;
  /** Whole visual extent (whisker caps to whisker caps), not just the box. */
  yTop: number;
  yBottom: number;
}

// Geometry only — the whole box+whisker bounding extent per datum, the same
// xCenter/boxW math renderBoxplot() below draws from. hitTestBoxplotItem()
// in engine.ts rect-tests against this, so a hover/click can never land on a
// different box than what is actually drawn here.
export function computeBoxplotLayout(
  series: BoxplotSeriesOption[],
  xScales: AnyScale[],
  yScales: AnyScale[],
  hiddenSeries: ReadonlySet<string>,
): BoxplotItemLayout[] {
  const result: BoxplotItemLayout[] = [];
  for (let si = 0; si < series.length; si++) {
    const s = series[si];
    if (s.name && hiddenSeries.has(s.name)) continue;
    const xScale = xScales[s.xAxisIndex ?? 0];
    const yScale = yScales[s.yAxisIndex ?? 0];
    if (!xScale || !yScale) continue;
    const bandwidth = xScale.bandwidth();
    const boxW = Math.max(4, (bandwidth ?? 30) * 0.6);
    const data = s.data ?? [];
    data.forEach((item, index) => {
      const raw = Array.isArray(item)
        ? item
        : Array.isArray((item as any)?.value)
          ? (item as any).value
          : null;
      if (!raw || raw.length < 5) return;
      const [vMin, , , , vMax] = raw as number[];
      const xCenter = xScale.map(index);
      const yMin = yScale.map(vMin);
      const yMax = yScale.map(vMax);
      result.push({
        seriesIndex: si,
        dataIndex: index,
        xLeft: xCenter - boxW / 2,
        xRight: xCenter + boxW / 2,
        yTop: Math.min(yMin, yMax),
        yBottom: Math.max(yMin, yMax),
      });
    });
  }
  return result;
}

// ECharts boxplot data format: [min, Q1, median, Q3, max]
export function renderBoxplot(
  svg: SVGSVGElement,
  series: BoxplotSeriesOption[],
  xScales: AnyScale[],
  yScales: AnyScale[],
  hiddenSeries: Set<string>,
  states: ItemStateResolver = NO_ITEM_STATES,
): void {
  const old = svg.querySelector(".dc-boxplot");
  if (old) old.remove();
  if (series.length === 0) return;

  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "dc-boxplot");

  for (let si = 0; si < series.length; si++) {
    const s = series[si];
    if (s.name && hiddenSeries.has(s.name)) continue;
    const xScale = xScales[s.xAxisIndex ?? 0];
    const yScale = yScales[s.yAxisIndex ?? 0];
    if (!xScale || !yScale) continue;

    const color = seriesColor(si);
    const bandwidth = xScale.bandwidth();
    const boxW = Math.max(4, (bandwidth ?? 30) * 0.6);

    const data = s.data ?? [];
    data.forEach((item, index) => {
      const raw = Array.isArray(item)
        ? item
        : Array.isArray((item as any)?.value)
          ? (item as any).value
          : null;
      if (!raw || raw.length < 5) return;

      const [vMin, vQ1, vMedian, vQ3, vMax] = raw as number[];
      // This overlay has no ColorResolver (its stroke is a static
      // seriesColor() hex, not a var(--…) theme reference), so only the
      // state's opacity delta applies here — lift and an explicit
      // itemStyle.color override (applyItemState's other two effects) need a
      // resolver and are out of scope for this SVG-only renderer.
      const itemGroup = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "g",
      );
      itemGroup.setAttribute("opacity", String(states(s, index).opacity));
      const xCenter = xScale.map(index);
      const yMin = yScale.map(vMin);
      const yQ1 = yScale.map(vQ1);
      const yMedian = yScale.map(vMedian);
      const yQ3 = yScale.map(vQ3);
      const yMax = yScale.map(vMax);

      const xLeft = xCenter - boxW / 2;
      const xRight = xCenter + boxW / 2;

      // Upper whisker: median → max
      itemGroup.appendChild(
        svgEl("line", {
          x1: xCenter,
          y1: yQ3,
          x2: xCenter,
          y2: yMax,
          stroke: color,
          "stroke-width": 1.5,
          "stroke-dasharray": "3,2",
        }),
      );
      // Lower whisker: min → Q1
      itemGroup.appendChild(
        svgEl("line", {
          x1: xCenter,
          y1: yQ1,
          x2: xCenter,
          y2: yMin,
          stroke: color,
          "stroke-width": 1.5,
          "stroke-dasharray": "3,2",
        }),
      );
      // Whisker caps
      for (const capY of [yMax, yMin]) {
        itemGroup.appendChild(
          svgEl("line", {
            x1: xLeft + boxW * 0.1,
            y1: capY,
            x2: xRight - boxW * 0.1,
            y2: capY,
            stroke: color,
            "stroke-width": 1.5,
          }),
        );
      }
      // Box (Q1–Q3)
      const boxTop = Math.min(yQ1, yQ3);
      const boxH = Math.abs(yQ3 - yQ1);
      itemGroup.appendChild(
        svgEl("rect", {
          x: xLeft,
          y: boxTop,
          width: boxW,
          height: Math.max(1, boxH),
          fill: color,
          opacity: 0.25,
          stroke: color,
          "stroke-width": 1.5,
        }),
      );
      // Median line
      itemGroup.appendChild(
        svgEl("line", {
          x1: xLeft,
          y1: yMedian,
          x2: xRight,
          y2: yMedian,
          stroke: color,
          "stroke-width": 2,
        }),
      );
      group.appendChild(itemGroup);
    });
  }

  svg.appendChild(group);
}
