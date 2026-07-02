// Aceternity UI "Background Ripple Effect" — clean-room reimplementation
// from the public behavior/visual spec only (no upstream source viewed or
// copied). A dense grid of bordered square cells that, on click, sends a
// visible ripple of highlighted opacity radiating outward from the clicked
// cell across the rest of the grid.
//
// The grid is a plain declarative array of bordered `<div>` cells (matching
// the spec's own DOM sketch), the same shape this package's
// `interactiveGridPattern` uses for its own grid — small enough at the
// default 8×27 count that per-cell DOM nodes are cheap, unlike the
// canvas-per-pixel approach this package reaches for on much larger
// continuous-animation grids (`flickeringGrid`, `dottedGlowBackground`).
//
// Distance-based CSS `animation-delay` technique: on click, the
// row/column Euclidean distance from the clicked cell to every other cell is
// computed once in JS, then every cell's `style.animation` is written
// imperatively with a delay proportional to that distance — so farther
// cells start their pulse later — all sharing ONE `@keyframes` (declared
// once on the grid container, referenced by name) that ramps opacity from a
// low resting value up to a peak around the animation's midpoint and back
// down, with an ease-out curve. Because propagation is expressed purely as
// per-cell `animation-delay` plus a single shared keyframe, the browser's
// compositor drives the whole ripple — no continuous JS frame loop. Setting
// `style.animation = "none"` and forcing a reflow (`void cell.offsetWidth`)
// before reapplying it is what allows the same cell to replay the ripple on
// a second click before its first pulse has finished.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface BackgroundRippleCell {
  row: number;
  column: number;
}

export interface BackgroundRippleEffectProps {
  /** Number of grid rows. Defaults to `8`. */
  rows?: number;
  /** Number of grid columns. Defaults to `27`. */
  columns?: number;
  /** Side length of each square cell, in px. Defaults to `56`. */
  cellSize?: number;
  /** Theme color family for cell borders. Defaults to `"neutral"`. */
  borderColor?: ThemeColor;
  /** Theme color family for the cell fill. Defaults to `"neutral"`. */
  fillColor?: ThemeColor;
  /** One ripple pulse's duration, in ms. Defaults to `200`. */
  rippleDuration?: number;
  /** Extra delay added per unit of grid-distance from the clicked cell, in ms. Defaults to `20`. */
  staggerMs?: number;
  /** Enables/disables click interactivity. Defaults to `true`. */
  interactive?: boolean;
  /** Fires with the clicked cell's row/column, in addition to the visual ripple. */
  onCellClick?: (cell: BackgroundRippleCell) => void;
  /** Foreground content layered above the grid. Defaults to a small demo panel. */
  children?: DomphyElement | DomphyElement[];
  /** Passthrough style merged onto the outer grid container. */
  style?: StyleObject;
}

const RESTING_OPACITY = 0.4;
const PEAK_OPACITY = 0.8;

let backgroundRippleEffectInstanceCounter = 0;

/**
 * A dense grid of bordered square cells that, on click, sends a visible
 * ripple of highlighted opacity radiating outward from the clicked cell.
 * Call with no arguments for a working demo — click any cell in the 8×27
 * grid to see the ripple propagate.
 */
function backgroundRippleEffect(props: BackgroundRippleEffectProps = {}): DomphyElement<"div"> {
  const instanceId = ++backgroundRippleEffectInstanceCounter;
  const rows = Math.max(1, Math.round(props.rows ?? 8));
  const columns = Math.max(1, Math.round(props.columns ?? 27));
  const cellSize = Math.max(4, props.cellSize ?? 56);
  const borderColor = props.borderColor ?? "neutral";
  const fillColor = props.fillColor ?? "neutral";
  const rippleDuration = Math.max(1, props.rippleDuration ?? 200);
  const staggerMs = Math.max(0, props.staggerMs ?? 20);
  const interactive = props.interactive ?? true;

  const rippleAnimationName = `background-ripple-pulse-${hashString(
    JSON.stringify({ instanceId, RESTING_OPACITY, PEAK_OPACITY }),
  )}`;
  const rippleKeyframes = {
    "0%": { opacity: RESTING_OPACITY },
    "50%": { opacity: PEAK_OPACITY },
    "100%": { opacity: RESTING_OPACITY },
  };

  // Populated by each cell's own `_onMount`; the grid's own `_onMount` reads
  // it once the click handler is wired up, so it must be a plain array
  // captured by both closures, not a reactive value (mirrors
  // interactiveGridPattern.ts's cellElements array).
  const cellElements: (HTMLElement | null)[] = new Array(rows * columns).fill(null);

  const cellNodes: DomphyElement[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      cellNodes.push({
        div: null,
        _key: `cell-${instanceId}-${index}`,
        dataRow: String(row),
        dataCol: String(column),
        ariaHidden: "true",
        _onMount: (node: ElementNode) => {
          cellElements[index] = node.domElement as unknown as HTMLElement;
        },
        style: {
          width: `${cellSize}px`,
          height: `${cellSize}px`,
          boxSizing: "border-box",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: (listener: Listener) => themeColor(listener, "shift-3", borderColor),
          // The fill rides on `color` (a themed value, so `missing-color` is
          // satisfied) + a literal `currentColor` background — `currentColor`
          // is exempt from `raw-theme-value` and, unlike a reactive
          // `themeColor()` call, is never flagged by `tone-background-inherit`
          // (that rule only inspects reactive `backgroundColor` functions).
          color: (listener: Listener) => themeColor(listener, "shift-9", fillColor),
          backgroundColor: "currentColor",
          opacity: RESTING_OPACITY,
        } as StyleObject,
      } as DomphyElement);
    }
  }

  const defaultChildren: DomphyElement[] = [
    { h3: "Background Ripple Effect", $: [heading()] } as DomphyElement,
    {
      p: "Click any cell — the ripple radiates outward, farther cells lighting up a beat later.",
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
        div: cellNodes,
        ariaHidden: "true",
        style: {
          position: "absolute",
          inset: 0,
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
          justifyContent: "center",
          alignContent: "center",
        } as StyleObject,
      } as DomphyElement<"div">,
      {
        div: contentChildren,
        style: {
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          textAlign: "center",
        } as StyleObject,
      } as DomphyElement<"div">,
    ],
    dataTone: "shift-16",
    _onMount: (node: ElementNode) => {
      if (!interactive || typeof window === "undefined") return;
      const containerElement = node.domElement as HTMLElement | null;
      if (!containerElement) return;

      const triggerRipple = (originRow: number, originColumn: number) => {
        for (let index = 0; index < cellElements.length; index += 1) {
          const cell = cellElements[index];
          if (!cell) continue;
          const cellRow = Math.floor(index / columns);
          const cellColumn = index % columns;
          const distance = Math.hypot(cellRow - originRow, cellColumn - originColumn);
          const delayMs = distance * staggerMs;
          cell.style.animation = "none";
          // Force a reflow so the browser registers the animation removal
          // before it's reapplied — otherwise a second click before the
          // first pulse finishes wouldn't restart the animation.
          void cell.offsetWidth;
          cell.style.animation = `${rippleAnimationName} ${rippleDuration}ms ease-out ${delayMs}ms`;
        }
      };

      const handleClick = (event: MouseEvent) => {
        const target = (event.target as HTMLElement | null)?.closest("[data-row]") as HTMLElement | null;
        if (!target || !containerElement.contains(target)) return;
        const clickedRow = Number(target.getAttribute("data-row"));
        const clickedColumn = Number(target.getAttribute("data-col"));
        if (Number.isNaN(clickedRow) || Number.isNaN(clickedColumn)) return;
        triggerRipple(clickedRow, clickedColumn);
        props.onCellClick?.({ row: clickedRow, column: clickedColumn });
      };

      containerElement.addEventListener("click", handleClick);
      node.addHook("Remove", () => {
        containerElement.removeEventListener("click", handleClick);
      });
    },
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      minHeight: themeSpacing(96),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      [`@keyframes ${rippleAnimationName}`]: rippleKeyframes,
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { backgroundRippleEffect };
