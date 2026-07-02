// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { spotlightDual } from "../../../src/aceternity/backgrounds/spotlightDual.ts";

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

describe("spotlightDual", () => {
  it("renders a working demo tree with zero args: two mirrored spotlight groups of three layers each, plus default content", () => {
    const { host, node } = render(spotlightDual() as DomphyElement);
    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.getAttribute("data-tone")).toBe("shift-15");
    expect(wrapper.children.length).toBe(3); // left group, right group, content wrapper

    const [leftGroup, rightGroup] = Array.from(wrapper.children) as HTMLElement[];
    expect(leftGroup.children.length).toBe(3);
    expect(rightGroup.children.length).toBe(3);
    expect(wrapper.textContent).toContain("Spotlight");
    expect(node.generateCSS()).toContain("@keyframes");
  });

  it("accepts custom children and sway tuning", () => {
    const { host } = render(spotlightDual({ xOffset: 20, duration: 3, children: { span: "Custom overlay" } }) as DomphyElement);
    expect(host.textContent).toContain("Custom overlay");
  });
});
