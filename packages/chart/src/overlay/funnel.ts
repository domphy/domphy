import { themeColorToken } from "@domphy/theme";
import { seriesHex } from "../gl/color.js";
import type { FunnelSeriesOption } from "../types.js";

function svgEl(
  tag: string,
  attrs: Record<string, string | number>,
): SVGElement {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

export function renderFunnel(
  svg: SVGSVGElement,
  series: FunnelSeriesOption[],
  width: number,
  height: number,
  hiddenSeries: Set<string>,
): void {
  const old = svg.querySelector(".dc-funnel");
  if (old) old.remove();
  if (series.length === 0) return;

  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "dc-funnel");
  const labelColor = themeColorToken(null, "shift-9", "neutral");

  for (let si = 0; si < series.length; si++) {
    const s = series[si];
    if (s.name && hiddenSeries.has(s.name)) continue;

    const rawData = (s.data ?? []) as Array<{ name?: string; value?: number }>;
    const sorted = [...rawData].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    if (sorted.length === 0) continue;

    const maxVal = sorted[0].value ?? 1;

    // Layout
    const left = typeof s.left === "number" ? s.left : width * 0.15;
    const top = typeof s.top === "number" ? s.top : height * 0.1;
    const funnelW = typeof s.width === "number" ? s.width : width * 0.7;
    const funnelH = typeof s.height === "number" ? s.height : height * 0.8;
    const itemH = funnelH / sorted.length;
    const gap = s.gap ?? 1;

    sorted.forEach((item, index) => {
      const pct = (item.value ?? 0) / maxVal;
      const color =
        (s.color as string[] | undefined)?.[index] ??
        seriesHex(rawData.findIndex((d) => d.name === item.name));

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

      const points = `${topLeft},${itemTop} ${topRight},${itemTop} ${botRight},${itemBottom} ${botLeft},${itemBottom}`;
      const poly = svgEl("polygon", {
        points,
        fill: color,
        opacity: 0.85,
        stroke: "none",
      });
      group.appendChild(poly);

      // Label in center
      if (s.label?.show !== false) {
        const midY = (itemTop + itemBottom) / 2;
        const midX = left + funnelW / 2;
        const label = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "text",
        );
        label.textContent = item.name ?? "";
        label.setAttribute("x", String(midX));
        label.setAttribute("y", String(midY));
        label.setAttribute("fill", "#fff");
        label.setAttribute("font-size", "12");
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("dominant-baseline", "middle");
        label.setAttribute("pointer-events", "none");
        group.appendChild(label);
      }
    });
  }

  svg.appendChild(group);
}
