// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartRadialText } from "../../../src/shadcn/charts/chart-radial-text.ts";

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

describe("chartRadialText", () => {
  it("renders a working demo tree with zero args: card, one rounded-cap gauge arc, and a centered value", () => {
    const { host } = render(chartRadialText() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe("Radial Chart - Text");
    const arc = host.querySelector("svg path");
    expect(arc).toBeTruthy();
    expect(arc?.getAttribute("stroke-linecap")).toBe("round");
    expect(host.querySelector("h2")?.textContent).toBe("1,125");
    expect(host.querySelector("footer")?.textContent).toContain("Trending up by 5.2%");
  });

  it("accepts a custom value/color", () => {
    const { host } = render(chartRadialText({ value: 7500, color: "success" }) as DomphyElement);
    expect(host.querySelector("h2")?.textContent).toBe("7,500");
  });
});
