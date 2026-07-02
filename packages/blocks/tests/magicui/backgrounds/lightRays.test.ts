// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { lightRays } from "../../../src/magicui/backgrounds/lightRays.ts";

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

describe("lightRays", () => {
  it("renders a working demo tree with zero args: a dark panel with two glows and seven rays", () => {
    const { host, node } = render(lightRays() as DomphyElement);
    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.getAttribute("data-tone")).toBe("shift-15");

    const raysAndGlows = wrapper.querySelectorAll(':scope > div[aria-hidden="true"]');
    // 2 glow blobs + 7 default rays.
    expect(raysAndGlows.length).toBe(9);
    expect(node.generateCSS()).toContain("@keyframes");
  });

  it("renders `count` rays and accepts custom content via children", () => {
    const { host } = render(lightRays({ count: 3, children: { span: "Custom overlay" } }) as DomphyElement);
    expect(host.textContent).toContain("Custom overlay");
    const wrapper = host.firstElementChild as HTMLElement;
    const raysAndGlows = wrapper.querySelectorAll(':scope > div[aria-hidden="true"]');
    expect(raysAndGlows.length).toBe(5); // 2 glows + 3 rays
  });
});
