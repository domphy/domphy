// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { blurFade } from "../../../src/magicui/effects/blurFade.ts";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

/** Reads a CSS property from the auto-generated CSS-in-JS rule scoped to
 * `element`'s class token — static `style` object values are compiled into a
 * scoped class rule, not set as an inline `style` attribute. */
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
  vi.useRealTimers();
});

describe("blurFade", () => {
  it("renders a working demo block wrapping its default content", () => {
    const { host } = render(blurFade() as DomphyElement);
    flushSync();
    expect(host.querySelector("h3")?.textContent).toBe("Blur Fade");
    expect(host.querySelector("p")).toBeTruthy();
    const wrapper = host.firstElementChild as HTMLElement;
    expect(styleOf(wrapper, "display")).toBe("block");
  });

  it("passes custom children through unchanged instead of the default demo body", () => {
    const { host } = render(
      blurFade({ children: [{ p: "Custom body" } as DomphyElement] }) as DomphyElement,
    );
    expect(host.textContent).toContain("Custom body");
    expect(host.querySelector("h3")).toBeNull();
  });

  it("triggers the reveal on a delay after mount by default (no throw with fake timers)", () => {
    vi.useFakeTimers();
    const { node } = render(blurFade({ delay: 50 }) as DomphyElement);
    expect(() => vi.advanceTimersByTime(60)).not.toThrow();
    expect(() => node.remove()).not.toThrow();
  });

  it("waits for scroll-into-view when trigger is 'view' (falls open without IntersectionObserver)", () => {
    const originalIntersectionObserver = (globalThis as { IntersectionObserver?: unknown })
      .IntersectionObserver;
    (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = undefined;

    expect(() => render(blurFade({ trigger: "view" }) as DomphyElement)).not.toThrow();

    (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver =
      originalIntersectionObserver;
  });

  it("renders inline-block when inline is set", () => {
    const { host } = render(blurFade({ inline: true }) as DomphyElement);
    flushSync();
    const wrapper = host.firstElementChild as HTMLElement;
    expect(styleOf(wrapper, "display")).toBe("inline-block");
  });
});
