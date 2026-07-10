// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { dottedMap } from "../../../src/magicui/core/dottedMap.ts";

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

describe("dottedMap", () => {
  it("renders a working demo tree with zero args: an svg map with land dots and 4 default city markers", () => {
    const { host } = render(dottedMap() as DomphyElement);
    const svg = host.querySelector("svg") as SVGSVGElement;
    expect(svg).toBeTruthy();
    expect(svg.getAttribute("role")).toBe("img");
    // Two top-level layers: the background dot grid and the marker layer.
    expect(svg.querySelectorAll(":scope > g")).toHaveLength(2);
    // Background land-dot layer produced a non-trivial number of dots.
    expect(
      svg.querySelectorAll(":scope > g")[0].querySelectorAll("circle").length,
    ).toBeGreaterThan(50);
    // 4 default markers, each an aria-labelled <g> with at least a pulse ring + dot.
    const markerGroup = svg.querySelectorAll(":scope > g")[1];
    expect(markerGroup.querySelectorAll(":scope > g")).toHaveLength(4);
  });

  it("supports custom markers with pulse disabled and a custom overlay renderer", () => {
    const { host } = render(
      dottedMap({
        markers: [
          {
            latitude: 48.8566,
            longitude: 2.3522,
            label: "Paris",
            pulse: false,
          },
          {
            latitude: 1.3521,
            longitude: 103.8198,
            label: "Singapore",
            renderOverlay: () =>
              ({
                img: null,
                src: "avatar.png",
                alt: "Team member",
              }) as DomphyElement,
          },
        ],
      }) as DomphyElement,
    );
    const labels = Array.from(host.querySelectorAll("g[aria-label]")).map(
      (el) => el.getAttribute("aria-label"),
    );
    expect(labels).toEqual(["Paris", "Singapore"]);
    expect(host.querySelector("foreignObject img")).toBeTruthy();
  });

  it("respects custom width/height/columns without throwing", () => {
    const { host } = render(
      dottedMap({ width: 60, height: 30, columns: 30 }) as DomphyElement,
    );
    const svg = host.querySelector("svg") as SVGSVGElement;
    expect(svg.getAttribute("viewBox")).toBe("0 0 60 30");
  });
});
