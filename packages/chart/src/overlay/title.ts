import { themeColor } from "@domphy/theme";
import type { TitleOption } from "../types.js";
import { stampOverlayGroup, takeOverlaySlot } from "./groups.js";

export function renderTitle(
  svg: SVGSVGElement,
  title: TitleOption,
  index?: number,
): void {
  const { slot, root } = takeOverlaySlot(svg, "dc-title", index);
  if (title.show === false || (!title.text && !title.subtext)) return;

  const svgWidth = Number(svg.getAttribute("width") ?? 400);
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  stampOverlayGroup(group, slot);

  function resolveH(
    val: string | number | undefined,
    fallback: number,
  ): [number, "start" | "middle" | "end"] {
    if (val === undefined) return [fallback, "start"];
    if (typeof val === "number") return [val, "start"];
    if (val === "center") return [svgWidth / 2, "middle"];
    if (val === "right") return [svgWidth - 8, "end"];
    if (val === "left") return [8, "start"];
    if (String(val).endsWith("%"))
      return [(parseFloat(val) / 100) * svgWidth, "start"];
    return [parseFloat(String(val)) || fallback, "start"];
  }

  const [leftPx, autoAnchor] = resolveH(title.left, 8);
  const top =
    title.top !== undefined
      ? typeof title.top === "number"
        ? title.top
        : parseFloat(String(title.top)) || 10
      : 10;

  const explicitAnchor =
    title.textAlign === "center"
      ? "middle"
      : title.textAlign === "right"
        ? "end"
        : title.textAlign === "left"
          ? "start"
          : null;
  const anchor = explicitAnchor ?? autoAnchor;
  const align =
    anchor === "middle"
      ? svgWidth / 2
      : anchor === "end"
        ? svgWidth - 8
        : leftPx;

  if (title.text) {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.textContent = title.text;
    text.setAttribute("x", String(align));
    text.setAttribute("y", String(top + 16));
    text.setAttribute("text-anchor", anchor);
    text.setAttribute("fill", themeColor(null, "shift-11", "neutral"));
    text.setAttribute("font-size", String(title.textStyle?.fontSize ?? 14));
    text.setAttribute(
      "font-weight",
      String(title.textStyle?.fontWeight ?? "600"),
    );
    group.appendChild(text);
  }

  if (title.subtext) {
    const sub = document.createElementNS("http://www.w3.org/2000/svg", "text");
    sub.textContent = title.subtext;
    sub.setAttribute("x", String(align));
    sub.setAttribute("y", String(top + 34));
    sub.setAttribute("text-anchor", anchor);
    sub.setAttribute("fill", themeColor(null, "shift-7", "neutral"));
    sub.setAttribute("font-size", String(title.subtextStyle?.fontSize ?? 12));
    group.appendChild(sub);
  }

  root.appendChild(group);
}
