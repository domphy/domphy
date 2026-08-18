// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { chartPieSimple } from "../../../src/shadcn/charts/chart-pie-simple.js";

vi.setConfig({ testTimeout: 20000 });

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("chartPieSimple", () => {
  it("renders a working demo with zero arguments", () => {
    const { host } = render(chartPieSimple());

    expect(host.querySelector("svg")).toBeTruthy();
    expect(host.querySelectorAll("svg path").length).toBe(5);
    expect(host.querySelector("h3")?.textContent).toBe("Pie Chart");
    expect(host.querySelector("footer")).toBeTruthy();
  });

  it("renders one wedge per custom data record and updates the tooltip on hover", () => {
    const { host } = render(
      chartPieSimple({
        data: [
          { key: "a", name: "Alpha", value: 10 },
          { key: "b", name: "Beta", value: 20 },
        ],
      }),
    );

    const wedges = host.querySelectorAll("svg path");
    expect(wedges.length).toBe(2);

    wedges[0].dispatchEvent(
      new MouseEvent("mouseenter", { bubbles: true, clientX: 10, clientY: 10 }),
    );
    flushSync();
    expect(host.textContent).toContain("Alpha");

    wedges[0].dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    flushSync();
  });

  it("still positions the tooltip after an ancestor re-render reuses the container", () => {
    const refresh = toState(0);
    const host = document.createElement("div");
    document.body.appendChild(host);
    new ElementNode({
      div: (listener: unknown) => {
        (refresh.get as (l: unknown) => number)(listener);
        return [
          chartPieSimple({
            data: [
              { key: "a", name: "Alpha", value: 10 },
              { key: "b", name: "Beta", value: 20 },
            ],
          }) as DomphyElement,
        ];
      },
    } as DomphyElement).render(host);
    flushSync();

    const container = host.querySelector("svg")!.parentElement as HTMLElement;
    const rect = vi.spyOn(container, "getBoundingClientRect").mockReturnValue({
      x: 40,
      y: 40,
      top: 40,
      left: 40,
      bottom: 240,
      right: 240,
      width: 200,
      height: 200,
      toJSON: () => ({}),
    } as DOMRect);

    (host.querySelector("svg path") as SVGPathElement).dispatchEvent(
      new MouseEvent("mouseenter", {
        bubbles: true,
        clientX: 80,
        clientY: 90,
      }),
    );
    flushSync();
    expect(rect).toHaveBeenCalled();
    expect(host.textContent).toContain("Alpha");

    refresh.set(1);
    flushSync();
    expect(host.querySelector("svg")!.parentElement).toBe(container);
    rect.mockClear();

    (host.querySelector("svg path") as SVGPathElement).dispatchEvent(
      new MouseEvent("mouseenter", {
        bubbles: true,
        clientX: 80,
        clientY: 90,
      }),
    );
    flushSync();
    // Generation-2 `containerRef` used to stay `{ current: null }` because
    // pieChartContainer assigned it only in `_onMount`.
    expect(rect).toHaveBeenCalled();
    expect(host.textContent).toContain("Alpha");
  });
});
