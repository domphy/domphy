import { themeColorToken } from "@domphy/theme";
import type { LegendOption, SeriesOption } from "../types.js";
import { seriesHex } from "../gl/color.js";

export function renderLegend(
  svg: SVGSVGElement,
  legend: LegendOption,
  series: SeriesOption[],
  hiddenSeries: Set<string>,
  onToggle: (name: string) => void,
): void {
  const old = svg.querySelector(".dc-legend");
  if (old) old.remove();
  if (legend.show === false) return;

  const svgWidth = Number(svg.getAttribute("width") ?? 400);
  const svgHeight = Number(svg.getAttribute("height") ?? 300);
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "dc-legend");
  group.setAttribute("pointer-events", "all");
  group.style.cursor = "pointer";

  const itemGap = legend.itemGap ?? 16;
  const itemWidth = legend.itemWidth ?? 14;
  const itemHeight = legend.itemHeight ?? 10;
  const orient = legend.orient ?? "horizontal";

  const names = (legend.data
    ? legend.data.map((d) => (typeof d === "string" ? d : d.name))
    : series.map((s) => s.name ?? "")).filter((n) => n !== "");

  const textColor = themeColorToken(null, "shift-8", "neutral");
  const disabledColor = themeColorToken(null, "shift-4", "neutral");
  const fontSize = 12;

  // Rough width estimate for centering
  const estimatedItemW = itemWidth + 6 + 60;
  const totalWidth = names.length * (estimatedItemW + itemGap);
  const startX = legend.left !== undefined
    ? (typeof legend.left === "number" ? legend.left : (legend.left === "center" ? (svgWidth - totalWidth) / 2 : 8))
    : (svgWidth - totalWidth) / 2;

  const startY = legend.top !== undefined
    ? (typeof legend.top === "number" ? legend.top : 8)
    : (legend.bottom !== undefined ? svgHeight - 30 : 8);

  let offsetX = startX;
  let offsetY = startY;

  names.forEach((name, index) => {
    const seriesIndex = series.findIndex((s) => s.name === name) === -1 ? index : series.findIndex((s) => s.name === name);
    const isHidden = hiddenSeries.has(name);
    const color = isHidden ? disabledColor : seriesHex(seriesIndex);

    // Invisible hit area for click
    const textW = name.length * 7;
    const hitArea = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    hitArea.setAttribute("x", String(offsetX));
    hitArea.setAttribute("y", String(offsetY));
    hitArea.setAttribute("width", String(itemWidth + 5 + textW));
    hitArea.setAttribute("height", String(fontSize + 4));
    hitArea.setAttribute("fill", "transparent");
    hitArea.addEventListener("click", () => onToggle(name));
    group.appendChild(hitArea);

    // Color swatch
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", String(offsetX));
    rect.setAttribute("y", String(offsetY + (fontSize - itemHeight) / 2));
    rect.setAttribute("width", String(itemWidth));
    rect.setAttribute("height", String(itemHeight));
    rect.setAttribute("rx", "2");
    rect.setAttribute("fill", color);
    rect.setAttribute("opacity", isHidden ? "0.4" : "1");
    group.appendChild(rect);

    // Label
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.textContent = name;
    text.setAttribute("x", String(offsetX + itemWidth + 5));
    text.setAttribute("y", String(offsetY + fontSize));
    text.setAttribute("fill", isHidden ? disabledColor : textColor);
    text.setAttribute("font-size", String(fontSize));
    text.setAttribute("opacity", isHidden ? "0.5" : "1");
    group.appendChild(text);

    if (orient === "horizontal") {
      offsetX += itemWidth + 5 + name.length * 7 + itemGap;
    } else {
      offsetY += fontSize + itemGap;
    }
  });

  svg.appendChild(group);
}
