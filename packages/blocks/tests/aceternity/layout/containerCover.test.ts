// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { containerCover } from "../../../src/aceternity/layout/containerCover.ts";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

/** Reads the `opacity` value from the auto-generated CSS-in-JS rule scoped
 * to `element`'s class token — reactive style properties are applied by
 * mutating that rule's `CSSStyleDeclaration`, not an inline `style` attr. */
function opacityOf(element: Element): string | undefined {
  for (const sheet of Array.from(document.styleSheets)) {
    for (const rule of Array.from(sheet.cssRules)) {
      const styleRule = rule as CSSStyleRule;
      if (styleRule.selectorText === `.${element.className}`) {
        return styleRule.style.opacity;
      }
    }
  }
  return undefined;
}

afterEach(() => {
  document.body.innerHTML = "";
  document.head.querySelectorAll("style").forEach((styleElement) => styleElement.remove());
  vi.useRealTimers();
});

describe("containerCover", () => {
  it("renders a working demo tree with zero args: a hover panel with beams/sparkles/edge-lines behind the default text", () => {
    const { host } = render(containerCover() as DomphyElement);
    flushSync();

    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.tagName).toBe("SPAN");
    expect(wrapper.textContent).toContain("Domphy");

    const panel = wrapper.firstElementChild as HTMLElement;
    expect(panel.getAttribute("data-tone")).toBe("shift-17");
    // 4 default beam strips + at least 1 seeded sparkle svg + 2 edge glow lines.
    expect(panel.querySelectorAll(":scope > div:first-child > div").length).toBe(4);
    expect(panel.querySelectorAll("svg").length).toBeGreaterThanOrEqual(1);
  });

  it("respects custom children, beamCount, sparkleCount, and alwaysOn without throwing", () => {
    const { host } = render(
      containerCover({
        children: "Warp",
        beamCount: 2,
        sparkleCount: 3,
        alwaysOn: true,
      }) as DomphyElement,
    );
    flushSync();

    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper.textContent).toContain("Warp");
    const panel = wrapper.firstElementChild as HTMLElement;
    expect(panel.querySelectorAll(":scope > div:first-child > div").length).toBe(2);
    expect(opacityOf(panel)).toBe("1");
  });

  it("removes cleanly and stops the sparkle spawner", () => {
    vi.useFakeTimers();
    const { host, node } = render(containerCover({ sparkleCount: 3 }) as DomphyElement);
    flushSync();
    node.remove();
    expect(() => vi.advanceTimersByTime(3000)).not.toThrow();
    expect(host.children.length).toBe(0);
  });
});
