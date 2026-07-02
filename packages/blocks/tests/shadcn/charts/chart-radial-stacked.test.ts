// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartRadialStacked } from "../../../src/shadcn/charts/chart-radial-stacked.ts";

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

describe("chartRadialStacked", () => {
  it("renders a working demo tree with zero args: card, two stacked segments, and a centered total", () => {
    const { host } = render(chartRadialStacked() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe("Radial Chart - Stacked");
    expect(host.querySelectorAll("svg path")).toHaveLength(2);
    // 682 + 419 = 1101, formatted with a thousands separator.
    expect(host.querySelector("h2")?.textContent).toBe("1,101");
    expect(host.querySelector("footer")?.textContent).toContain("Trending up by 5.2%");
  });

  it("accepts custom segments and sums the total", () => {
    const { host } = render(
      chartRadialStacked({
        segments: [
          { key: "a", label: "A", value: 30 },
          { key: "b", label: "B", value: 20 },
          { key: "c", label: "C", value: 10 },
        ],
      }) as DomphyElement,
    );
    expect(host.querySelectorAll("svg path")).toHaveLength(3);
    expect(host.querySelector("h2")?.textContent).toBe("60");
  });
});
