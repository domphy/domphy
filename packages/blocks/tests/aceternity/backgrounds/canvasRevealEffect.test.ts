// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, toState } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { canvasRevealEffect } from "../../../src/aceternity/backgrounds/canvasRevealEffect.ts";

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

describe("canvasRevealEffect", () => {
  it("renders a working demo tree with zero args: a canvas, a vignette overlay, and a default demo card", () => {
    const { host } = render(canvasRevealEffect() as DomphyElement);
    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.getAttribute("data-tone")).toBe("shift-15");
    expect(wrapper.querySelector("canvas")).toBeTruthy();
    expect(wrapper.textContent).toContain("Canvas Reveal Effect");
  });

  it("accepts custom children, disabling the vignette, and a programmatic `active` state", () => {
    const active = toState(true);
    const { host } = render(
      canvasRevealEffect({ showVignette: false, active, children: { span: "Custom overlay" } }) as DomphyElement,
    );
    const wrapper = host.firstElementChild as HTMLElement;
    // canvas + content wrapper only — no vignette div.
    expect(wrapper.children.length).toBe(2);
    expect(wrapper.textContent).toContain("Custom overlay");
  });
});
