// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { card3D } from "../../../src/aceternity/cards/card3D.ts";

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

describe("card3D", () => {
  it("renders a working demo with zero arguments: perspective wrapper > card body > 4 depth layers", () => {
    const { host, node } = render(card3D() as DomphyElement);
    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(node.generateCSS()).toContain("perspective: 900px");

    const cardBody = wrapper.firstElementChild as HTMLElement;
    expect(cardBody.getAttribute("data-tone")).toBe("shift-15");
    expect(cardBody.children).toHaveLength(4);
    expect(wrapper.textContent).toContain("Aceternity Cards");
  });

  it("tracks pointermove into a live rotateX/rotateY transform and resets on pointerleave", () => {
    const { host } = render(card3D({ maxRotateDegrees: 10 }) as DomphyElement);
    const wrapper = host.firstElementChild as HTMLElement;
    const cardBody = wrapper.firstElementChild as HTMLElement;

    Object.defineProperty(wrapper, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100 }),
    });

    wrapper.dispatchEvent(
      new MouseEvent("pointermove", { clientX: 200, clientY: 0, bubbles: true }) as PointerEvent,
    );
    expect(cardBody.style.transform).toContain("rotateY");
    expect(cardBody.style.transition).toBe("none");

    wrapper.dispatchEvent(new MouseEvent("pointerleave", { bubbles: true }));
    expect(cardBody.style.transform).toBe("rotateX(0deg) rotateY(0deg)");
  });

  it("accepts custom items with per-item depth without throwing", () => {
    expect(() =>
      render(
        card3D({
          items: [
            { content: { p: "Custom" } as DomphyElement, depth: { z: 40, rotateZ: 3 } },
          ],
        }) as DomphyElement,
      ),
    ).not.toThrow();
  });
});
