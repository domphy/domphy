// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { chartRadialSimple } from "../../../src/shadcn/charts/chart-radial-simple.ts";

vi.setConfig({ testTimeout: 20000 });

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
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

afterEach(() => {
  document.body.innerHTML = "";
});

describe("chartRadialSimple", () => {
  it("renders a working demo tree with zero args: card, five ring arcs, and trend footer", () => {
    const { host } = render(chartRadialSimple() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe("Radial Chart");
    expect(host.querySelector("svg")).toBeTruthy();
    expect(host.querySelectorAll("svg path")).toHaveLength(5);
    // One background-track circle per ring.
    expect(host.querySelectorAll("svg circle")).toHaveLength(5);
    expect(host.querySelector("footer")?.textContent).toContain(
      "Trending up by 5.2%",
    );
  });

  it("accepts custom data/title/trend props", () => {
    const { host } = render(
      chartRadialSimple({
        title: "Channel Sessions",
        data: [
          { key: "a", label: "A", value: 10 },
          { key: "b", label: "B", value: 20 },
        ],
        trendText: "Down 3.1% this quarter",
        trendDirection: "down",
      }) as DomphyElement,
    );
    expect(host.querySelector("h3")?.textContent).toBe("Channel Sessions");
    expect(host.querySelectorAll("svg path")).toHaveLength(2);
    expect(host.querySelector("footer")?.textContent).toContain("Down 3.1%");
  });

  it("still binds the tooltip container after an ancestor re-render reuses the plot", () => {
    const { host, remount } = renderInReactiveParent(
      () => chartRadialSimple() as DomphyElement,
    );
    const container = host.querySelector("svg")!.parentElement as HTMLElement;
    const arc = host.querySelector("svg path") as SVGPathElement;
    expect(container).toBeTruthy();
    expect(arc).toBeTruthy();
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

    arc.dispatchEvent(
      new MouseEvent("mouseenter", {
        bubbles: true,
        clientX: 80,
        clientY: 90,
      }),
    );
    flushSync();
    expect(rect).toHaveBeenCalled();
    expect(host.textContent).toContain("Organic Search");

    remount();
    expect(host.querySelector("svg")!.parentElement).toBe(container);
    const reusedArc = host.querySelector("svg path") as SVGPathElement;
    rect.mockClear();

    reusedArc.dispatchEvent(
      new MouseEvent("mouseenter", {
        bubbles: true,
        clientX: 80,
        clientY: 90,
      }),
    );
    flushSync();
    // Generation-2 tooltip used to keep `container === null` (`_onMount`
    // does not re-run) so positionFromEvent never read the reused node.
    expect(rect).toHaveBeenCalled();
    expect(host.textContent).toContain("Organic Search");
  });
});
