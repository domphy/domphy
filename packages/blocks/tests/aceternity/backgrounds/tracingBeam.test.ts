// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { tracingBeam } from "../../../src/aceternity/backgrounds/tracingBeam.ts";

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

describe("tracingBeam", () => {
  it("renders a working demo tree with zero args: a sticky beam column beside a default demo article", () => {
    const { host } = render(tracingBeam() as DomphyElement);
    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.children.length).toBe(2);

    const svg = wrapper.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg!.querySelectorAll("path").length).toBe(2);
    expect(svg!.querySelector("circle")).toBeTruthy(); // marker, on by default
    expect(wrapper.textContent).toContain("Tracing Beam");
  });

  it("omits the marker when showMarker is false and accepts custom children", () => {
    const { host } = render(tracingBeam({ showMarker: false, children: { p: "Custom long-form content" } }) as DomphyElement);
    const wrapper = host.firstElementChild as HTMLElement;
    const svg = wrapper.querySelector("svg")!;
    expect(svg.querySelector("circle")).toBeNull();
    expect(wrapper.textContent).toContain("Custom long-form content");
  });
});
