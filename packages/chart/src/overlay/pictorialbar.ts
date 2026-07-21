import { seriesHex } from "../gl/color.js";
import type { PictorialBarSeriesOption } from "../types.js";

function svgEl(
  tag: string,
  attrs: Record<string, string | number>,
): SVGElement {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

// Draw a symbol at (cx, cy) with given size and fill
function drawSymbol(
  group: SVGElement,
  symbol: string,
  cx: number,
  cy: number,
  width: number,
  height: number,
  fill: string,
  rotate: number,
  clipRect?: { x: number; y: number; w: number; h: number },
  clipId?: string,
): void {
  const half = Math.min(width, height) / 2;
  let el: SVGElement;

  if (symbol.startsWith("path://")) {
    el = svgEl("path", { d: symbol.slice(7), fill });
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
        fill,
        rx: symbol === "roundRect" ? 3 : 0,
      });
      break;
    case "triangle":
      el = svgEl("polygon", {
        points: `${cx},${cy - half} ${cx - half},${cy + half} ${cx + half},${cy + half}`,
        fill,
      });
      break;
    case "diamond":
      el = svgEl("polygon", {
        points: `${cx},${cy - half} ${cx + half},${cy} ${cx},${cy + half} ${cx - half},${cy}`,
        fill,
      });
      break;
    case "arrow":
      el = svgEl("polygon", {
        points: `${cx},${cy - half} ${cx + half * 0.5},${cy} ${cx + half * 0.25},${cy} ${cx + half * 0.25},${cy + half} ${cx - half * 0.25},${cy + half} ${cx - half * 0.25},${cy} ${cx - half * 0.5},${cy}`,
        fill,
      });
      break;
    case "pin":
      el = svgEl("path", {
        d: `M${cx},${cy + half} C${cx - half},${cy} ${cx - half},${cy - half} ${cx},${cy - half} C${cx + half},${cy - half} ${cx + half},${cy} ${cx},${cy + half}`,
        fill,
      });
      break;
    default: // circle
      el = svgEl("circle", { cx, cy, r: half, fill });
  }

  if (rotate !== 0) {
    el.setAttribute("transform", `rotate(${rotate},${cx},${cy})`);
  }
  if (clipRect && clipId) {
    el.setAttribute("clip-path", `url(#${clipId})`);
  }
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

  for (let si = 0; si < series.length; si++) {
    const s = series[si];
    if (s.name && hiddenSeries.has(s.name)) continue;

    const xScale = xScales[(s as any).xAxisIndex ?? 0];
    const yScale = yScales[(s as any).yAxisIndex ?? 0];
    if (!xScale || !yScale) continue;

    const color = seriesHex(si);
    const symbol = s.symbol ?? "circle";
    const rotate = s.symbolRotate ?? 0;
    const repeat = s.symbolRepeat ?? false;
    const clip = s.symbolClip ?? false;
    const [offsetX, offsetY] = s.symbolOffset ?? [0, 0];
    const bandwidth = xScale.bandwidth?.() ?? 20;

    const rawSize = s.symbolSize ?? Math.min(bandwidth * 0.8, 20);
    const [symW, symH] = Array.isArray(rawSize)
      ? (rawSize as [number, number])
      : [rawSize as number, rawSize as number];

    const yZero = yScale.map(0);

    const data = s.data ?? [];
    data.forEach((item, index) => {
      const value =
        typeof item === "number" ? item : ((item as any)?.value ?? 0);
      const xCenter = xScale.map(index);
      const yValue = yScale.map(value);
      const barH = Math.abs(yZero - yValue);
      const isPositive = yValue <= yZero;

      const baseX =
        xCenter +
        (typeof offsetX === "string"
          ? (parseFloat(offsetX) / 100) * bandwidth
          : offsetX);
      const baseY = isPositive ? yZero : yValue;

      if (repeat) {
        // Repeat symbols stacked to fill bar height
        const gap = 2;
        const step = symH + gap;
        const count =
          repeat === true
            ? Math.max(1, Math.floor(barH / step))
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
            color,
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
          color,
          rotate,
        );
      }
    });
  }

  svg.appendChild(group);
}
