import { themeColorToken } from "@domphy/theme";
import type { TreemapSeriesOption } from "../types.js";
import { seriesHex } from "../gl/color.js";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface TreemapNode {
  name?: string;
  value?: number;
  children?: TreemapNode[];
  color?: string;
}

// Squarified treemap layout — Bruls et al.
function squarify(items: Array<{ value: number; index: number }>, rect: Rect): Rect[] {
  if (items.length === 0) return [];

  const totalArea = rect.w * rect.h;
  const totalValue = items.reduce((s, n) => s + n.value, 0);
  if (totalValue === 0) return items.map(() => ({ x: rect.x, y: rect.y, w: 0, h: 0 }));

  const results: Rect[] = new Array(items.length);
  let remaining = items;
  let currentRect = { ...rect };

  while (remaining.length > 0) {
    const isWide = currentRect.w >= currentRect.h;
    const sideLen = isWide ? currentRect.h : currentRect.w;
    const areaLeft = currentRect.w * currentRect.h;
    const valueLeft = remaining.reduce((s, n) => s + n.value, 0);

    // Find how many items fit in the current row with best aspect ratio
    let row: typeof items = [];
    let worstRatio = Infinity;
    let rowArea = 0;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const newRowArea = rowArea + (candidate.value / valueLeft) * areaLeft;
      const newRow = [...row, candidate];
      const rowLen = newRowArea / sideLen;

      const newWorst = newRow.reduce((worst, item) => {
        const area = (item.value / valueLeft) * areaLeft;
        const itemW = isWide ? area / rowLen : rowLen;
        const itemH = isWide ? rowLen : area / rowLen;
        const ratio = Math.max(itemW / itemH, itemH / itemW);
        return Math.max(worst, ratio);
      }, 0);

      if (row.length > 0 && newWorst > worstRatio) break;

      row = newRow;
      rowArea = newRowArea;
      worstRatio = newWorst;
    }

    // Layout the row
    const rowLen = rowArea / sideLen;
    let offset = isWide ? currentRect.y : currentRect.x;
    for (const item of row) {
      const area = (item.value / valueLeft) * areaLeft;
      const itemLen = area / rowLen;
      if (isWide) {
        results[item.index] = { x: currentRect.x, y: offset, w: rowLen, h: itemLen };
      } else {
        results[item.index] = { x: offset, y: currentRect.y, w: itemLen, h: rowLen };
      }
      offset += itemLen;
    }

    // Shrink currentRect
    if (isWide) {
      currentRect = { x: currentRect.x + rowLen, y: currentRect.y, w: currentRect.w - rowLen, h: currentRect.h };
    } else {
      currentRect = { x: currentRect.x, y: currentRect.y + rowLen, w: currentRect.w, h: currentRect.h - rowLen };
    }
    remaining = remaining.slice(row.length);
  }

  return results;
}

function renderNodes(
  group: Element,
  nodes: TreemapNode[],
  rect: Rect,
  depth: number,
  seriesIndex: number,
): void {
  const totalValue = nodes.reduce((s, n) => s + (n.value ?? 0), 0);
  if (totalValue === 0 || rect.w < 2 || rect.h < 2) return;

  const items = nodes.map((n, i) => ({ value: n.value ?? 0, index: i }));
  const rects = squarify(items, rect);
  const GAP = 2;

  nodes.forEach((node, index) => {
    const r = rects[index];
    if (!r || r.w < 1 || r.h < 1) return;

    const padded = { x: r.x + GAP, y: r.y + GAP, w: r.w - GAP * 2, h: r.h - GAP * 2 };
    if (padded.w < 1 || padded.h < 1) return;

    const color = node.color ?? seriesHex(depth === 0 ? index : seriesIndex);

    const rect2 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect2.setAttribute("x", String(padded.x));
    rect2.setAttribute("y", String(padded.y));
    rect2.setAttribute("width", String(padded.w));
    rect2.setAttribute("height", String(padded.h));
    rect2.setAttribute("fill", color);
    rect2.setAttribute("rx", "2");
    rect2.setAttribute("opacity", depth === 0 ? "0.9" : "0.7");
    group.appendChild(rect2);

    // Label if big enough
    if (padded.w > 30 && padded.h > 16 && node.name) {
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.textContent = node.name;
      label.setAttribute("x", String(padded.x + padded.w / 2));
      label.setAttribute("y", String(padded.y + Math.min(padded.h / 2, 20)));
      label.setAttribute("fill", "#fff");
      label.setAttribute("font-size", String(Math.max(9, Math.min(13, padded.w / 6))));
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("dominant-baseline", "middle");
      label.setAttribute("pointer-events", "none");
      label.setAttribute("clip-path", `rect(0 ${padded.w}px ${padded.h}px 0)`);
      group.appendChild(label);

      if (node.value !== undefined && padded.h > 36) {
        const val = document.createElementNS("http://www.w3.org/2000/svg", "text");
        val.textContent = String(node.value);
        val.setAttribute("x", String(padded.x + padded.w / 2));
        val.setAttribute("y", String(padded.y + Math.min(padded.h / 2, 20) + 14));
        val.setAttribute("fill", "rgba(255,255,255,0.7)");
        val.setAttribute("font-size", "10");
        val.setAttribute("text-anchor", "middle");
        val.setAttribute("dominant-baseline", "middle");
        val.setAttribute("pointer-events", "none");
        group.appendChild(val);
      }
    }

    // Recurse into children — pass parent's color index so gap between siblings matches
    if (node.children && node.children.length > 0 && padded.w > 20 && padded.h > 20) {
      renderNodes(group, node.children, padded, depth + 1, depth === 0 ? index : seriesIndex);
    }
  });
}

export function renderTreemap(
  svg: SVGSVGElement,
  series: TreemapSeriesOption[],
  width: number,
  height: number,
  hiddenSeries: Set<string>,
): void {
  const old = svg.querySelector(".dc-treemap");
  if (old) old.remove();
  if (series.length === 0) return;

  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "dc-treemap");

  for (let si = 0; si < series.length; si++) {
    const s = series[si];
    if (s.name && hiddenSeries.has(s.name)) continue;

    const left = typeof s.left === "number" ? s.left : typeof s.left === "string" ? parseFloat(s.left) : width * 0.05;
    const top = typeof s.top === "number" ? s.top : typeof s.top === "string" ? parseFloat(s.top) : height * 0.1;
    const tw = typeof s.width === "number" ? s.width : width * 0.9;
    const th = typeof s.height === "number" ? s.height : height * 0.85;

    const nodes = (s.data ?? []) as TreemapNode[];
    renderNodes(group, nodes, { x: left, y: top, w: tw, h: th }, 0, si);
  }

  svg.appendChild(group);
}
