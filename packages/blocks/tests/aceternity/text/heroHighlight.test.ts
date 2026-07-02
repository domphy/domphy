// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { heroHighlight, heroHighlightMark } from "../../../src/aceternity/text/heroHighlight.ts";

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

describe("heroHighlight", () => {
  it("renders a working demo with zero args: two dot layers plus a headline with a marked phrase", () => {
    const { host } = render(heroHighlight() as DomphyElement);
    flushSync();

    const section = host.firstElementChild as HTMLElement;
    expect(section.tagName).toBe("SECTION");
    expect(section.children.length).toBe(3); // base dot layer, spotlight dot layer, content wrapper
    expect(section.textContent).toContain("actually love");
    expect(section.querySelector("h1")).toBeTruthy();
  });

  it("tracks pointermove by writing CSS custom properties on the section", () => {
    const { host } = render(heroHighlight() as DomphyElement);
    flushSync();
    const section = host.firstElementChild as HTMLElement;

    // jsdom returns a zero-size bounding rect, but the handler must not throw.
    expect(() =>
      section.dispatchEvent(new MouseEvent("pointermove", { clientX: 40, clientY: 20, bubbles: true })),
    ).not.toThrow();
    expect(section.style.getPropertyValue("--hero-highlight-x")).toBe("50%");
  });

  it("accepts custom children and class names", () => {
    const { host } = render(
      heroHighlight({ containerClassName: "custom-hero", className: "custom-inner", children: { p: "Custom hero copy" } }) as DomphyElement,
    );
    const section = host.firstElementChild as HTMLElement;
    expect(section.className).toContain("custom-hero");
    expect(section.textContent).toContain("Custom hero copy");
  });

  it("removes cleanly without throwing", () => {
    const { node } = render(heroHighlight() as DomphyElement);
    flushSync();
    expect(() => node.remove()).not.toThrow();
  });
});

describe("heroHighlightMark", () => {
  it("renders a bar layer behind the marked text", () => {
    const { host } = render(heroHighlightMark({ children: "highlighted" }) as DomphyElement);
    flushSync();
    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper.tagName).toBe("SPAN");
    expect(wrapper.children.length).toBe(2); // bar layer + text layer
    expect(wrapper.textContent).toBe("highlighted");
  });
});
