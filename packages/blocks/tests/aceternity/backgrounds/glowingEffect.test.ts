// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { glowingEffect } from "../../../src/aceternity/backgrounds/glowingEffect.ts";

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

describe("glowingEffect", () => {
  it("renders a working demo card with zero args: a glow ring layer plus default card content", () => {
    const { host } = render(glowingEffect() as DomphyElement);
    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.children.length).toBe(2);
    expect(wrapper.textContent).toContain("Glowing Effect");
  });

  it("moving the pointer near the card raises the glow layer's angle CSS variable", () => {
    const { host } = render(glowingEffect({ proximity: 200, inactiveZone: 0.1 }) as DomphyElement);
    const wrapper = host.firstElementChild as HTMLElement;
    const glowLayer = wrapper.firstElementChild as HTMLElement;
    Object.defineProperty(wrapper, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, right: 200, bottom: 100, width: 200, height: 100 }),
    });
    document.dispatchEvent(new MouseEvent("pointermove", { clientX: 300, clientY: 50 }));
    expect(glowLayer.style.getPropertyValue("--glowing-effect-angle")).not.toBe("");
  });

  it("accepts custom children and the `disabled` toggle without throwing", () => {
    const { host } = render(glowingEffect({ disabled: true, children: { span: "Custom body" } }) as DomphyElement);
    expect(host.textContent).toContain("Custom body");
  });
});
