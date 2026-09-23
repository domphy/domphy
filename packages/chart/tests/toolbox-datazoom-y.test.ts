// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import type { ToolboxHost } from "../src/overlay/toolbox.ts";
import { renderToolbox } from "../src/overlay/toolbox.ts";
import type { ToolboxOption } from "../src/types.ts";

// Truth source: ECharts' toolbox dataZoom feature (feature/DataZoom.js) does
// a 2D rectangle select and defaults to controlling BOTH x and y axes when
// neither xAxisIndex nor yAxisIndex is set to "none"/false; setting one of
// them to "none"/false zooms only the other axis. Before this fix the
// rectangle select only ever read the horizontal drag distance — the
// engine's y-zoom coordinate math (coord/grid.ts buildScale) already
// supported a y zoom window, nothing ever produced one.
function pointerEvent(
  type: string,
  clientX: number,
  clientY: number,
): MouseEvent {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
  });
}

const PLOT_RECT = { x: 50, y: 20, width: 300, height: 200 };

function makeHost(): {
  host: ToolboxHost;
  setZoomWindow: ReturnType<typeof vi.fn>;
} {
  const container = document.createElement("div");
  document.body.appendChild(container);
  container.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      right: 400,
      bottom: 300,
      width: 400,
      height: 300,
      x: 0,
      y: 0,
      toJSON() {},
    }) as DOMRect;
  const setZoomWindow = vi.fn();
  const host: ToolboxHost = {
    container,
    canvas: document.createElement("canvas"),
    svgLayers: [],
    width: 400,
    height: 300,
    getOriginalOption: () => ({}),
    getCurrentOption: () => ({}),
    applyOption: () => {},
    restore: () => {},
    getPlotRect: () => PLOT_RECT,
    setZoomWindow,
  };
  return { host, setZoomWindow };
}

function clickZoomButton(container: HTMLElement) {
  const button = container.querySelector<HTMLButtonElement>(
    'button[aria-label="Zoom"]',
  );
  button?.click();
}

// `activate()` binds pointerdown on its own crosshair-cursor selection
// layer (not document), then pointermove/pointerup on document for the
// rest of the drag — mirrors the pointer flow a real rubber-band drag uses.
function drag(
  container: HTMLElement,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
) {
  const layer = Array.from(
    container.querySelectorAll<HTMLDivElement>("div"),
  ).find((el) => el.style.cursor === "crosshair");
  if (!layer)
    throw new Error("dataZoom selection layer not found — did activate() run?");
  layer.dispatchEvent(pointerEvent("pointerdown", startX, startY));
  document.dispatchEvent(pointerEvent("pointermove", endX, endY));
  document.dispatchEvent(pointerEvent("pointerup", endX, endY));
}

describe("toolbox dataZoom rectangle select — x/y windows (ECharts feature/DataZoom.js semantics)", () => {
  it("computes both x and y windows for a 2D drag with neither axis disabled", () => {
    const { host, setZoomWindow } = makeHost();
    const option: ToolboxOption = { feature: { dataZoom: {} } };
    const cleanup = renderToolbox(option, host);
    clickZoomButton(host.container);
    drag(host.container, 100, 50, 200, 150);
    cleanup();

    expect(setZoomWindow).toHaveBeenCalledTimes(1);
    const window = setZoomWindow.mock.calls[0][0];
    // x: (value-50)/300*100
    expect(window.x.start).toBeCloseTo(((100 - 50) / 300) * 100, 5);
    expect(window.x.end).toBeCloseTo(((200 - 50) / 300) * 100, 5);
    // y: low value at the BOTTOM (pixel y = rect.y+rect.height = 220), high
    // value at the TOP (pixel y = rect.y = 20) — pixel y=150 (closer to the
    // bottom) is the lower percent, pixel y=50 (closer to the top) the higher.
    expect(window.y.start).toBeCloseTo(((150 - 220) / (20 - 220)) * 100, 5);
    expect(window.y.end).toBeCloseTo(((50 - 220) / (20 - 220)) * 100, 5);
  });

  it("yAxisIndex: 'none' zooms x only — no y window, vertical movement ignored", () => {
    const { host, setZoomWindow } = makeHost();
    const option: ToolboxOption = {
      feature: { dataZoom: { yAxisIndex: "none" } },
    };
    const cleanup = renderToolbox(option, host);
    clickZoomButton(host.container);
    drag(host.container, 100, 50, 200, 250);
    cleanup();

    expect(setZoomWindow).toHaveBeenCalledTimes(1);
    const window = setZoomWindow.mock.calls[0][0];
    expect(window.x).toBeDefined();
    expect(window.y).toBeUndefined();
  });

  it("xAxisIndex: 'none' zooms y only — no x window", () => {
    const { host, setZoomWindow } = makeHost();
    const option: ToolboxOption = {
      feature: { dataZoom: { xAxisIndex: "none" } },
    };
    const cleanup = renderToolbox(option, host);
    clickZoomButton(host.container);
    drag(host.container, 100, 50, 250, 150);
    cleanup();

    expect(setZoomWindow).toHaveBeenCalledTimes(1);
    const window = setZoomWindow.mock.calls[0][0];
    expect(window.y).toBeDefined();
    expect(window.x).toBeUndefined();
  });

  it("both axes disabled: no zoom button rendered, warns instead", () => {
    const { host, setZoomWindow } = makeHost();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const option: ToolboxOption = {
      feature: { dataZoom: { xAxisIndex: "none", yAxisIndex: "none" } },
    };
    const cleanup = renderToolbox(option, host);
    expect(
      host.container.querySelector('button[aria-label="Zoom"]'),
    ).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    cleanup();
    warnSpy.mockRestore();
    expect(setZoomWindow).not.toHaveBeenCalled();
  });
});
