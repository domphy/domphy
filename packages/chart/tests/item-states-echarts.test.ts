import { describe, expect, it } from "vitest";
import {
  applyItemState,
  createBrushStates,
  createItemStates,
  itemStatesEnabled,
  NORMAL_STATE,
  selectedModeOf,
} from "../src/itemStates.ts";
import type { SeriesOption } from "../src/types.ts";

// Truth source for every case below: the ECharts option reference for the
// emphasis / blur / select states — `emphasis.focus` ("none" | "self" |
// "series"), `emphasis.blurScope` ("coordinateSystem" | "series" | "global"),
// the blur state's default itemStyle.opacity, and `selectedMode`
// ("single" | "multiple" | "series" | false). No expectation here was read off
// this implementation's output.

const bar = (name: string, extra: object = {}): SeriesOption =>
  ({ type: "bar", name, data: [1, 2, 3], ...extra }) as SeriesOption;

describe("emphasis/blur/select follow the ECharts option reference", () => {
  it("costs nothing for an option that declares no state (ECharts: states are opt-in config)", () => {
    expect(itemStatesEnabled([bar("a"), bar("b")])).toBe(false);
    expect(
      itemStatesEnabled([bar("a", { emphasis: { focus: "series" } })]),
    ).toBe(true);
    expect(itemStatesEnabled([bar("a", { selectedMode: "single" })])).toBe(
      true,
    );
    // ECharts: `emphasis.disabled: true` turns the state off entirely.
    expect(
      itemStatesEnabled([bar("a", { emphasis: { disabled: true } })]),
    ).toBe(false);
  });

  it('focus "none" emphasises only the hovered datum and blurs nothing', () => {
    const series = [bar("a", { emphasis: {} }), bar("b")];
    const states = createItemStates({
      series,
      hover: { seriesIndex: 0, dataIndex: 1 },
      focusSeriesIndex: null,
      selected: new Set(),
    });
    expect(states(series[0], 1).name).toBe("emphasis");
    expect(states(series[0], 0).name).toBe("normal");
    expect(states(series[1], 1).name).toBe("normal");
  });

  it('focus "series" emphasises the whole hovered series and blurs the rest of its coordinate system', () => {
    const series = [
      bar("a", { emphasis: { focus: "series" } }),
      bar("b"),
      { type: "pie", name: "p", data: [{ value: 1 }] } as SeriesOption,
    ];
    const states = createItemStates({
      series,
      hover: { seriesIndex: 0, dataIndex: 1 },
      focusSeriesIndex: null,
      selected: new Set(),
    });
    expect(states(series[0], 0).name).toBe("emphasis");
    expect(states(series[0], 2).name).toBe("emphasis");
    expect(states(series[1], 0).name).toBe("blur");
    // Default blurScope "coordinateSystem": the pie is its own system.
    expect(states(series[2], 0).name).toBe("normal");
  });

  it('blurScope "global" blurs across coordinate systems, "series" stays inside the hovered series', () => {
    const globalSeries = [
      bar("a", { emphasis: { focus: "series", blurScope: "global" } }),
      { type: "pie", name: "p", data: [{ value: 1 }] } as SeriesOption,
    ];
    const globalStates = createItemStates({
      series: globalSeries,
      hover: { seriesIndex: 0, dataIndex: 0 },
      focusSeriesIndex: null,
      selected: new Set(),
    });
    expect(globalStates(globalSeries[1], 0).name).toBe("blur");

    const scopedSeries = [
      bar("a", { emphasis: { focus: "self", blurScope: "series" } }),
      bar("b"),
    ];
    const scopedStates = createItemStates({
      series: scopedSeries,
      hover: { seriesIndex: 0, dataIndex: 1 },
      focusSeriesIndex: null,
      selected: new Set(),
    });
    expect(scopedStates(scopedSeries[0], 1).name).toBe("emphasis");
    expect(scopedStates(scopedSeries[0], 0).name).toBe("blur");
    // Another series is outside a "series" blur scope.
    expect(scopedStates(scopedSeries[1], 0).name).toBe("normal");
  });

  it("blur drops opacity to a tenth unless blur.itemStyle.opacity says otherwise", () => {
    const series = [
      bar("a", { emphasis: { focus: "series" } }),
      bar("b"),
      bar("c", { blur: { itemStyle: { opacity: 0.5 } } }),
    ];
    const states = createItemStates({
      series,
      hover: { seriesIndex: 0, dataIndex: 0 },
      focusSeriesIndex: null,
      selected: new Set(),
    });
    expect(states(series[1], 0).opacity).toBeCloseTo(0.1, 10);
    expect(states(series[2], 0).opacity).toBeCloseTo(0.5, 10);
  });

  it("emphasis.itemStyle.color replaces the colour instead of lifting it", () => {
    const withColor = [
      bar("a", { emphasis: { itemStyle: { color: "error" } } }),
    ];
    const plain = [bar("a", { emphasis: {} })];
    const hover = { seriesIndex: 0, dataIndex: 0 };
    const colored = createItemStates({
      series: withColor,
      hover,
      focusSeriesIndex: null,
      selected: new Set(),
    })(withColor[0], 0);
    expect(colored.color).toBe("error");
    expect(colored.lift).toBe(1);
    // With nothing declared, the default emphasis is still visible.
    const lifted = createItemStates({
      series: plain,
      hover,
      focusSeriesIndex: null,
      selected: new Set(),
    })(plain[0], 0);
    expect(lifted.color).toBeUndefined();
    expect(lifted.lift).toBeGreaterThan(1);
  });

  it("a legend highlight emphasises the whole series, unless legendHoverLink is false", () => {
    const series = [bar("a", { emphasis: {} }), bar("b")];
    const states = createItemStates({
      series,
      hover: null,
      focusSeriesIndex: 0,
      selected: new Set(),
    });
    expect(states(series[0], 0).name).toBe("emphasis");
    expect(states(series[0], 2).name).toBe("emphasis");

    const optedOut = [
      bar("a", { emphasis: {}, legendHoverLink: false }),
      bar("b"),
    ];
    const noLink = createItemStates({
      series: optedOut,
      hover: null,
      focusSeriesIndex: 0,
      selected: new Set(),
    });
    expect(noLink(optedOut[0], 0).name).toBe("normal");
  });

  it("selected data stays in the select state and a pie slice offsets by selectedOffset", () => {
    const pie = {
      type: "pie",
      name: "p",
      selectedMode: "single",
      data: [{ value: 1 }, { value: 2 }],
    } as SeriesOption;
    const states = createItemStates({
      series: [pie],
      hover: null,
      focusSeriesIndex: null,
      selected: new Set(["0:1"]),
    });
    expect(states(pie, 1).name).toBe("select");
    // ECharts' documented default for pie.
    expect(states(pie, 1).offset).toBe(10);
    expect(states(pie, 0).name).toBe("normal");
  });

  it("selectedMode normalises the way ECharts documents it", () => {
    expect(selectedModeOf(bar("a"))).toBe(false);
    expect(selectedModeOf(bar("a", { selectedMode: false }))).toBe(false);
    expect(selectedModeOf(bar("a", { selectedMode: true }))).toBe("multiple");
    expect(selectedModeOf(bar("a", { selectedMode: "series" }))).toBe("series");
  });

  it("finds a series' state through the clones the renderers are handed", () => {
    // engine.render() spreads the option twice (palette colour, line stacking)
    // before a renderer sees it, so identity alone would lose the series.
    const series = [bar("a", { emphasis: { focus: "series" } }), bar("b")];
    const clone = { ...series[0] } as SeriesOption;
    const indexOf = new Map<object, number>([
      [series[0] as object, 0],
      [series[1] as object, 1],
      [clone as object, 0],
    ]);
    const states = createItemStates({
      series,
      hover: { seriesIndex: 0, dataIndex: 0 },
      focusSeriesIndex: null,
      selected: new Set(),
      indexOf,
    });
    expect(states(clone, 0).name).toBe("emphasis");
  });

  it("applies the state to a resolved RGBA, clamping the lift at full channel", () => {
    const base: [number, number, number, number] = [0.5, 0.4, 0.2, 1];
    const resolver = {
      css: () => "",
      rgba: () => [0, 0, 0, 1] as const,
    } as any;
    expect(applyItemState(base, NORMAL_STATE, resolver, 0)).toBe(base);

    const lifted = applyItemState(
      base,
      { ...NORMAL_STATE, name: "emphasis", lift: 1.1 },
      resolver,
      0,
    );
    expect(lifted[0]).toBeCloseTo(0.55, 10);

    const clamped = applyItemState(
      [0.95, 0.95, 0.95, 1],
      { ...NORMAL_STATE, name: "emphasis", lift: 1.1 },
      resolver,
      0,
    );
    expect(clamped[0]).toBe(1);

    const blurred = applyItemState(
      base,
      { ...NORMAL_STATE, name: "blur", opacity: 0.1 },
      resolver,
      0,
    );
    expect(blurred[3]).toBeCloseTo(0.1, 10);
  });
});

// Truth source: the ECharts `brush` option reference — a completed drag
// paints brushed-in data with `inBrush` styling (default: unchanged) and
// every other datum in a brushable series with `outOfBrush` styling (default:
// dimmed), both overridable via `option.brush.inBrush`/`outOfBrush.opacity`.
// A line's own stroke (dataIndex -1) counts as "in" when any of its points
// are selected.
describe("createBrushStates — ECharts brush inBrush/outOfBrush", () => {
  const series = { type: "bar", name: "s", data: [1, 2, 3] } as SeriesOption;
  const seriesIndexOf = () => 0;

  it("no brush areas drawn yet — costs nothing, same as no states at all", () => {
    const states = createBrushStates({
      option: undefined,
      hasAreas: false,
      selectedKeys: new Set(),
      brushedSeriesIndices: new Set(),
      seriesIndexOf,
    });
    expect(states(series, 0)).toBe(NORMAL_STATE);
  });

  it("a selected datum gets inBrush (default: full opacity, unchanged)", () => {
    const states = createBrushStates({
      option: undefined,
      hasAreas: true,
      selectedKeys: new Set(["0:1"]),
      brushedSeriesIndices: new Set([0]),
      seriesIndexOf,
    });
    expect(states(series, 1).opacity).toBe(1);
  });

  it("a non-selected datum in a brushable series gets outOfBrush (default: dimmed)", () => {
    const states = createBrushStates({
      option: undefined,
      hasAreas: true,
      selectedKeys: new Set(["0:1"]),
      brushedSeriesIndices: new Set([0]),
      seriesIndexOf,
    });
    const outVisual = states(series, 0);
    expect(outVisual.opacity).toBeLessThan(1);
    expect(outVisual.opacity).toBeGreaterThan(0);
  });

  it("option.brush.inBrush/outOfBrush.opacity override the defaults", () => {
    const states = createBrushStates({
      option: { inBrush: { opacity: 0.5 }, outOfBrush: { opacity: 0.05 } },
      hasAreas: true,
      selectedKeys: new Set(["0:1"]),
      brushedSeriesIndices: new Set([0]),
      seriesIndexOf,
    });
    expect(states(series, 1).opacity).toBe(0.5);
    expect(states(series, 0).opacity).toBe(0.05);
  });

  it("dataIndex -1 (a line's own stroke) is 'in' when any of its points are selected", () => {
    const states = createBrushStates({
      option: undefined,
      hasAreas: true,
      selectedKeys: new Set(["0:2"]),
      brushedSeriesIndices: new Set([0]),
      seriesIndexOf,
    });
    expect(states(series, -1).opacity).toBe(1);
  });

  it("dataIndex -1 is 'out' when the series has no selected points at all", () => {
    const states = createBrushStates({
      option: undefined,
      hasAreas: true,
      selectedKeys: new Set(),
      brushedSeriesIndices: new Set(),
      seriesIndexOf,
    });
    expect(states(series, -1).opacity).toBeLessThan(1);
  });
});
