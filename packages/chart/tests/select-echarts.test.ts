// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { ChartEngine } from "../src/engine.ts";
import type { ChartOption, SelectChangedParams } from "../src/types.ts";

// Truth source: the ECharts option/event reference — `series.selectedMode`
// ("single" keeps one selected datum per series, "multiple" toggles freely,
// `false`/absent disables selection) and the `selectchanged` event payload
// (`fromAction`, `selected: [{ seriesIndex, dataIndex: number[] }]`).

function makeEngine(): { engine: ChartEngine; container: HTMLElement } {
  // Each test gets a fresh body: the click below is dispatched on this engine's
  // own container, and a leftover container from an earlier test would swallow
  // it (destroy() removes the chart layers, not the host element).
  document.body.textContent = "";
  const container = document.createElement("div");
  document.body.appendChild(container);
  const engine = new ChartEngine(container);
  (engine as any).device = {
    beginRenderPass: () => ({ end() {} }),
    submit() {},
  };
  engine.setSize(400, 300);
  return { engine, container };
}

function clickAt(container: HTMLElement, [x, y]: [number, number]): void {
  container.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
    }),
  );
}

// Pie geometry in a 400×300 container: centre (200, 150), outer radius
// min(400,300)/2 × 0.7 = 105. Four equal slices from 12 o'clock clockwise, so
// (242, 108) is inside slice 0 and (242, 192) inside slice 1.
const SLICE_0: [number, number] = [242, 108];
const SLICE_1: [number, number] = [242, 192];

const pieOption = (selectedMode: unknown): ChartOption =>
  ({
    series: [
      {
        type: "pie",
        name: "p",
        selectedMode,
        data: [
          { name: "a", value: 1 },
          { name: "b", value: 1 },
          { name: "c", value: 1 },
          { name: "d", value: 1 },
        ],
      },
    ],
  }) as ChartOption;

describe("selectedMode / selectchanged follow the ECharts reference", () => {
  it('"multiple" toggles a datum on and off and reports the whole selection', () => {
    const { engine, container } = makeEngine();
    const events: SelectChangedParams[] = [];
    engine.on("selectchanged", (params) => events.push(params));
    engine.setOption(pieOption("multiple"));

    clickAt(container, SLICE_0);
    expect(engine.getSelectedDataIndices()).toEqual([
      { seriesIndex: 0, dataIndex: [0] },
    ]);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("selectchanged");
    expect(events[0].fromAction).toBe("select");
    expect(events[0].isFromClick).toBe(true);
    expect(events[0].selected).toEqual([{ seriesIndex: 0, dataIndex: [0] }]);

    clickAt(container, SLICE_1);
    expect(engine.getSelectedDataIndices()).toEqual([
      { seriesIndex: 0, dataIndex: [0, 1] },
    ]);

    clickAt(container, SLICE_0);
    expect(events[events.length - 1].fromAction).toBe("unselect");
    expect(engine.getSelectedDataIndices()).toEqual([
      { seriesIndex: 0, dataIndex: [1] },
    ]);
    engine.destroy();
  });

  it('"single" keeps at most one selected datum in the series', () => {
    const { engine, container } = makeEngine();
    engine.setOption(pieOption("single"));

    clickAt(container, SLICE_0);
    clickAt(container, SLICE_1);
    expect(engine.getSelectedDataIndices()).toEqual([
      { seriesIndex: 0, dataIndex: [1] },
    ]);
    engine.destroy();
  });

  it('"series" selects every datum of the series at once', () => {
    const { engine, container } = makeEngine();
    engine.setOption(pieOption("series"));

    clickAt(container, SLICE_0);
    expect(engine.getSelectedDataIndices()).toEqual([
      { seriesIndex: 0, dataIndex: [0, 1, 2, 3] },
    ]);
    clickAt(container, SLICE_1);
    expect(engine.getSelectedDataIndices()).toEqual([]);
    engine.destroy();
  });

  it("no selectedMode means a click selects nothing (ECharts default)", () => {
    const { engine, container } = makeEngine();
    const events: SelectChangedParams[] = [];
    engine.on("selectchanged", (params) => events.push(params));
    engine.setOption(pieOption(undefined));

    clickAt(container, SLICE_0);
    expect(engine.getSelectedDataIndices()).toEqual([]);
    expect(events).toHaveLength(0);
    engine.destroy();
  });

  it("drops a selection whose series no longer exist", () => {
    const { engine, container } = makeEngine();
    engine.setOption(pieOption("multiple"));
    clickAt(container, SLICE_0);
    expect(engine.getSelectedDataIndices()).toHaveLength(1);

    // A different set of series names is a different index space.
    engine.setOption({
      series: [{ type: "pie", name: "other", data: [{ value: 1 }] }],
    } as ChartOption);
    expect(engine.getSelectedDataIndices()).toEqual([]);
    engine.destroy();
  });
});
