// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { shineBorder } from "../../../src/magicui/effects/shineBorder.ts";

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

describe("shineBorder", () => {
  it("renders a working demo card with a rotating gradient ring", () => {
    const { host } = render(shineBorder() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe("Shine Border");
    const svg = host.querySelector("svg");
    expect(svg).toBeTruthy();
    // Core ring + blurred halo duplicate, both full (non-dashed) rings.
    const rects = svg!.querySelectorAll("rect");
    expect(rects).toHaveLength(2);
    for (const rect of Array.from(rects)) {
      expect(rect.getAttribute("stroke-dasharray")).toBeNull();
    }
    // The rotation is driven by a native SMIL animateTransform, not JS.
    expect(svg!.querySelector("animateTransform")).toBeTruthy();
  });

  it("emits one gradient stop per configured color, plus a seamless-loop repeat", () => {
    const { host } = render(shineBorder({ colors: ["primary", "warning"] }) as DomphyElement);
    const stops = host.querySelectorAll("stop");
    expect(stops).toHaveLength(3);
    expect(stops[0].getAttribute("offset")).toBe("0%");
    expect(stops[2].getAttribute("offset")).toBe("100%");
  });
});
