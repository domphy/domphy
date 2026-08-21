// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { ChartEngine } from "../src/engine.ts";
import { closeOverlayPass } from "../src/overlay/groups.ts";
import { renderLegend } from "../src/overlay/legend.ts";
import { renderTitle } from "../src/overlay/title.ts";
import type { ChartOption, LegendOption, SeriesOption } from "../src/types.ts";

function makeSvg(width = 400, height = 300): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  document.body.appendChild(svg);
  return svg;
}

function makeEngine(width = 400, height = 300): ChartEngine {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const engine = new ChartEngine(container);
  (engine as any).device = {
    beginRenderPass: () => ({ end() {} }),
    submit() {},
  };
  engine.setSize(width, height);
  return engine;
}

const SERIES: SeriesOption[] = [
  { type: "line", name: "s1", data: [1, 2] },
  { type: "line", name: "s2", data: [3, 4] },
];

afterEach(() => {
  document.body.innerHTML = "";
});

describe("renderTitle: unique groups per index", () => {
  // Regression: querySelector(".dc-title").remove() wiped the previous group
  // on every call, so an option.title array only kept the last entry.
  it("keeps every title when called once per array entry (engine loop)", () => {
    const svg = makeSvg();
    renderTitle(svg, { text: "Main" });
    renderTitle(svg, { text: "Subtitle", top: 40 });

    const groups = [...svg.querySelectorAll(".dc-title > g")];
    expect(svg.querySelectorAll(".dc-title")).toHaveLength(1);
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.getAttribute("data-index"))).toEqual(["0", "1"]);
    expect(groups.map((g) => g.textContent)).toEqual(["Main", "Subtitle"]);
  });

  it("replaces only the matching index on an explicit re-render", () => {
    const svg = makeSvg();
    renderTitle(svg, { text: "A" }, 0);
    renderTitle(svg, { text: "B" }, 1);
    renderTitle(svg, { text: "A2" }, 0);

    const groups = [...svg.querySelectorAll(".dc-title > g")];
    expect(groups).toHaveLength(2);
    const byIndex = Object.fromEntries(
      groups.map((g) => [g.getAttribute("data-index"), g.textContent]),
    );
    expect(byIndex).toEqual({ "0": "A2", "1": "B" });
  });

  it("a new auto-index pass drops leftover higher-index titles", () => {
    const svg = makeSvg();
    renderTitle(svg, { text: "A" });
    renderTitle(svg, { text: "B" });
    closeOverlayPass(svg);
    renderTitle(svg, { text: "Only" });

    expect(svg.querySelectorAll(".dc-title > g")).toHaveLength(1);
    expect(svg.querySelector(".dc-title")!.textContent).toBe("Only");
  });
});

describe("renderLegend: unique groups per index", () => {
  it("keeps every legend when called once per array entry (engine loop)", () => {
    const svg = makeSvg();
    const hidden = new Set<string>();
    renderLegend(
      svg,
      { data: ["s1"], top: 0 } as LegendOption,
      SERIES,
      hidden,
      () => {},
    );
    renderLegend(
      svg,
      { data: ["s2"], bottom: 0 } as LegendOption,
      SERIES,
      hidden,
      () => {},
    );

    const groups = [...svg.querySelectorAll(".dc-legend > g")];
    expect(svg.querySelectorAll(".dc-legend")).toHaveLength(1);
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.getAttribute("data-index"))).toEqual(["0", "1"]);
    const labels = [...svg.querySelectorAll(".dc-legend text")].map(
      (t) => t.textContent,
    );
    expect(labels).toEqual(["s1", "s2"]);
  });

  it("replaces only the matching index on an explicit re-render", () => {
    const svg = makeSvg();
    const hidden = new Set<string>();
    renderLegend(
      svg,
      { data: ["s1"] } as LegendOption,
      SERIES,
      hidden,
      () => {},
      0,
    );
    renderLegend(
      svg,
      { data: ["s2"] } as LegendOption,
      SERIES,
      hidden,
      () => {},
      1,
    );
    renderLegend(
      svg,
      { data: ["s1-b"] } as LegendOption,
      SERIES,
      hidden,
      () => {},
      0,
    );

    const groups = [...svg.querySelectorAll(".dc-legend > g")];
    expect(groups).toHaveLength(2);
    const labels = Object.fromEntries(
      groups.map((g) => [
        g.getAttribute("data-index"),
        g.querySelector("text")?.textContent,
      ]),
    );
    expect(labels).toEqual({ "0": "s1-b", "1": "s2" });
  });

  it("querySelector('.dc-legend').remove() drops every item (engine empty wipe)", () => {
    const svg = makeSvg();
    const hidden = new Set<string>();
    renderLegend(
      svg,
      { data: ["s1"] } as LegendOption,
      SERIES,
      hidden,
      () => {},
    );
    renderLegend(
      svg,
      { data: ["s2"] } as LegendOption,
      SERIES,
      hidden,
      () => {},
    );
    expect(svg.querySelectorAll(".dc-legend > g")).toHaveLength(2);

    svg.querySelector(".dc-legend")?.remove();
    expect(svg.querySelector(".dc-legend")).toBeNull();
    expect(svg.querySelectorAll(".dc-legend > g")).toHaveLength(0);
  });
});

describe("ChartEngine title/legend arrays", () => {
  const base: ChartOption = {
    xAxis: { type: "category", data: ["a", "b"] },
    yAxis: { type: "value" },
    series: SERIES,
  };

  it("renders every title and legend in an option array", () => {
    const engine = makeEngine();
    engine.setOption({
      ...base,
      title: [{ text: "Main" }, { text: "Side", left: "right" }],
      legend: [
        { data: ["s1"], top: 0 },
        { data: ["s2"], bottom: 0 },
      ],
    });

    expect(document.querySelectorAll(".dc-title > g")).toHaveLength(2);
    expect(document.querySelectorAll(".dc-legend > g")).toHaveLength(2);
    expect(
      [...document.querySelectorAll(".dc-title text")].map(
        (t) => t.textContent,
      ),
    ).toEqual(["Main", "Side"]);
    expect(
      [...document.querySelectorAll(".dc-legend text")].map(
        (t) => t.textContent,
      ),
    ).toEqual(["s1", "s2"]);

    engine.destroy();
  });

  it("does not duplicate groups when render() runs again on the same option", () => {
    const engine = makeEngine();
    engine.setOption({
      ...base,
      title: [{ text: "Main" }, { text: "Side", top: 40 }],
      legend: [{ data: ["s1"] }, { data: ["s2"], bottom: 0 }],
    });
    engine.render();

    expect(document.querySelectorAll(".dc-title > g")).toHaveLength(2);
    expect(document.querySelectorAll(".dc-legend > g")).toHaveLength(2);

    engine.destroy();
  });

  it("drops leftover groups when the next option has fewer entries", () => {
    const engine = makeEngine();
    engine.setOption({
      ...base,
      title: [{ text: "Main" }, { text: "Side", top: 40 }],
      legend: [{ data: ["s1"] }, { data: ["s2"], bottom: 0 }],
    });
    engine.setOption({
      ...base,
      title: { text: "Only" },
      legend: { data: ["s1"] },
    });

    expect(document.querySelectorAll(".dc-title > g")).toHaveLength(1);
    expect(document.querySelector(".dc-title")!.textContent).toBe("Only");
    expect(document.querySelectorAll(".dc-legend > g")).toHaveLength(1);
    expect(document.querySelector(".dc-legend text")!.textContent).toBe("s1");

    engine.destroy();
  });
});
