// magicui "Interactive Grid Pattern" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied).
// An SVG grid of squares where the single cell under the mouse cursor fades
// to a highlighted fill as the pointer moves.
//
// Position tracking is done imperatively (direct DOM writes on every
// mousemove, matching this package's `pointer()` block) rather than through
// reactive state, since it is a high-frequency, purely visual concern. Only
// ever one square is active at a time: entering a new square fades it in
// quickly while the previously active square fades back out a touch more
// slowly, via a per-write `transitionDuration` swap on the two `<rect>`
// elements involved.

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface InteractiveGridPatternProps {
  /** Width of each grid square, in SVG user units. Defaults to `40`. */
  width?: number;
  /** Height of each grid square, in SVG user units. Defaults to `40`. */
  height?: number;
  /** `[columns, rows]` grid dimensions. Defaults to `[30, 20]`. */
  squares?: [number, number];
  /** Theme color family for the single hovered/active square's highlight fill.
   * Defaults to `"neutral"`. */
  hoverColor?: ThemeColor;
  /** Fade-in duration in ms when a square becomes active. Defaults to `150`. */
  fadeInDuration?: number;
  /** Fade-out duration in ms when a square stops being active. Defaults to `400`. */
  fadeOutDuration?: number;
  /** Foreground content layered above the pattern. Defaults to a small demo panel. */
  children?: DomphyElement | DomphyElement[];
  style?: StyleObject;
}

let interactiveGridPatternInstanceCounter = 0;

/**
 * SVG grid of squares where the single cell under the mouse cursor fades to
 * a highlighted fill as the pointer moves; only ever one square is active at
 * a time. Call with no arguments for a working demo — hover the panel to
 * light up one cell at a time.
 */
function interactiveGridPattern(props: InteractiveGridPatternProps = {}): DomphyElement<"div"> {
  const instanceId = ++interactiveGridPatternInstanceCounter;
  const cellWidth = Math.max(4, props.width ?? 40);
  const cellHeight = Math.max(4, props.height ?? 40);
  const [columns, rows] = props.squares ?? [30, 20];
  const hoverColor = props.hoverColor ?? "neutral";
  const fadeInDuration = props.fadeInDuration ?? 150;
  const fadeOutDuration = props.fadeOutDuration ?? 400;

  const gridWidth = columns * cellWidth;
  const gridHeight = rows * cellHeight;

  // Populated by each cell's own `_onMount` — the grid's `_onMount` reads it
  // once mouse tracking starts, so it must be a plain array captured by both
  // closures, not a reactive value.
  const cellElements: (SVGRectElement | null)[] = new Array(columns * rows).fill(null);

  const squareElements: DomphyElement[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      squareElements.push({
        rect: null,
        _key: `cell-${instanceId}-${index}`,
        x: column * cellWidth,
        y: row * cellHeight,
        width: cellWidth,
        height: cellHeight,
        ariaHidden: "true",
        _onMount: (node: ElementNode) => {
          cellElements[index] = node.domElement as unknown as SVGRectElement;
        },
        style: {
          fill: "transparent",
          stroke: "currentColor",
          strokeWidth: 1,
          transitionProperty: "fill",
          transitionDuration: `${fadeOutDuration}ms`,
          transitionTimingFunction: "ease-out",
        } as StyleObject,
      } as DomphyElement);
    }
  }

  const defaultChildren: DomphyElement[] = [
    { h3: "Interactive Grid Pattern", $: [heading()] } as DomphyElement,
    {
      p: "Move your pointer over the grid — one square lights up at a time.",
      $: [paragraph()],
    } as DomphyElement,
  ];
  const contentChildren = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : defaultChildren;

  return {
    div: [
      {
        svg: squareElements,
        viewBox: `0 0 ${gridWidth} ${gridHeight}`,
        preserveAspectRatio: "none",
        ariaHidden: "true",
        _onMount: (node: ElementNode) => {
          const svgElement = node.domElement as unknown as SVGSVGElement;
          // themeColor() returns a live `var(--x-n)` reference — computed once
          // here, it stays reactive to theme swaps without re-invocation.
          const highlightFill = themeColor(node, "shift-9", hoverColor);
          let activeIndex = -1;

          const deactivate = (index: number) => {
            const cell = cellElements[index];
            if (!cell) return;
            cell.style.transitionDuration = `${fadeOutDuration}ms`;
            cell.style.fill = "transparent";
          };

          const activate = (index: number) => {
            const cell = cellElements[index];
            if (!cell) return;
            cell.style.transitionDuration = `${fadeInDuration}ms`;
            cell.style.fill = highlightFill;
          };

          const indexFromEvent = (event: MouseEvent): number | null => {
            const boundingBox = svgElement.getBoundingClientRect();
            if (boundingBox.width === 0 || boundingBox.height === 0) return null;
            const scaleX = gridWidth / boundingBox.width;
            const scaleY = gridHeight / boundingBox.height;
            const localX = (event.clientX - boundingBox.left) * scaleX;
            const localY = (event.clientY - boundingBox.top) * scaleY;
            const column = Math.floor(localX / cellWidth);
            const row = Math.floor(localY / cellHeight);
            if (column < 0 || column >= columns || row < 0 || row >= rows) return null;
            return row * columns + column;
          };

          const handleMove = (event: MouseEvent) => {
            const index = indexFromEvent(event);
            if (index === activeIndex) return;
            if (activeIndex !== -1) deactivate(activeIndex);
            if (index !== null) activate(index);
            activeIndex = index ?? -1;
          };

          const handleLeave = () => {
            if (activeIndex !== -1) deactivate(activeIndex);
            activeIndex = -1;
          };

          svgElement.addEventListener("mousemove", handleMove);
          svgElement.addEventListener("mouseleave", handleLeave);

          node.addHook("Remove", () => {
            svgElement.removeEventListener("mousemove", handleMove);
            svgElement.removeEventListener("mouseleave", handleLeave);
          });
        },
        style: {
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          color: (listener) => themeColor(listener, "shift-3"),
        } as StyleObject,
      } as DomphyElement<"svg">,
      {
        div: contentChildren,
        style: { position: "relative", zIndex: 1, pointerEvents: "none" },
      },
    ],
    dataTone: "shift-1",
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      padding: themeSpacing(8),
      minHeight: themeSpacing(64),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { interactiveGridPattern };
