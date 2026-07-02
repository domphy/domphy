// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { auroraBackground } from "../../../src/aceternity/backgrounds/auroraBackground.ts";

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

describe("auroraBackground", () => {
  it("renders a working demo tree with zero args: drifting layer + vignette + default content, dark surface tone", () => {
    const { host, node } = render(auroraBackground() as DomphyElement);
    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.getAttribute("data-tone")).toBe("shift-15");
    // aurora plane wrapper + vignette overlay + content wrapper.
    expect(wrapper.children.length).toBe(3);
    expect(wrapper.textContent).toContain("Aurora Background");
    expect(node.generateCSS()).toContain("@keyframes");
  });

  it("omits the vignette when showRadialGradient is false and accepts custom children/variant", () => {
    const { host } = render(
      auroraBackground({ showRadialGradient: false, variant: "light", children: { span: "Custom" } }) as DomphyElement,
    );
    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper.getAttribute("data-tone")).toBe("shift-1");
    // aurora plane wrapper + content wrapper only.
    expect(wrapper.children.length).toBe(2);
    expect(wrapper.textContent).toContain("Custom");
  });
});
