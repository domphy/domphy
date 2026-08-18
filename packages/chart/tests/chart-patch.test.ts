// @vitest-environment jsdom

import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChartEngine } from "../src/engine.ts";
import { chart } from "../src/patch.ts";
import type { ChartOption } from "../src/types.ts";

function stubEnvironment() {
  if (!(globalThis as any).ResizeObserver) {
    (globalThis as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  // jsdom reports zero-size rects; the patch only applies the option once the
  // container has a real size.
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    width: 400,
    height: 300,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 400,
    bottom: 300,
    toJSON: () => ({}),
  } as DOMRect);
}

function mockEngine() {
  const initSpy = vi
    .spyOn(ChartEngine.prototype, "init")
    .mockResolvedValue(undefined);
  const setOptionSpy = vi
    .spyOn(ChartEngine.prototype, "setOption")
    .mockImplementation(() => {});
  vi.spyOn(ChartEngine.prototype, "setSize").mockImplementation(() => {});
  vi.spyOn(ChartEngine.prototype, "destroy").mockImplementation(() => {});
  return { initSpy, setOptionSpy };
}

function makeOption(data: number[]): ChartOption {
  return {
    xAxis: { type: "category", data: ["A", "B"] },
    yAxis: { type: "value" },
    series: [{ type: "bar", data }],
  };
}

beforeEach(() => {
  stubEnvironment();
});

afterEach(() => {
  document.documentElement.removeAttribute("data-theme");
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("chart() patch behavior lifecycle", () => {
  // Regression: optionState used to be captured in the _onMount closure, so a
  // reactive parent re-running chart() with a fresh inline option object minted
  // a State the engine never subscribed to — the chart silently stopped
  // updating. The engine now lives in a behavior() instance and later
  // generations route their option into update() → engine.setOption().
  it("keeps updating when a reactive parent re-runs chart() with a fresh inline option", async () => {
    const { initSpy, setOptionSpy } = mockEngine();

    const host = document.createElement("div");
    document.body.appendChild(host);

    const data = toState([1, 2]);
    // The chart host is produced by a reactive parent: when `data` changes,
    // the content function re-runs, chart() is called again with a NEW inline
    // option object, and reconciliation reuses the SAME DOM node (via _key).
    const App = {
      div: (listener: any) => [
        {
          div: null,
          _key: "chart-host",
          style: { width: "400px", height: "300px" },
          $: [chart(makeOption(data.get(listener)))],
        },
      ],
    };

    const node = new ElementNode(App as any);
    node.render(host);

    // Let init().then(applyOption) microtasks run.
    await Promise.resolve();
    await Promise.resolve();

    expect(initSpy).toHaveBeenCalledTimes(1);
    expect(setOptionSpy).toHaveBeenCalledTimes(1);
    expect(setOptionSpy.mock.calls[0][0].series).toEqual([
      { type: "bar", data: [1, 2] },
    ]);

    // Reactive parent re-renders → chart() factory runs again with a NEW
    // inline option object on the SAME reused DOM node.
    data.set([3, 4]);
    flushSync();
    await Promise.resolve();
    await Promise.resolve();

    // Still one engine (attach ran once), but the new generation's option
    // was routed into it via behavior update().
    expect(initSpy).toHaveBeenCalledTimes(1);
    const lastCall =
      setOptionSpy.mock.calls[setOptionSpy.mock.calls.length - 1];
    expect(lastCall[0].series).toEqual([{ type: "bar", data: [3, 4] }]);

    node.remove();
  });

  it("re-renders when data-theme flips on document.documentElement", async () => {
    mockEngine();
    const renderSpy = vi
      .spyOn(ChartEngine.prototype, "render")
      .mockImplementation(() => {});

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

    expect(renderSpy).not.toHaveBeenCalled();

    // applySystemTheme() flips the theme by setting data-theme on <html>.
    document.documentElement.setAttribute("data-theme", "dark");
    // MutationObserver callbacks are delivered as a task, not a microtask.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(renderSpy).toHaveBeenCalled();

    node.remove();
  });

  it("does not setOption when the node is removed before init() resolves", async () => {
    let resolveInit: () => void = () => {};
    vi.spyOn(ChartEngine.prototype, "init").mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveInit = resolve;
        }),
    );
    const setOptionSpy = vi
      .spyOn(ChartEngine.prototype, "setOption")
      .mockImplementation(() => {});
    vi.spyOn(ChartEngine.prototype, "setSize").mockImplementation(() => {});
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

    // Removed while init() is still pending.
    node.remove();
    resolveInit();
    await Promise.resolve();
    await Promise.resolve();

    expect(setOptionSpy).not.toHaveBeenCalled();
  });

  // Regression: overflow:hidden on the host clipped the absolutely-positioned
  // tooltip (and overflowing SVG chrome). The host stays position:relative
  // for the overlay stack; overflow is visible so the tooltip can extend.
  it("does not clip overflowing tooltip chrome with overflow:hidden", () => {
    const patch = chart(makeOption([1, 2]));
    expect(patch.style?.overflow).toBe("visible");
    expect(patch.style?.position).toBe("relative");
  });
});
