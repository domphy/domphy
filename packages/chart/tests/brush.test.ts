// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import type {
  BrushHost,
  BrushSelectedParams,
  BrushSeriesPoints,
  BrushSeriesRects,
} from "../src/overlay/brush.ts";
import { renderBrush } from "../src/overlay/brush.ts";

// Truth source: ECharts' brush component (`option.brush`) — a rect/lineX/
// lineY drag over the plot area, `brushMode: "single" | "multiple"`
// (default "single"), `brushType` defaults to "rect" and is active with no
// toolbox required, and a completed drag fires `brushSelected` with
// `{ type: "brushSelected", batch: [{ areas, selected: [{ seriesIndex,
// dataIndex }] }] }`. Before this fix `option.brush` was typed only and
// warned at runtime — no area was ever drawn or selected.
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

const PLOT_RECT = { x: 0, y: 0, width: 200, height: 200 };

function makeHost(
  seriesPoints: BrushSeriesPoints[],
  seriesRects: BrushSeriesRects[] = [],
): {
  host: BrushHost;
  onSelect: ReturnType<typeof vi.fn<(params: BrushSelectedParams) => void>>;
} {
  const container = document.createElement("div");
  document.body.appendChild(container);
  container.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      right: 200,
      bottom: 200,
      width: 200,
      height: 200,
      x: 0,
      y: 0,
      toJSON() {},
    }) as DOMRect;
  const svg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg",
  ) as SVGSVGElement;
  container.appendChild(svg);
  const onSelect = vi.fn<(params: BrushSelectedParams) => void>();
  const host: BrushHost = {
    container,
    svg,
    getPlotRect: () => PLOT_RECT,
    getSeriesPoints: () => seriesPoints,
    getSeriesRects: () => seriesRects,
    onSelect,
  };
  return { host, onSelect };
}

function drag(
  container: HTMLElement,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  const layer = Array.from(
    container.querySelectorAll<HTMLDivElement>("div"),
  ).find((el) => el.style.cursor === "crosshair");
  if (!layer) throw new Error("brush draw layer not found — is a type active?");
  layer.dispatchEvent(pointerEvent("pointerdown", x1, y1));
  document.dispatchEvent(pointerEvent("pointermove", x2, y2));
  document.dispatchEvent(pointerEvent("pointerup", x2, y2));
}

describe("renderBrush — ECharts brush component semantics", () => {
  const seriesPoints: BrushSeriesPoints[] = [
    {
      seriesIndex: 0,
      points: [
        [10, 10], // inside a (10,10)-(90,90) rect
        [50, 50], // inside
        [150, 150], // outside
        null, // NaN datum — never selected
      ],
    },
  ];

  it("brushType defaults to 'rect' and is active with no setActiveType() call", () => {
    const { host, onSelect } = makeHost(seriesPoints);
    renderBrush({}, host);
    drag(host.container, 10, 10, 90, 90);
    expect(onSelect).toHaveBeenCalledTimes(1);
    const params = onSelect.mock.calls[0][0];
    expect(params.type).toBe("brushSelected");
    expect(params.batch[0].selected).toEqual([
      { seriesIndex: 0, dataIndex: [0, 1] },
    ]);
    expect(params.batch[0].areas).toEqual([
      {
        brushType: "rect",
        range: [
          [10, 10],
          [90, 90],
        ],
      },
    ]);
  });

  it("a toolbox-only setup (option undefined) starts INACTIVE — no drag layer until setActiveType()", () => {
    const { host } = makeHost(seriesPoints);
    const controller = renderBrush(undefined, host);
    expect(controller.getActiveType()).toBeNull();
    expect(
      Array.from(host.container.querySelectorAll("div")).some(
        (el) => el.style.cursor === "crosshair",
      ),
    ).toBe(false);
  });

  it("brushMode 'single' (default): a second drag REPLACES the first area", () => {
    const { host, onSelect } = makeHost(seriesPoints);
    renderBrush({}, host);
    drag(host.container, 0, 0, 20, 20); // only point [10,10]
    drag(host.container, 40, 40, 60, 60); // only point [50,50]
    expect(onSelect).toHaveBeenCalledTimes(2);
    const last = onSelect.mock.calls[1][0];
    expect(last.batch[0].areas).toHaveLength(1);
    expect(last.batch[0].selected).toEqual([
      { seriesIndex: 0, dataIndex: [1] },
    ]);
  });

  it("brushMode 'multiple': areas ACCUMULATE, selection is their union", () => {
    const { host, onSelect } = makeHost(seriesPoints);
    renderBrush({ brushMode: "multiple" }, host);
    drag(host.container, 0, 0, 20, 20); // point [10,10]
    drag(host.container, 40, 40, 60, 60); // point [50,50]
    const last = onSelect.mock.calls[1][0];
    expect(last.batch[0].areas).toHaveLength(2);
    expect(last.batch[0].selected).toEqual([
      { seriesIndex: 0, dataIndex: [0, 1] },
    ]);
  });

  it("lineX selects by x range only, ignoring y", () => {
    const { host, onSelect } = makeHost(seriesPoints);
    const controller = renderBrush({}, host);
    controller.setActiveType("lineX");
    drag(host.container, 0, 100, 60, 150); // x in [0,60] — covers [10,10] and [50,50] regardless of y drag span
    const params = onSelect.mock.calls[0][0];
    expect(params.batch[0].areas[0].brushType).toBe("lineX");
    expect(params.batch[0].selected).toEqual([
      { seriesIndex: 0, dataIndex: [0, 1] },
    ]);
  });

  it("lineY selects by y range only, ignoring x", () => {
    const { host, onSelect } = makeHost(seriesPoints);
    const controller = renderBrush({}, host);
    controller.setActiveType("lineY");
    drag(host.container, 100, 0, 150, 60); // y in [0,60]
    const params = onSelect.mock.calls[0][0];
    expect(params.batch[0].areas[0].brushType).toBe("lineY");
    expect(params.batch[0].selected).toEqual([
      { seriesIndex: 0, dataIndex: [0, 1] },
    ]);
  });

  it("clear() removes every area and its drawn rect", () => {
    const { host } = makeHost(seriesPoints);
    const controller = renderBrush({}, host);
    drag(host.container, 0, 0, 90, 90);
    expect(controller.getAreas()).toHaveLength(1);
    expect(host.svg.querySelectorAll(".dc-brush-areas rect")).toHaveLength(1);
    controller.clear();
    expect(controller.getAreas()).toHaveLength(0);
    expect(host.svg.querySelectorAll(".dc-brush-areas rect")).toHaveLength(0);
  });

  it("toggleKeep() flips accumulation mode and returns the new state", () => {
    const { host } = makeHost(seriesPoints);
    const controller = renderBrush({}, host); // default single
    expect(controller.toggleKeep()).toBe(true); // now multiple
    expect(controller.toggleKeep()).toBe(false); // back to single
  });

  it("a drag shorter than the click threshold does not commit an area", () => {
    const { host, onSelect } = makeHost(seriesPoints);
    const controller = renderBrush({}, host);
    drag(host.container, 50, 50, 51, 51); // 1px move
    expect(onSelect).not.toHaveBeenCalled();
    expect(controller.getAreas()).toHaveLength(0);
  });

  it("destroy() tears down the draw layer and the persisted area group", () => {
    const { host } = makeHost(seriesPoints);
    const controller = renderBrush({}, host);
    controller.destroy();
    expect(host.svg.querySelector(".dc-brush-areas")).toBeNull();
    expect(
      Array.from(host.container.querySelectorAll("div")).some(
        (el) => el.style.cursor === "crosshair",
      ),
    ).toBe(false);
  });
});

// Truth source: coord/barPositions.ts's layoutBarSeries()/layoutCandlestickSeries()
// — the SAME geometry gl/BarRenderer.ts draws pixels from (see its "one place
// resolves a bar's fill" comment) — so a rect this test builds from those
// functions is provably "what is actually painted", not a hand-guessed box.
describe("renderBrush — rect hit-testing (bar/candlestick), box-shaped not point-shaped", () => {
  it("a rect area selects a bar whose OWN rect overlaps it, by AABB overlap not containment", () => {
    const seriesRects: BrushSeriesRects[] = [
      {
        seriesIndex: 0,
        rects: [
          { x: 5, y: 5, width: 20, height: 20 }, // fully inside the drag box
          { x: 95, y: 95, width: 20, height: 20 }, // overlaps the drag box's corner only
          { x: 150, y: 150, width: 10, height: 10 }, // fully outside
          null, // NaN datum
        ],
      },
    ];
    const { host, onSelect } = makeHost([], seriesRects);
    renderBrush({}, host);
    drag(host.container, 0, 0, 100, 100);
    const params = onSelect.mock.calls[0][0];
    expect(params.batch[0].selected).toEqual([
      { seriesIndex: 0, dataIndex: [0, 1] },
    ]);
  });

  it("lineX selects a bar rect by x-range overlap only, ignoring y", () => {
    const seriesRects: BrushSeriesRects[] = [
      {
        seriesIndex: 0,
        rects: [{ x: 10, y: 150, width: 20, height: 20 }], // y far outside the drag's y span
      },
    ];
    const { host, onSelect } = makeHost([], seriesRects);
    const controller = renderBrush({}, host);
    controller.setActiveType("lineX");
    drag(host.container, 0, 0, 50, 10); // x in [0,50] covers the rect's x range
    const params = onSelect.mock.calls[0][0];
    expect(params.batch[0].selected).toEqual([
      { seriesIndex: 0, dataIndex: [0] },
    ]);
  });

  it("a rect series and a point series both hit-test against the same brush area", () => {
    const points: BrushSeriesPoints[] = [
      { seriesIndex: 0, points: [[10, 10], [50, 50], [150, 150], null] },
    ];
    const seriesRects: BrushSeriesRects[] = [
      { seriesIndex: 1, rects: [{ x: 5, y: 5, width: 20, height: 20 }] },
    ];
    const { host, onSelect } = makeHost(points, seriesRects);
    renderBrush({}, host);
    drag(host.container, 0, 0, 90, 90);
    const params = onSelect.mock.calls[0][0];
    expect(params.batch[0].selected).toEqual([
      { seriesIndex: 0, dataIndex: [0, 1] },
      { seriesIndex: 1, dataIndex: [0] },
    ]);
  });
});
