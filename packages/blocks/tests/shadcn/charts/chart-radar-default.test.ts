// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { chartRadarDefault } from "../../../src/shadcn/charts/chart-radar-default.js";

vi.setConfig({ testTimeout: 20000 });

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ElementNode(app).render(host);
  return { host };
}

function renderInReactiveParent(factory: () => DomphyElement) {
  const refresh = toState(0);
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ElementNode({
    div: (listener: unknown) => {
      (refresh.get as (l: unknown) => number)(listener);
      return [factory()];
    },
  } as DomphyElement).render(host);
  flushSync();
  return {
    host,
    remount: () => {
      refresh.set(refresh.get() + 1);
      flushSync();
    },
  };
}

function mockPlotRect(plot: HTMLElement) {
  return vi.spyOn(plot, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    bottom: 200,
    right: 200,
    width: 200,
    height: 200,
    toJSON: () => ({}),
  } as DOMRect);
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("chartRadarDefault", () => {
  it("renders a working demo tree with zero args: centered header, one data polygon, six month labels, trend footer", () => {
    const { host } = render(chartRadarDefault() as DomphyElement);

    expect(host.querySelector("h3")?.textContent).toBe("Radar Chart");
    expect(host.querySelector("svg")).toBeTruthy();
    // One data-series outline (the only <polygon> carrying a fill-opacity attribute —
    // the polygon grid's own ring lines don't set one).
    expect(host.querySelectorAll("svg polygon[fill-opacity]").length).toBe(1);
    expect(host.querySelectorAll("svg text").length).toBe(6);
    expect(host.textContent).toContain("January");
    expect(host.querySelector("footer")?.textContent).toContain(
      "Trending up by 5.2%",
    );
  });

  it("accepts custom data/title/trend props", () => {
    const { host } = render(
      chartRadarDefault({
        title: "Channel Reach",
        data: [
          { category: "Q1", value: 40 },
          { category: "Q2", value: 55 },
          { category: "Q3", value: 30 },
        ],
        series: [{ key: "value", label: "Reach", color: "info" }],
        trendText: "Down 3.1% this quarter",
        trendDirection: "down",
      }) as DomphyElement,
    );

    expect(host.querySelector("h3")?.textContent).toBe("Channel Reach");
    expect(host.querySelectorAll("svg text").length).toBe(3);
    expect(host.querySelector("footer")?.textContent).toContain("Down 3.1%");
  });

  it("still resolves hover after an ancestor re-render reuses the plot", () => {
    const { host, remount } = renderInReactiveParent(
      () => chartRadarDefault() as DomphyElement,
    );
    const plot = host.querySelector("svg")!.parentElement as HTMLElement;
    expect(plot).toBeTruthy();
    const rect = mockPlotRect(plot);

    plot.dispatchEvent(
      new MouseEvent("mousemove", {
        bubbles: true,
        clientX: 100,
        clientY: 20,
      }),
    );
    flushSync();
    expect(rect).toHaveBeenCalled();
    expect(host.textContent).toContain("186");

    remount();
    expect(host.querySelector("svg")!.parentElement).toBe(plot);
    rect.mockClear();

    plot.dispatchEvent(
      new MouseEvent("mousemove", {
        bubbles: true,
        clientX: 100,
        clientY: 20,
      }),
    );
    flushSync();
    // Generation-2 handleHover used to close over a fresh null container
    // (`_onMount` does not re-run on reuse) and no-op before reading the rect.
    expect(rect).toHaveBeenCalled();
    expect(host.textContent).toContain("186");
  });
});
