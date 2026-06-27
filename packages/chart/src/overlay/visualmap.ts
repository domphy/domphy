import { themeColorToken } from "@domphy/theme";
import type { VisualMapOption } from "../types.js";

function svgEl(tag: string, attrs: Record<string, string | number>): SVGElement {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

function svgText(content: string, x: number, y: number, attrs: Record<string, string | number>): SVGElement {
  const el = svgEl("text", { x, y, ...attrs });
  el.textContent = content;
  return el;
}

// Default gradient: blue → cyan → green → yellow → red
const DEFAULT_COLORS = ["#313695", "#4575b4", "#74add1", "#abd9e9", "#e0f3f8",
  "#fee090", "#fdae61", "#f46d43", "#d73027", "#a50026"];

function colorToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function interpolateColor(colors: string[], t: number): string {
  const i = Math.min(colors.length - 2, Math.floor(t * (colors.length - 1)));
  const localT = t * (colors.length - 1) - i;
  const a = colorToRgb(colors[i]);
  const b = colorToRgb(colors[i + 1]);
  const r = Math.round(a[0] + (b[0] - a[0]) * localT);
  const g = Math.round(a[1] + (b[1] - a[1]) * localT);
  const bl = Math.round(a[2] + (b[2] - a[2]) * localT);
  return `rgb(${r},${g},${bl})`;
}

export function colorFromVisualMap(vm: VisualMapOption, value: number): string {
  const min = vm.min ?? 0;
  const max = vm.max ?? 100;
  const colors = (vm.inRange?.color as string[] | undefined) ?? DEFAULT_COLORS;
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return interpolateColor(colors, t);
}

export function renderVisualMap(
  svg: SVGSVGElement,
  visualMaps: VisualMapOption[],
  width: number,
  height: number,
): void {
  const old = svg.querySelectorAll(".dc-visualmap");
  old.forEach((el) => el.remove());

  for (let vi = 0; vi < visualMaps.length; vi++) {
    const vm = visualMaps[vi];
    if (vm.show === false) continue;

    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", "dc-visualmap");

    const colors = ((vm.inRange?.color as any) as string[] | undefined) ?? DEFAULT_COLORS;
    const min = vm.min ?? 0;
    const max = vm.max ?? 100;
    const orient = vm.orient ?? "vertical";
    const itemW = orient === "vertical" ? (vm.itemWidth ?? 20) : (vm.itemHeight ?? 14);
    const itemH = orient === "vertical" ? (vm.itemHeight ?? 140) : (vm.itemWidth ?? 140);

    // Position
    const right = vm.right !== undefined ? (typeof vm.right === "number" ? vm.right : parseFloat(String(vm.right))) : 20;
    const top = (vm.top === "center" || vm.top === undefined)
      ? (height - itemH) / 2
      : (typeof vm.top === "number" ? vm.top : parseFloat(String(vm.top)));
    const vmLeft = vm.left;
    const x = (vmLeft === "center")
      ? (width - itemW) / 2
      : (typeof vmLeft === "number" ? vmLeft : (vmLeft !== undefined ? parseFloat(String(vmLeft)) : width - right - itemW));
    const y = top;

    if (vm.type === "piecewise") {
      // Piecewise legend
      const pieces = (vm as any).pieces ?? [];
      const size = vm.itemWidth ?? 14;
      let oy = y;
      for (let pi = 0; pi < pieces.length; pi++) {
        const piece = pieces[pi] as any;
        const color = (piece.color as string | undefined) ?? interpolateColor(colors, pi / Math.max(1, pieces.length - 1));
        group.appendChild(svgEl("rect", { x, y: oy, width: size, height: size, rx: 2, fill: color }));
        const label = piece.label ?? (piece.max !== undefined ? `≤${piece.max}` : String(piece.min));
        group.appendChild(svgText(label, x + size + 5, oy + size / 2, {
          fill: themeColorToken(null, "shift-8", "neutral"),
          "font-size": 11, "dominant-baseline": "middle",
        }));
        oy += size + 6;
      }
    } else {
      // Continuous gradient bar
      const STOPS = 20;
      const stopH = itemH / STOPS;
      for (let i = 0; i < STOPS; i++) {
        const t = orient === "vertical" ? 1 - i / STOPS : i / STOPS;
        const color = interpolateColor(colors, t);
        if (orient === "vertical") {
          group.appendChild(svgEl("rect", {
            x, y: y + i * stopH, width: itemW, height: stopH + 0.5, fill: color,
          }));
        } else {
          group.appendChild(svgEl("rect", {
            x: x + i * stopH, y, width: stopH + 0.5, height: itemW, fill: color,
          }));
        }
      }

      // Min/max labels
      const textColor = themeColorToken(null, "shift-8", "neutral");
      if (orient === "vertical") {
        group.appendChild(svgText(String(max), x + itemW / 2, y - 4, {
          fill: textColor, "font-size": 10, "text-anchor": "middle",
        }));
        group.appendChild(svgText(String(min), x + itemW / 2, y + itemH + 12, {
          fill: textColor, "font-size": 10, "text-anchor": "middle",
        }));
      } else {
        group.appendChild(svgText(String(min), x - 4, y + itemW / 2, {
          fill: textColor, "font-size": 10, "text-anchor": "end", "dominant-baseline": "middle",
        }));
        group.appendChild(svgText(String(max), x + itemH + 4, y + itemW / 2, {
          fill: textColor, "font-size": 10, "text-anchor": "start", "dominant-baseline": "middle",
        }));
      }

      // Text labels
      if (vm.text) {
        const [maxLabel, minLabel] = vm.text;
        if (orient === "vertical") {
          if (maxLabel) group.appendChild(svgText(maxLabel, x + itemW / 2, y - 18, {
            fill: textColor, "font-size": 11, "text-anchor": "middle",
          }));
          if (minLabel) group.appendChild(svgText(minLabel, x + itemW / 2, y + itemH + 28, {
            fill: textColor, "font-size": 11, "text-anchor": "middle",
          }));
        }
      }
    }

    svg.appendChild(group);
  }
}
