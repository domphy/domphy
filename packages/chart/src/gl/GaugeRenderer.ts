import type { GaugeSeriesOption } from "../types.js";
import { seriesRgba, familyRgba } from "./color.js";
import { themeColorToken } from "@domphy/theme";

export class GaugeRenderer {
  constructor(_device: unknown) {}

  renderToSvg(svg: SVGSVGElement, series: GaugeSeriesOption[], width: number, height: number): void {
    const old = svg.querySelector(".dc-gauge");
    if (old) old.remove();
    if (series.length === 0) return;
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", "dc-gauge");

    for (let si = 0; si < series.length; si++) {
      const s = series[si];
      const minSize = Math.min(width, height);
      const cx = typeof s.center?.[0] === "number" ? s.center[0] : (parseFloat(String(s.center?.[0] ?? "50%")) / 100) * width;
      const cy = typeof s.center?.[1] === "number" ? s.center[1] : (parseFloat(String(s.center?.[1] ?? "50%")) / 100) * height;
      const radius = typeof s.radius === "number" ? s.radius : (parseFloat(String(s.radius ?? "75%")) / 100) * minSize;
      const innerRadius = radius - (s.progress?.width ?? 18);

      const minVal = s.min ?? 0;
      const maxVal = s.max ?? 100;
      const startDeg = s.startAngle ?? 225;
      const endDeg = s.endAngle ?? -45;

      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const startRad = toRad(startDeg);
      const endRad = toRad(endDeg);
      const totalAngle = endRad - startRad;

      // Track arc
      const trackColor = themeColorToken(null, "shift-2", "neutral");
      const trackPath = describeArc(cx, cy, radius - 1, innerRadius + 1, startRad, endRad);
      const trackEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
      trackEl.setAttribute("d", trackPath);
      trackEl.setAttribute("fill", trackColor);
      group.appendChild(trackEl);

      // Progress arc per data item
      const data = s.data ?? [{ value: 0 }];
      data.forEach((item, di) => {
        const value = typeof item === "object" ? (item as any).value ?? 0 : (item as number);
        const fraction = Math.max(0, Math.min(1, (value - minVal) / (maxVal - minVal)));
        const progressEndRad = startRad + totalAngle * fraction;

        const progressColor = s.color
          ? familyRgba(s.color as any, "shift-9")
          : seriesRgba(si + di);
        const progressHex = `rgba(${progressColor.map((v, i) => i < 3 ? Math.round(v * 255) : v).join(",")})`;

        const progressPath = describeArc(cx, cy, radius - 1, innerRadius + 1, startRad, progressEndRad);
        const progressEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
        progressEl.setAttribute("d", progressPath);
        progressEl.setAttribute("fill", progressHex);
        group.appendChild(progressEl);

        // Value label
        if (s.detail?.show !== false) {
          const labelOffsetY = typeof s.detail?.offsetCenter?.[1] === "number"
            ? cy + s.detail.offsetCenter[1]
            : cy + radius * 0.4;
          const valueText = document.createElementNS("http://www.w3.org/2000/svg", "text");
          valueText.textContent = s.detail?.formatter
            ? (typeof s.detail.formatter === "function" ? s.detail.formatter(value) : String(s.detail.formatter).replace("{value}", String(value)))
            : String(value);
          valueText.setAttribute("x", String(cx));
          valueText.setAttribute("y", String(labelOffsetY));
          valueText.setAttribute("text-anchor", "middle");
          valueText.setAttribute("font-size", String(s.detail?.fontSize ?? 24));
          valueText.setAttribute("font-weight", String(s.detail?.fontWeight ?? "bold"));
          valueText.setAttribute("fill", themeColorToken(null, "shift-11", "neutral"));
          group.appendChild(valueText);
        }

        // Name label
        if (s.title?.show !== false && (item as any).name) {
          const nameOffsetY = typeof s.title?.offsetCenter?.[1] === "number"
            ? cy + s.title.offsetCenter[1]
            : cy - radius * 0.15;
          const nameText = document.createElementNS("http://www.w3.org/2000/svg", "text");
          nameText.textContent = (item as any).name ?? "";
          nameText.setAttribute("x", String(cx));
          nameText.setAttribute("y", String(nameOffsetY));
          nameText.setAttribute("text-anchor", "middle");
          nameText.setAttribute("font-size", "13");
          nameText.setAttribute("fill", themeColorToken(null, "shift-7", "neutral"));
          group.appendChild(nameText);
        }
      });

      // Ticks
      const splitNum = s.splitNumber ?? 10;
      const tickLen = s.splitLine?.length ?? 10;
      const tickColor = themeColorToken(null, "shift-5", "neutral");

      for (let tick = 0; tick <= splitNum; tick++) {
        const fraction = tick / splitNum;
        const tickRad = startRad + totalAngle * fraction;
        const outerX = cx + radius * Math.cos(tickRad);
        const outerY = cy - radius * Math.sin(tickRad);
        const innerX = cx + (radius - tickLen) * Math.cos(tickRad);
        const innerY = cy - (radius - tickLen) * Math.sin(tickRad);
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", String(outerX));
        line.setAttribute("y1", String(outerY));
        line.setAttribute("x2", String(innerX));
        line.setAttribute("y2", String(innerY));
        line.setAttribute("stroke", tickColor);
        line.setAttribute("stroke-width", "2");
        group.appendChild(line);
      }
    }

    svg.appendChild(group);
  }

  destroy(): void {}
}

function describeArc(cx: number, cy: number, outerR: number, innerR: number, startRad: number, endRad: number): string {
  const clampedEnd = startRad === endRad ? endRad + 0.0001 : endRad;
  const isLargeArc = Math.abs(clampedEnd - startRad) > Math.PI ? 1 : 0;
  const sweep = clampedEnd > startRad ? 1 : 0;

  const ox1 = cx + outerR * Math.cos(startRad);
  const oy1 = cy - outerR * Math.sin(startRad);
  const ox2 = cx + outerR * Math.cos(clampedEnd);
  const oy2 = cy - outerR * Math.sin(clampedEnd);
  const ix1 = cx + innerR * Math.cos(clampedEnd);
  const iy1 = cy - innerR * Math.sin(clampedEnd);
  const ix2 = cx + innerR * Math.cos(startRad);
  const iy2 = cy - innerR * Math.sin(startRad);

  return [
    `M${ox1},${oy1}`,
    `A${outerR},${outerR},0,${isLargeArc},${sweep},${ox2},${oy2}`,
    `L${ix1},${iy1}`,
    `A${innerR},${innerR},0,${isLargeArc},${1 - sweep},${ix2},${iy2}`,
    "Z",
  ].join(" ");
}
