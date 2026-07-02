// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { compareSlider } from "../../../src/aceternity/layout/compareSlider.ts";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

/** Reads a CSS property from the auto-generated CSS-in-JS rule scoped to
 * `element`'s class token — reactive style properties are applied by
 * mutating that rule's `CSSStyleDeclaration`, not an inline `style` attr. */
function styleOf(element: Element, property: string): string | undefined {
  for (const sheet of Array.from(document.styleSheets)) {
    for (const rule of Array.from(sheet.cssRules)) {
      const styleRule = rule as CSSStyleRule;
      if (styleRule.selectorText === `.${element.className}`) {
        return styleRule.style.getPropertyValue(property);
      }
    }
  }
  return undefined;
}

afterEach(() => {
  document.body.innerHTML = "";
  document.head.querySelectorAll("style").forEach((styleElement) => styleElement.remove());
});

describe("compareSlider", () => {
  it("renders a working demo tree with zero args: placeholder before/after panels, a divider, and a handle at 50%", () => {
    const { host } = render(compareSlider() as DomphyElement);
    flushSync();

    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper).toBeTruthy();
    // first image, second image (clipped), divider, handle.
    expect(wrapper.children.length).toBe(4);
    const handle = wrapper.querySelector('[role="separator"]') as HTMLElement;
    expect(handle).toBeTruthy();
    expect(handle.getAttribute("aria-valuenow")).toBe("50");
  });

  it("renders real <img> elements and hides the handle when `showHandlebar` is false", () => {
    const { host } = render(
      compareSlider({
        firstImage: "/before.jpg",
        secondImage: "/after.jpg",
        showHandlebar: false,
        initialSliderPercentage: 30,
      }) as DomphyElement,
    );
    flushSync();
    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper.querySelectorAll("img").length).toBe(2);
    expect(wrapper.querySelector('[role="separator"]')).toBeNull();
    const secondImage = wrapper.querySelectorAll("img")[1] as HTMLElement;
    expect(styleOf(secondImage, "clip-path")).toContain("70%");
  });

  it("drag mode updates the divider position on pointerdown without throwing", () => {
    const { host } = render(compareSlider({ slideMode: "drag" }) as DomphyElement);
    flushSync();
    const wrapper = host.firstElementChild as HTMLElement;
    wrapper.getBoundingClientRect = () => ({ left: 0, right: 200, top: 0, bottom: 100, width: 200, height: 100, x: 0, y: 0, toJSON: () => {} }) as DOMRect;
    expect(() =>
      wrapper.dispatchEvent(new MouseEvent("pointerdown", { clientX: 50, bubbles: true }) as unknown as PointerEvent),
    ).not.toThrow();
    flushSync();
  });

  it("removes cleanly without throwing (autoplay enabled)", () => {
    const { node } = render(compareSlider({ autoplay: true, autoplayDuration: 500 }) as DomphyElement);
    flushSync();
    expect(() => node.remove()).not.toThrow();
  });
});
