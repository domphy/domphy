import { themeColorToken } from "@domphy/theme";
import { seriesHex } from "../gl/color.js";
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

// ECharts boxplot data format: [min, Q1, median, Q3, max]
export function renderBoxplot(
  svg: SVGSVGElement,
  series: BoxplotSeriesOption[],
  xScales: AnyScale[],
  yScales: AnyScale[],
  hiddenSeries: Set<string>,
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

    const color = seriesHex(si);
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
      const xCenter = xScale.map(index);
      const yMin = yScale.map(vMin);
      const yQ1 = yScale.map(vQ1);
      const yMedian = yScale.map(vMedian);
      const yQ3 = yScale.map(vQ3);
      const yMax = yScale.map(vMax);

      const xLeft = xCenter - boxW / 2;
      const xRight = xCenter + boxW / 2;

      // Upper whisker: median → max
      group.appendChild(
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
      group.appendChild(
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
        group.appendChild(
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
      group.appendChild(
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
      group.appendChild(
        svgEl("line", {
          x1: xLeft,
          y1: yMedian,
          x2: xRight,
          y2: yMedian,
          stroke: color,
          "stroke-width": 2,
        }),
      );
    });
  }

  svg.appendChild(group);
}
