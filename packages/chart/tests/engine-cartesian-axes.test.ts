// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { ChartEngine } from "../src/engine.ts";
import type { ChartOption } from "../src/types.ts";

// Regression: cartesianTypes used to omit "pictorialBar" (axes never rendered for it)
// and unconditionally include "lines" (a geo-by-default series), drawing spurious
// default axes over geo-only flow-map charts. Both are fixed in ChartEngine.render().
describe("ChartEngine Cartesian axis gating", () => {
  function makeEngine(): { engine: ChartEngine; overlaysvg: SVGSVGElement } {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const engine = new ChartEngine(container);
    engine.setSize(400, 300);
    // render() only needs beginRenderPass/submit — WebGL renderers stay null
    // without init(), so their render() branches are skipped entirely.
    (engine as any).device = {
      beginRenderPass: () => ({ end() {} }),
      submit() {},
    };
    return { engine, overlaysvg: (engine as any).overlaysvg as SVGSVGElement };
  }

  it("does not render default Cartesian axes for a geo-only lines (flow map) series", () => {
    const { engine, overlaysvg } = makeEngine();
    const option: ChartOption = {
      geo: { map: "world" },
      series: [
        {
          type: "lines",
          data: [{ coords: [[0, 0], [1, 1]] }],
        } as any,
      ],
    };

    engine.setOption(option);

    expect(overlaysvg.querySelector(".dc-axes")).toBeNull();
    engine.destroy();
  });

  it("renders Cartesian axes for a pictorialBar series", () => {
    const { engine, overlaysvg } = makeEngine();
    const option: ChartOption = {
      xAxis: { type: "category", data: ["A", "B"] },
      yAxis: { type: "value" },
      series: [
        {
          type: "pictorialBar",
          data: [1, 2],
        } as any,
      ],
    };

    engine.setOption(option);

    expect(overlaysvg.querySelector(".dc-axes")).not.toBeNull();
    engine.destroy();
  });

  it("renders Cartesian axes for a lines series explicitly marked cartesian2d", () => {
    const { engine, overlaysvg } = makeEngine();
    const option: ChartOption = {
      xAxis: { type: "value" },
      yAxis: { type: "value" },
      series: [
        {
          type: "lines",
          coordinateSystem: "cartesian2d",
          data: [{ coords: [[0, 0], [10, 10]] }],
        } as any,
      ],
    };

    engine.setOption(option);

    expect(overlaysvg.querySelector(".dc-axes")).not.toBeNull();
    engine.destroy();
  });
});
