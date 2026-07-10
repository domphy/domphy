// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { orbitingCircles } from "../../../src/magicui/core/orbitingCircles.ts";

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

describe("orbitingCircles", () => {
  it("renders a working demo tree with zero args: a hub, 6 orbiting items, and the guide path", () => {
    const { host } = render(orbitingCircles() as DomphyElement);
    const container = host.firstElementChild as HTMLElement;
    expect(container).toBeTruthy();
    expect(container.getAttribute("role")).toBe("img");
    // path guide + center hub + 6 orbiting items = 8 direct children.
    expect(container.children.length).toBe(8);
  });

  it("omits the guide path and center hub when disabled", () => {
    const { host } = render(
      orbitingCircles({ path: false, center: null }) as DomphyElement,
    );
    const container = host.firstElementChild as HTMLElement;
    expect(container.children.length).toBe(6);
  });

  it("accepts custom items and reverses direction", () => {
    const items = [
      { content: { span: "A" } },
      { content: { span: "B" }, delay: 2 },
    ];
    const { host } = render(
      orbitingCircles({ items, reverse: true, radius: 80 }) as DomphyElement,
    );
    expect(host.textContent).toContain("A");
    expect(host.textContent).toContain("B");
  });
});
