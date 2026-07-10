// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartRadialSimple } from "../../../src/shadcn/charts/chart-radial-simple.ts";

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
});
