// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { ChartEngine } from "../src/engine.ts";
import { seriesColor, seriesHex } from "../src/gl/color.ts";
import type { ChartOption } from "../src/types.ts";

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

const OPTION: ChartOption = {
  xAxis: { type: "category", data: ["A", "B"] },
  yAxis: { type: "value" },
  series: [{ type: "bar", name: "s1", data: [1, 2] }],
};

afterEach(() => {
  document.documentElement.removeAttribute("data-theme");
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("theme-aware chart colors", () => {
  it("paints SVG overlay text with var(--…) references, not static light-theme hex", () => {
    const { engine, overlaysvg } = makeEngine();
    engine.setOption(OPTION);

    const text = overlaysvg.querySelector("text");
    expect(text).not.toBeNull();
    // A var(--…) reference resolves at paint time against the nearest
    // [data-theme] ancestor — the SVG layer follows theme flips by itself.
    expect(text!.getAttribute("fill")).toMatch(/^var\(--/);

    engine.destroy();
  });

  it("paints the legend swatch with a var(--…) series color", () => {
    const { engine, overlaysvg } = makeEngine();
    engine.setOption({ ...OPTION, legend: {} });

    const fills = [...overlaysvg.querySelectorAll("[fill]")].map((el) =>
      el.getAttribute("fill"),
    );
    expect(fills.some((fill) => fill?.startsWith("var(--"))).toBe(true);

    engine.destroy();
  });

  it("re-renders after a data-theme flip with colors still var-based (no stale resolution)", () => {
    const { engine, overlaysvg } = makeEngine();
    engine.setOption(OPTION);

    document.documentElement.setAttribute("data-theme", "dark");
    engine.render();

    const text = overlaysvg.querySelector("text");
    expect(text!.getAttribute("fill")).toMatch(/^var\(--/);

    engine.destroy();
  });

  it("seriesColor is the var-ref default; seriesHex stays the static design-time helper", () => {
    expect(seriesColor(0)).toMatch(/^var\(--primary-/);
    expect(seriesHex(0)).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
