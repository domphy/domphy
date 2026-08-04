// @vitest-environment jsdom

import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChartEngine } from "../src/engine.ts";
import { chart } from "../src/patch.ts";
import type { ChartOption } from "../src/types.ts";

// Regression: the ResizeObserver used to route through engine.setOption(),
// which resets interactive state (legend toggles, dataZoom windows) on every
// resize. A size-only change now re-renders in place; setOption() only runs
// when the option itself changed.

let rect = { width: 400, height: 300 };
let resizeCallback: ResizeObserverCallback | null = null;

beforeEach(() => {
  rect = { width: 400, height: 300 };
  resizeCallback = null;
  (globalThis as any).ResizeObserver = class {
    constructor(cb: ResizeObserverCallback) {
      resizeCallback = cb;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      return {
        width: rect.width,
        height: rect.height,
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: rect.width,
        bottom: rect.height,
        toJSON: () => ({}),
      } as DOMRect;
    },
  );
});

afterEach(() => {
  document.documentElement.removeAttribute("data-theme");
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

function makeOption(data: number[]): ChartOption {
  return {
    xAxis: { type: "category", data: ["A", "B"] },
    yAxis: { type: "value" },
    series: [{ type: "bar", data }],
  };
}

describe("chart() patch resize handling", () => {
  it("re-renders on resize without re-setting the option (interactive state survives)", async () => {
    vi.spyOn(ChartEngine.prototype, "init").mockResolvedValue(undefined);
    const setOptionSpy = vi
      .spyOn(ChartEngine.prototype, "setOption")
      .mockImplementation(() => {});
    const setSizeSpy = vi
      .spyOn(ChartEngine.prototype, "setSize")
      .mockImplementation(() => {});
    const renderSpy = vi
      .spyOn(ChartEngine.prototype, "render")
      .mockImplementation(() => {});
    vi.spyOn(ChartEngine.prototype, "destroy").mockImplementation(() => {});

    const host = document.createElement("div");
    document.body.appendChild(host);

    const App = {
      div: null,
      style: { width: "400px", height: "300px" },
      $: [chart(makeOption([1, 2]))],
    };
    const node = new ElementNode(App as any);
    node.render(host);
    await Promise.resolve();
    await Promise.resolve();

    expect(setOptionSpy).toHaveBeenCalledTimes(1);
    expect(renderSpy).not.toHaveBeenCalled();

    // Simulate a real resize: the container grows, the observer fires.
    rect = { width: 500, height: 300 };
    resizeCallback?.([] as any, {} as any);

    expect(setSizeSpy).toHaveBeenCalledWith(500, 300);
    // setOption must NOT run again — it would wipe legend/dataZoom state.
    expect(setOptionSpy).toHaveBeenCalledTimes(1);
    expect(renderSpy).toHaveBeenCalledTimes(1);

    node.remove();
  });

  it("still re-sets the option when the option state actually changes", async () => {
    vi.spyOn(ChartEngine.prototype, "init").mockResolvedValue(undefined);
    const setOptionSpy = vi
      .spyOn(ChartEngine.prototype, "setOption")
      .mockImplementation(() => {});
    vi.spyOn(ChartEngine.prototype, "setSize").mockImplementation(() => {});
    vi.spyOn(ChartEngine.prototype, "render").mockImplementation(() => {});
    vi.spyOn(ChartEngine.prototype, "destroy").mockImplementation(() => {});

    const host = document.createElement("div");
    document.body.appendChild(host);

    const optionState = toState(makeOption([1, 2]));
    const App = {
      div: null,
      style: { width: "400px", height: "300px" },
      $: [chart(optionState)],
    };
    const node = new ElementNode(App as any);
    node.render(host);
    await Promise.resolve();
    await Promise.resolve();

    expect(setOptionSpy).toHaveBeenCalledTimes(1);

    optionState.set(makeOption([3, 4]));
    flushSync();
    await Promise.resolve();

    expect(setOptionSpy).toHaveBeenCalledTimes(2);
    expect(setOptionSpy.mock.calls[1][0].series).toEqual([
      { type: "bar", data: [3, 4] },
    ]);

    node.remove();
  });
});
