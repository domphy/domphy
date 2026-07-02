// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartPieSimple } from "../../../src/shadcn/charts/chart-pie-simple.js";

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

    wedges[0].dispatchEvent(new MouseEvent("mouseenter", { bubbles: true, clientX: 10, clientY: 10 }));
    flushSync();
    expect(host.textContent).toContain("Alpha");

    wedges[0].dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    flushSync();
  });
});
