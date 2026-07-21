import { themeColorToken } from "@domphy/theme";
import type {
  ChartRect,
  DataZoomOption,
  DataZoomSliderOption,
} from "../types.js";

export interface DataZoomState {
  start: number; // 0–100
  end: number; // 0–100
}

interface SliderHandle {
  cleanup: () => void;
  update: (state: DataZoomState) => void;
}

const HANDLE_W = 8;
const SLIDER_H = 30;

function svgEl(
  tag: string,
  attrs: Record<string, string | number>,
): SVGElement {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

// Create a single DataZoom slider for one dataZoom option.
// Returns cleanup function.
export function createDataZoomSlider(
  svg: SVGSVGElement,
  option: DataZoomSliderOption,
  gridRect: ChartRect,
  svgWidth: number,
  svgHeight: number,
  state: DataZoomState,
  onChange: (state: DataZoomState) => void,
): SliderHandle {
  const trackColor = themeColorToken(null, "shift-2", "neutral");
  const fillColor = themeColorToken(null, "shift-3", "neutral");
  const handleColor = themeColorToken(null, "shift-5", "neutral");
  const textColor = themeColorToken(null, "shift-7", "neutral");

  const sliderH =
    typeof option.height === "number"
      ? option.height
      : option.height
        ? parseFloat(String(option.height))
        : SLIDER_H;
  const bottom =
    option.bottom !== undefined
      ? typeof option.bottom === "number"
        ? option.bottom
        : parseFloat(String(option.bottom))
      : 10;
  const sliderY = svgHeight - bottom - sliderH;
  const sliderX = gridRect.x;
  const sliderW = gridRect.width;

  const group = svgEl("g", { class: "dc-datazoom", style: "cursor:default" });
  group.setAttribute("pointer-events", "all");

  // Background track
  const track = svgEl("rect", {
    x: sliderX,
    y: sliderY,
    width: sliderW,
    height: sliderH,
    rx: 3,
    fill: trackColor,
    opacity: 0.5,
  });
  group.appendChild(track);

  // Selection fill
  const fill = svgEl("rect", {
    x: sliderX,
    y: sliderY,
    width: sliderW,
    height: sliderH,
    rx: 3,
    fill: fillColor,
    opacity: 0.8,
  });
  group.appendChild(fill);

  // Left handle
  const leftHandle = svgEl("rect", {
    x: sliderX,
    y: sliderY,
    width: HANDLE_W,
    height: sliderH,
    rx: 2,
    fill: handleColor,
    style: "cursor:ew-resize",
  });
  group.appendChild(leftHandle);

  // Right handle
  const rightHandle = svgEl("rect", {
    x: sliderX + sliderW - HANDLE_W,
    y: sliderY,
    width: HANDLE_W,
    height: sliderH,
    rx: 2,
    fill: handleColor,
    style: "cursor:ew-resize",
  });
  group.appendChild(rightHandle);

  // Grip lines on handles
  for (const offsetX of [2, 5]) {
    for (const side of ["left", "right"]) {
      const baseX = side === "left" ? sliderX : sliderX + sliderW - HANDLE_W;
      const line = svgEl("line", {
        x1: baseX + offsetX,
        y1: sliderY + 8,
        x2: baseX + offsetX,
        y2: sliderY + sliderH - 8,
        stroke: "#fff",
        "stroke-width": 1,
        opacity: 0.6,
      });
      group.appendChild(line);
    }
  }

  svg.appendChild(group);

  let current = { ...state };

  function refresh(): void {
    const startX = sliderX + (current.start / 100) * sliderW;
    const endX = sliderX + (current.end / 100) * sliderW;
    fill.setAttribute("x", String(startX));
    fill.setAttribute("width", String(Math.max(0, endX - startX)));
    leftHandle.setAttribute("x", String(startX - HANDLE_W / 2));
    rightHandle.setAttribute("x", String(endX - HANDLE_W / 2));
  }
  refresh();

  // Drag logic
  type DragMode = "left" | "right" | "pan" | null;
  let dragMode: DragMode = null;
  let dragStartX = 0;
  let dragStartState: DataZoomState = { start: 0, end: 100 };

  function pct(clientX: number): number {
    const svgRect = svg.getBoundingClientRect();
    const px = clientX - svgRect.left - sliderX;
    return Math.max(0, Math.min(100, (px / sliderW) * 100));
  }

  function onMousedown(e: MouseEvent): void {
    const svgRect = svg.getBoundingClientRect();
    const px = e.clientX - svgRect.left;
    const leftX = sliderX + (current.start / 100) * sliderW;
    const rightX = sliderX + (current.end / 100) * sliderW;

    if (Math.abs(px - leftX) <= 10) dragMode = "left";
    else if (Math.abs(px - rightX) <= 10) dragMode = "right";
    else if (px > leftX && px < rightX) dragMode = "pan";
    else return;

    dragStartX = e.clientX;
    dragStartState = { ...current };
    e.preventDefault();
  }

  function onMousemove(e: MouseEvent): void {
    if (!dragMode) return;
    const delta = ((e.clientX - dragStartX) / sliderW) * 100;

    if (dragMode === "left") {
      current.start = Math.max(
        0,
        Math.min(dragStartState.start + delta, current.end - 1),
      );
    } else if (dragMode === "right") {
      current.end = Math.max(
        current.start + 1,
        Math.min(100, dragStartState.end + delta),
      );
    } else {
      const span = dragStartState.end - dragStartState.start;
      current.start = Math.max(
        0,
        Math.min(dragStartState.start + delta, 100 - span),
      );
      current.end = current.start + span;
    }
    refresh();
    onChange({ ...current });
  }

  function onMouseup(): void {
    dragMode = null;
  }

  group.addEventListener("mousedown", onMousedown as EventListener);
  document.addEventListener("mousemove", onMousemove);
  document.addEventListener("mouseup", onMouseup);

  return {
    cleanup() {
      group.removeEventListener("mousedown", onMousedown as EventListener);
      document.removeEventListener("mousemove", onMousemove);
      document.removeEventListener("mouseup", onMouseup);
      group.remove();
    },
    update(s: DataZoomState) {
      current = { ...s };
      refresh();
    },
  };
}

// Render all dataZoom sliders and return cleanup + state accessors
export function setupDataZoom(
  svg: SVGSVGElement,
  dataZoom: DataZoomOption[],
  gridRect: ChartRect,
  svgWidth: number,
  svgHeight: number,
  onZoom: (xAxisIndex: number, state: DataZoomState) => void,
): () => void {
  const old = svg.querySelectorAll(".dc-datazoom");
  old.forEach((el) => el.remove());

  const handles: SliderHandle[] = [];

  for (const dz of dataZoom) {
    if (dz.type === "inside") continue; // inside zoom handled separately
    const slider = dz as DataZoomSliderOption;
    const xIndex =
      typeof slider.xAxisIndex === "number" ? slider.xAxisIndex : 0;
    const state: DataZoomState = {
      start: slider.start ?? 0,
      end: slider.end ?? 100,
    };
    const handle = createDataZoomSlider(
      svg,
      slider,
      gridRect,
      svgWidth,
      svgHeight,
      state,
      (s) => onZoom(xIndex, s),
    );
    handles.push(handle);
  }

  return () => handles.forEach((h) => h.cleanup());
}

// Inside zoom: handle wheel events on container
export function setupInsideZoom(
  container: HTMLElement,
  dataZoom: DataZoomOption[],
  onZoom: (xAxisIndex: number, state: DataZoomState) => void,
  getState: (xAxisIndex: number) => DataZoomState,
): () => void {
  const insideZooms = dataZoom.filter((dz) => dz.type === "inside");
  if (insideZooms.length === 0) return () => {};

  function onWheel(e: WheelEvent): void {
    e.preventDefault();
    for (const dz of insideZooms) {
      const xIndex = typeof dz.xAxisIndex === "number" ? dz.xAxisIndex : 0;
      const state = getState(xIndex);
      const span = state.end - state.start;
      const delta = e.deltaY > 0 ? 5 : -5;
      const newSpan = Math.max(10, Math.min(100, span + delta));
      const center = (state.start + state.end) / 2;
      const newStart = Math.max(0, center - newSpan / 2);
      const newEnd = Math.min(100, newStart + newSpan);
      onZoom(xIndex, { start: newStart, end: newEnd });
    }
  }

  container.addEventListener("wheel", onWheel, { passive: false });
  return () => container.removeEventListener("wheel", onWheel);
}
