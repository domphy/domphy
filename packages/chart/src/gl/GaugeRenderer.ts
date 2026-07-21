import { themeColorToken } from "@domphy/theme";
import type { GaugeSeriesOption } from "../types.js";
import { familyRgba, seriesRgba } from "./color.js";

export class GaugeRenderer {
  constructor(_device: unknown) {}

  renderToSvg(
    svg: SVGSVGElement,
    series: GaugeSeriesOption[],
    width: number,
    height: number,
  ): void {
    const old = svg.querySelector(".dc-gauge");
    if (old) old.remove();
    if (series.length === 0 || width <= 0 || height <= 0) return;
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", "dc-gauge");

    for (let si = 0; si < series.length; si++) {
      const s = series[si];
      const minSize = Math.min(width, height);
      const cx =
        typeof s.center?.[0] === "number"
          ? s.center[0]
          : (parseFloat(String(s.center?.[0] ?? "50%")) / 100) * width;
      const cy =
        typeof s.center?.[1] === "number"
          ? s.center[1]
          : (parseFloat(String(s.center?.[1] ?? "50%")) / 100) * height;
      const radius =
        typeof s.radius === "number"
          ? s.radius
          : (parseFloat(String(s.radius ?? "75%")) / 100) * (minSize / 2);
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
      const trackPath = describeArc(
        cx,
        cy,
        radius - 1,
        innerRadius + 1,
        startRad,
        endRad,
      );
      const trackEl = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      trackEl.setAttribute("d", trackPath);
      trackEl.setAttribute("fill", trackColor);
      group.appendChild(trackEl);

      // Progress arc per data item
      const data = s.data ?? [{ value: 0 }];
      data.forEach((item, di) => {
        const value =
          typeof item === "object"
            ? ((item as any).value ?? 0)
            : (item as number);
        const fraction = Math.max(
          0,
          Math.min(1, (value - minVal) / (maxVal - minVal)),
        );
        const progressEndRad = startRad + totalAngle * fraction;

        const progressColor = s.color
          ? familyRgba(s.color as any, "shift-9")
          : seriesRgba(si + di);
        const progressHex = `rgba(${progressColor.map((v, i) => (i < 3 ? Math.round(v * 255) : v)).join(",")})`;

        const progressPath = describeArc(
          cx,
          cy,
          radius - 1,
          innerRadius + 1,
          startRad,
          progressEndRad,
        );
        const progressEl = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path",
        );
        progressEl.setAttribute("d", progressPath);
        progressEl.setAttribute("fill", progressHex);
        group.appendChild(progressEl);

        // Value label
        if (s.detail?.show !== false) {
          const labelOffsetY =
            typeof s.detail?.offsetCenter?.[1] === "number"
              ? cy + s.detail.offsetCenter[1]
              : cy + radius * 0.4;
          const valueText = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "text",
          );
          valueText.textContent = s.detail?.formatter
            ? typeof s.detail.formatter === "function"
              ? s.detail.formatter(value)
              : String(s.detail.formatter).replace("{value}", String(value))
            : String(value);
          valueText.setAttribute("x", String(cx));
          valueText.setAttribute("y", String(labelOffsetY));
          valueText.setAttribute("text-anchor", "middle");
          valueText.setAttribute("font-size", String(s.detail?.fontSize ?? 24));
          valueText.setAttribute(
            "font-weight",
            String(s.detail?.fontWeight ?? "bold"),
          );
          valueText.setAttribute(
            "fill",
            themeColorToken(null, "shift-11", "neutral"),
          );
          group.appendChild(valueText);
        }

        // Name label
        if (s.title?.show !== false && (item as any).name) {
          const nameOffsetY =
            typeof s.title?.offsetCenter?.[1] === "number"
              ? cy + s.title.offsetCenter[1]
              : cy - radius * 0.15;
          const nameText = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "text",
          );
          nameText.textContent = (item as any).name ?? "";
          nameText.setAttribute("x", String(cx));
          nameText.setAttribute("y", String(nameOffsetY));
          nameText.setAttribute("text-anchor", "middle");
          nameText.setAttribute("font-size", "13");
          nameText.setAttribute(
            "fill",
            themeColorToken(null, "shift-7", "neutral"),
          );
          group.appendChild(nameText);
        }
      });

      // Ticks + labels
      const splitNum = s.splitNumber ?? 10;
      const majorLen = s.splitLine?.length ?? 10;
      const minorLen = s.axisTick?.length ?? 5;
      const minorCount = s.axisTick?.splitNumber ?? 5;
      const tickColor = themeColorToken(null, "shift-5", "neutral");
      const tickLabelColor = themeColorToken(null, "shift-8", "neutral");

      for (let tick = 0; tick <= splitNum; tick++) {
        const fraction = tick / splitNum;
        const tickRad = startRad + totalAngle * fraction;
        const outerX = cx + radius * Math.cos(tickRad);
        const outerY = cy - radius * Math.sin(tickRad);
        const innerX = cx + (radius - majorLen) * Math.cos(tickRad);
        const innerY = cy - (radius - majorLen) * Math.sin(tickRad);
        const line = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "line",
        );
        line.setAttribute("x1", String(outerX));
        line.setAttribute("y1", String(outerY));
        line.setAttribute("x2", String(innerX));
        line.setAttribute("y2", String(innerY));
        line.setAttribute("stroke", tickColor);
        line.setAttribute("stroke-width", "2");
        group.appendChild(line);

        // Minor ticks between major ticks
        if (tick < splitNum) {
          for (let m = 1; m < minorCount; m++) {
            const mFrac = fraction + m / minorCount / splitNum;
            const mRad = startRad + totalAngle * mFrac;
            const mox = cx + radius * Math.cos(mRad);
            const moy = cy - radius * Math.sin(mRad);
            const mix = cx + (radius - minorLen) * Math.cos(mRad);
            const miy = cy - (radius - minorLen) * Math.sin(mRad);
            const ml = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "line",
            );
            ml.setAttribute("x1", String(mox));
            ml.setAttribute("y1", String(moy));
            ml.setAttribute("x2", String(mix));
            ml.setAttribute("y2", String(miy));
            ml.setAttribute("stroke", tickColor);
            ml.setAttribute("stroke-width", "1");
            group.appendChild(ml);
          }
        }

        // Tick label
        if (s.axisLabel?.show !== false) {
          const labelVal = minVal + fraction * (maxVal - minVal);
          const labelR = radius + (s.axisLabel?.distance ?? 15);
          const lx = cx + labelR * Math.cos(tickRad);
          const ly = cy - labelR * Math.sin(tickRad);
          if (!Number.isFinite(lx) || !Number.isFinite(ly)) continue;
          const labelText = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "text",
          );
          labelText.textContent = Number.isInteger(labelVal)
            ? String(labelVal)
            : labelVal.toFixed(1);
          labelText.setAttribute("x", String(lx));
          labelText.setAttribute("y", String(ly));
          labelText.setAttribute("text-anchor", "middle");
          labelText.setAttribute("dominant-baseline", "middle");
          labelText.setAttribute(
            "font-size",
            String(s.axisLabel?.fontSize ?? 11),
          );
          labelText.setAttribute("fill", tickLabelColor);
          group.appendChild(labelText);
        }
      }

      // Needle
      if (s.pointer?.show !== false) {
        const dataItem = (s.data ?? [{ value: 0 }])[0];
        const needleVal =
          typeof dataItem === "object"
            ? ((dataItem as any).value ?? 0)
            : (dataItem as number);
        const needleFraction = Math.max(
          0,
          Math.min(1, (needleVal - minVal) / (maxVal - minVal)),
        );
        const needleRad = startRad + totalAngle * needleFraction;

        const needleLen =
          s.pointer?.length != null
            ? typeof s.pointer.length === "string"
              ? (parseFloat(s.pointer.length) / 100) * radius
              : s.pointer.length
            : radius * 0.8;
        const needleWidth = s.pointer?.width ?? 6;
        const perpRad = needleRad + Math.PI / 2;

        // Needle: triangle from base to tip
        const tipX = cx + needleLen * Math.cos(needleRad);
        const tipY = cy - needleLen * Math.sin(needleRad);
        const base1X = cx + (needleWidth / 2) * Math.cos(perpRad);
        const base1Y = cy - (needleWidth / 2) * Math.sin(perpRad);
        const base2X = cx - (needleWidth / 2) * Math.cos(perpRad);
        const base2Y = cy + (needleWidth / 2) * Math.sin(perpRad);

        const needleRgba = s.color
          ? familyRgba(s.color as any, "shift-9")
          : seriesRgba(si);
        const needleColor =
          (s.pointer as any)?.itemStyle?.color ??
          `rgba(${needleRgba.map((v, i) => (i < 3 ? Math.round(v * 255) : v)).join(",")})`;

        const polygon = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "polygon",
        );
        polygon.setAttribute(
          "points",
          `${tipX},${tipY} ${base1X},${base1Y} ${base2X},${base2Y}`,
        );
        polygon.setAttribute("fill", needleColor);
        group.appendChild(polygon);

        // Center circle
        const pivot = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "circle",
        );
        pivot.setAttribute("cx", String(cx));
        pivot.setAttribute("cy", String(cy));
        pivot.setAttribute("r", "6");
        pivot.setAttribute("fill", needleColor);
        group.appendChild(pivot);
      }
    }

    svg.appendChild(group);
  }

  destroy(): void {}
}

function describeArc(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startRad: number,
  endRad: number,
): string {
  const clampedEnd = startRad === endRad ? endRad + 0.0001 : endRad;
  const isLargeArc = Math.abs(clampedEnd - startRad) > Math.PI ? 1 : 0;
  // The renderer uses cy - r*sin(angle) so standard-math CCW = SVG CW (y-axis flip).
  // Gauge goes startRad→endRad decreasing (CW on screen) → SVG sweep=1 when end < start.
  const sweep = clampedEnd < startRad ? 1 : 0;

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
