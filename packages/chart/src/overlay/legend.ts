import { themeColor } from "@domphy/theme";
import { cssColor } from "../gl/color.js";
import type { LegendOption, SeriesOption } from "../types.js";
import { stampOverlayGroup, takeOverlaySlot } from "./groups.js";

export function renderLegend(
  svg: SVGSVGElement,
  legend: LegendOption,
  series: SeriesOption[],
  hiddenSeries: Set<string>,
  onToggle: (name: string) => void,
  index?: number,
  // ECharts legendHoverLink: pointing at a legend item highlights its series.
  // Keyboard focus calls this too, so Tab reaches the same affordance a mouse
  // does (WCAG 2.1.1) — null means "nothing highlighted".
  onFocusSeries?: (name: string | null) => void,
): void {
  // Legend items are rebuilt from scratch on every render, so a keyboard
  // toggle would drop focus to <body> and force the user to Tab in from the
  // top again (WCAG 2.4.3 / 3.2.2). Note which item holds focus BEFORE the
  // slot is cleared, and hand it back to that item's replacement below.
  const active =
    typeof document !== "undefined" ? document.activeElement : null;
  const focusedName =
    active && svg.contains(active) && active.getAttribute("role") === "button"
      ? active.getAttribute("aria-label")
      : null;

  const { slot, root } = takeOverlaySlot(svg, "dc-legend", index);
  if (legend.show === false) return;

  const svgWidth = Number(svg.getAttribute("width") ?? 400);
  const svgHeight = Number(svg.getAttribute("height") ?? 300);
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  stampOverlayGroup(group, slot);
  group.setAttribute("pointer-events", "all");
  group.style.cursor = legend.selectedMode === false ? "default" : "pointer";

  const itemGap = legend.itemGap ?? 16;
  const itemWidth = legend.itemWidth ?? 14;
  const itemHeight = legend.itemHeight ?? 10;
  const orient = legend.orient ?? "horizontal";

  const names = (
    legend.data
      ? legend.data.map((d) => (typeof d === "string" ? d : d.name))
      : series.map((s) => s.name ?? "")
  ).filter((n) => n !== "");

  const textColor = themeColor(null, "shift-8", "neutral");
  const disabledColor = themeColor(null, "shift-4", "neutral");
  const fontSize = 12;

  // ECharts legend.formatter: function receives the name; a string is a
  // template where "{name}" is replaced with the series name.
  const labelOf = (name: string): string =>
    typeof legend.formatter === "function"
      ? String(legend.formatter(name))
      : typeof legend.formatter === "string"
        ? legend.formatter.replace(/\{name\}/g, name)
        : name;

  // Width estimate per item, from the same 7px-per-character approximation the
  // item advance uses. The old estimate was a flat 60px label for every item,
  // so centering drifted and long labels ran off the canvas.
  const labels = names.map(labelOf);
  const itemWidths = labels.map((label) => itemWidth + 5 + label.length * 7);

  const orientHorizontal = orient === "horizontal";
  const lineHeight = fontSize + itemGap;
  const margin = 8;
  // ECharts wraps a horizontal legend that is wider than the chart instead of
  // running the extra items off the right edge (unreachable, and an axe
  // "content outside the viewport" finding at 375px).
  const maxRowWidth = Math.max(svgWidth - margin * 2, 1);
  const rows: number[][] = [[]];
  if (orientHorizontal) {
    let rowWidth = 0;
    itemWidths.forEach((width, itemIndex) => {
      const advance = width + itemGap;
      const current = rows[rows.length - 1];
      if (current.length > 0 && rowWidth + advance - itemGap > maxRowWidth) {
        rows.push([itemIndex]);
        rowWidth = advance;
        return;
      }
      current.push(itemIndex);
      rowWidth += advance;
    });
  } else {
    rows[0] = names.map((_, itemIndex) => itemIndex);
  }

  const rowWidthOf = (row: number[]): number =>
    row.reduce((sum, itemIndex) => sum + itemWidths[itemIndex] + itemGap, 0) -
    itemGap;

  // ECharts legend.left defaults to "center" for both orientations. A vertical
  // legend centers on its widest item (it used to be centered against the
  // horizontal total width, which pushed long lists off the left edge).
  const rowStartX = (row: number[]): number => {
    if (typeof legend.left === "number") return legend.left;
    if (legend.left !== undefined && legend.left !== "center") return margin;
    const width = orientHorizontal
      ? rowWidthOf(row)
      : Math.max(...itemWidths, 0);
    return Math.max(margin, (svgWidth - width) / 2);
  };

  // Extra rows grow downward, so a bottom-anchored legend has to start higher
  // or the last row lands off the bottom edge.
  const extraRows = orientHorizontal ? rows.length - 1 : 0;
  const startY =
    legend.top !== undefined
      ? typeof legend.top === "number"
        ? legend.top
        : margin
      : legend.bottom !== undefined
        ? Math.max(margin, svgHeight - 30 - extraRows * lineHeight)
        : margin;

  const positions = new Map<number, { x: number; y: number }>();
  rows.forEach((row, rowIndex) => {
    let offsetX = rowStartX(row);
    let offsetY = startY + (orientHorizontal ? rowIndex * lineHeight : 0);
    for (const itemIndex of row) {
      positions.set(itemIndex, { x: offsetX, y: offsetY });
      if (orientHorizontal) offsetX += itemWidths[itemIndex] + itemGap;
      else offsetY += lineHeight;
    }
  });

  const focusTargets = new Map<string, SVGElement>();

  names.forEach((name, index) => {
    const { x: offsetX, y: offsetY } = positions.get(index) ?? { x: 0, y: 0 };
    const seriesIndex =
      series.findIndex((s) => s.name === name) === -1
        ? index
        : series.findIndex((s) => s.name === name);
    const isHidden = hiddenSeries.has(name);
    // The swatch must show what the series is actually painted in: an explicit
    // series.color, otherwise the palette entry for its index in option.series
    // (which is the same index the renderers resolve their palette color from).
    const color = isHidden
      ? disabledColor
      : cssColor(
          (series[seriesIndex] as { color?: unknown } | undefined)?.color,
          seriesIndex,
        );

    const label = labels[index];

    // Invisible hit area for click
    const hitArea = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect",
    );
    hitArea.setAttribute("x", String(offsetX));
    hitArea.setAttribute("y", String(offsetY));
    hitArea.setAttribute("width", String(itemWidths[index]));
    hitArea.setAttribute("height", String(fontSize + 4));
    hitArea.setAttribute("fill", "transparent");
    const interactive = legend.selectedMode !== false;
    if (interactive) {
      // WAI-ARIA APG toggle button: an SVG hit rect is not focusable or
      // announced on its own, so give it the button role, a name, the pressed
      // state, and the Enter/Space activation keys the pattern requires.
      hitArea.setAttribute("role", "button");
      hitArea.setAttribute("tabindex", "0");
      hitArea.setAttribute("aria-pressed", isHidden ? "false" : "true");
      hitArea.setAttribute("aria-label", name);
      hitArea.addEventListener("click", () => onToggle(name));
      hitArea.addEventListener("keydown", (event) => {
        const key = (event as KeyboardEvent).key;
        if (key !== "Enter" && key !== " " && key !== "Spacebar") return;
        event.preventDefault();
        onToggle(name);
      });
      // Focus is invisible on a transparent rect — outline the swatch+label box.
      hitArea.addEventListener("focus", () => {
        hitArea.setAttribute("stroke", themeColor(null, "shift-9", "primary"));
        hitArea.setAttribute("stroke-width", "2");
        hitArea.setAttribute("rx", "2");
        onFocusSeries?.(name);
      });
      hitArea.addEventListener("blur", () => {
        hitArea.removeAttribute("stroke");
        hitArea.removeAttribute("stroke-width");
        onFocusSeries?.(null);
      });
      hitArea.addEventListener("pointerenter", () => onFocusSeries?.(name));
      hitArea.addEventListener("pointerleave", () => onFocusSeries?.(null));
      focusTargets.set(name, hitArea);
    }
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
    text.textContent = label;
    text.setAttribute("x", String(offsetX + itemWidth + 5));
    text.setAttribute("y", String(offsetY + fontSize));
    text.setAttribute("fill", isHidden ? disabledColor : textColor);
    text.setAttribute("font-size", String(fontSize));
    text.setAttribute("opacity", isHidden ? "0.5" : "1");
    group.appendChild(text);
  });

  root.appendChild(group);

  // Hand focus back to the item the user was on (the node it lived on was
  // just replaced). Only after the group is in the document — a detached SVG
  // element cannot take focus.
  if (focusedName) {
    const target = focusTargets.get(focusedName);
    (target as unknown as HTMLElement | undefined)?.focus?.();
  }
}
