import { themeColorToken } from "@domphy/theme";
import type { AxisOption, ChartRect } from "../types.js";
import type { AnyScale } from "../scale/index.js";

export interface AxisSvgOptions {
  gridRect: ChartRect;
  xAxes: AxisOption[];
  yAxes: AxisOption[];
  xScales: AnyScale[];
  yScales: AnyScale[];
  width: number;
  height: number;
}

// ─── Colors (no listener = light theme defaults, CSS var reference) ───────────
const colorGrid = () => themeColorToken(null, "shift-2", "neutral");
const colorAxis = () => themeColorToken(null, "shift-4", "neutral");
const colorLabel = () => themeColorToken(null, "shift-8", "neutral");
const colorMinor = () => themeColorToken(null, "shift-1", "neutral");

// ─── SVG element factory helpers ──────────────────────────────────────────────

function svgEl(tag: string, attrs: Record<string, string | number>): SVGElement {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  return el;
}

function svgText(content: string, x: number, y: number, attrs: Record<string, string | number> = {}): SVGTextElement {
  const el = svgEl("text", { x, y, ...attrs }) as SVGTextElement;
  el.textContent = content;
  return el;
}

function svgLine(x1: number, y1: number, x2: number, y2: number, attrs: Record<string, string | number> = {}): SVGLineElement {
  return svgEl("line", { x1, y1, x2, y2, ...attrs }) as SVGLineElement;
}

// ─── Axis rendering ───────────────────────────────────────────────────────────

export function renderAxes(svg: SVGSVGElement, options: AxisSvgOptions): void {
  // Remove any existing axes group
  const old = svg.querySelector(".dc-axes");
  if (old) old.remove();

  const group = svgEl("g", { class: "dc-axes" });

  const { gridRect, xAxes, yAxes, xScales, yScales, width, height } = options;
  const gridColor = colorGrid();
  const axisColor = colorAxis();
  const labelColor = colorLabel();

  // ─── Grid lines & x-axes ─────────────────────────────────────────────────
  xAxes.forEach((axis, index) => {
    if (axis.show === false) return;
    const scale = xScales[index];
    if (!scale) return;
    const isBottom = (axis.position ?? "bottom") === "bottom";
    const axisY = isBottom ? gridRect.y + gridRect.height : gridRect.y;
    const offset = axis.offset ?? 0;
    const finalY = axisY + (isBottom ? offset : -offset);

    // Axis line
    if (axis.axisLine?.show !== false) {
      group.appendChild(svgLine(
        gridRect.x, finalY,
        gridRect.x + gridRect.width, finalY,
        { stroke: axisColor, "stroke-width": axis.axisLine?.lineStyle?.width ?? 1 },
      ));
    }

    // Grid lines (vertical)
    const ticks = scale.ticks(6);

    // Compute label skip interval to avoid crowding on dense ordinal axes
    const estLabelPx = 40;
    const labelInterval = (scale.type === "ordinal" && axis.axisLabel?.interval === undefined)
      ? Math.max(1, Math.ceil(ticks.length * estLabelPx / (gridRect.width || 1)))
      : 1;

    for (let ti = 0; ti < ticks.length; ti++) {
      const tick = ticks[ti];
      const tickX = scale.map(tick as any);
      if (tickX < gridRect.x || tickX > gridRect.x + gridRect.width) continue;

      if (axis.splitLine?.show !== false) {
        group.appendChild(svgLine(
          tickX, gridRect.y,
          tickX, gridRect.y + gridRect.height,
          { stroke: gridColor, "stroke-width": 1, "stroke-dasharray": "none" },
        ));
      }

      if (axis.axisTick?.show !== false) {
        const tickLen = axis.axisTick?.length ?? 5;
        group.appendChild(svgLine(
          tickX, finalY,
          tickX, finalY + (isBottom ? tickLen : -tickLen),
          { stroke: axisColor, "stroke-width": 1 },
        ));
      }

      if (axis.axisLabel?.show !== false && ti % labelInterval === 0) {
        const labelY = finalY + (isBottom ? 18 : -8);
        const label = scale.format(tick as any);
        const textEl = svgText(label, tickX, labelY, {
          fill: labelColor,
          "text-anchor": "middle",
          "font-size": 11,
          "dominant-baseline": isBottom ? "hanging" : "auto",
        });
        if (axis.axisLabel?.rotate) {
          textEl.setAttribute("transform", `rotate(${axis.axisLabel.rotate},${tickX},${labelY})`);
        }
        group.appendChild(textEl);
      }
    }

    // Axis name
    if (axis.name) {
      const nameX = axis.nameLocation === "start" ? gridRect.x
        : axis.nameLocation === "end" ? gridRect.x + gridRect.width
        : gridRect.x + gridRect.width / 2;
      const nameY = finalY + (isBottom ? 36 : -28);
      group.appendChild(svgText(axis.name, nameX, nameY, {
        fill: labelColor,
        "text-anchor": "middle",
        "font-size": 12,
        "font-weight": "600",
      }));
    }
  });

  // ─── Grid lines & y-axes ─────────────────────────────────────────────────
  yAxes.forEach((axis, index) => {
    if (axis.show === false) return;
    const scale = yScales[index];
    if (!scale) return;
    const isLeft = (axis.position ?? "left") === "left";
    const axisX = isLeft ? gridRect.x : gridRect.x + gridRect.width;
    const offset = axis.offset ?? 0;
    const finalX = axisX + (isLeft ? -offset : offset);

    if (axis.axisLine?.show !== false) {
      group.appendChild(svgLine(
        finalX, gridRect.y,
        finalX, gridRect.y + gridRect.height,
        { stroke: axisColor, "stroke-width": axis.axisLine?.lineStyle?.width ?? 1 },
      ));
    }

    const ticks = scale.ticks(6);
    for (const tick of ticks) {
      const tickY = scale.map(tick as any);
      if (tickY < gridRect.y || tickY > gridRect.y + gridRect.height) continue;

      if (axis.splitLine?.show !== false) {
        group.appendChild(svgLine(
          gridRect.x, tickY,
          gridRect.x + gridRect.width, tickY,
          { stroke: gridColor, "stroke-width": 1 },
        ));
      }

      if (axis.axisTick?.show !== false) {
        const tickLen = axis.axisTick?.length ?? 5;
        group.appendChild(svgLine(
          finalX, tickY,
          finalX + (isLeft ? -tickLen : tickLen), tickY,
          { stroke: axisColor, "stroke-width": 1 },
        ));
      }

      if (axis.axisLabel?.show !== false) {
        const labelX = finalX + (isLeft ? -10 : 10);
        const label = scale.format(tick as any);
        group.appendChild(svgText(label, labelX, tickY, {
          fill: labelColor,
          "text-anchor": isLeft ? "end" : "start",
          "font-size": 11,
          "dominant-baseline": "middle",
        }));
      }
    }

    if (axis.name) {
      const midY = gridRect.y + gridRect.height / 2;
      const nameX = finalX + (isLeft ? -48 : 48);
      const nameEl = svgText(axis.name, nameX, midY, {
        fill: labelColor,
        "text-anchor": "middle",
        "font-size": 12,
        "font-weight": "600",
      });
      nameEl.setAttribute("transform", `rotate(-90,${nameX},${midY})`);
      group.appendChild(nameEl);
    }
  });

  svg.appendChild(group);
}

export function renderAxisPointer(
  svg: SVGSVGElement,
  pixelX: number | null,
  pixelY: number | null,
  gridRect: ChartRect,
  type: "line" | "shadow" | "cross" | "none" = "line",
): void {
  const old = svg.querySelector(".dc-pointer");
  if (old) old.remove();
  if (type === "none" || (pixelX === null && pixelY === null)) return;

  const group = svgEl("g", { class: "dc-pointer", "pointer-events": "none" });
  const pointerColor = colorAxis();

  if (type === "shadow" && pixelX !== null) {
    const shadow = svgEl("rect", {
      x: pixelX - 20,
      y: gridRect.y,
      width: 40,
      height: gridRect.height,
      fill: pointerColor,
      opacity: 0.08,
    });
    group.appendChild(shadow);
  } else {
    if (pixelX !== null) {
      group.appendChild(svgLine(
        pixelX, gridRect.y,
        pixelX, gridRect.y + gridRect.height,
        { stroke: pointerColor, "stroke-width": 1, "stroke-dasharray": "4,3", opacity: 0.7 },
      ));
    }
    if (pixelY !== null) {
      group.appendChild(svgLine(
        gridRect.x, pixelY,
        gridRect.x + gridRect.width, pixelY,
        { stroke: pointerColor, "stroke-width": 1, "stroke-dasharray": "4,3", opacity: 0.7 },
      ));
    }
  }
  svg.appendChild(group);
}
