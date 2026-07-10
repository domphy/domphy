// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { animatedThemeToggler } from "../../../src/magicui/effects/animatedThemeToggler.ts";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

/** Reads the `display` value from the auto-generated CSS-in-JS rule scoped
 * to `element`'s class token — reactive style properties are applied by
 * mutating that rule's `CSSStyleDeclaration`, not an inline `style` attr. */
function displayOf(element: Element): string | undefined {
  for (const sheet of Array.from(document.styleSheets)) {
    for (const rule of Array.from(sheet.cssRules)) {
      const styleRule = rule as CSSStyleRule;
      if (styleRule.selectorText === `.${element.className}`) {
        return styleRule.style.display;
      }
    }
  }
  return undefined;
}

afterEach(() => {
  document.body.innerHTML = "";
  // The CSS-in-JS engine content-hashes class tokens and shares the single
  // `<style>` sheet across renders, so a stale rule from a previous test can
  // otherwise be reused (and its reactive display checked here) by a later
  // test with an identical style shape. Clear it between tests for isolation.
  document.head
    .querySelectorAll("style")
    .forEach((styleElement) => styleElement.remove());
});

describe("animatedThemeToggler", () => {
  it("renders a working demo button with a sun icon visible and a moon icon hidden", () => {
    const { host } = render(animatedThemeToggler() as DomphyElement);
    flushSync();
    const button = host.querySelector("button");
    expect(button).toBeTruthy();
    expect(button!.getAttribute("aria-label")).toBe("Toggle theme");
    const icons = button!.querySelectorAll(":scope > span");
    expect(icons).toHaveLength(2);
    expect(displayOf(icons[0])).toBe("flex");
    expect(displayOf(icons[1])).toBe("none");
  });

  it("falls back to an instant theme swap on click when View Transitions are unsupported (jsdom)", () => {
    let reportedTheme: string | null = null;
    const { host } = render(
      animatedThemeToggler({
        onThemeChange: (nextTheme) => {
          reportedTheme = nextTheme;
        },
      }) as DomphyElement,
    );
    flushSync();
    const button = host.querySelector("button") as HTMLButtonElement;
    button.click();
    flushSync();
    expect(reportedTheme).toBe("dark");
    const icons = button.querySelectorAll(":scope > span");
    expect(displayOf(icons[0])).toBe("none");
    expect(displayOf(icons[1])).toBe("flex");
  });

  it("writes through to an externally-supplied State so the caller's own store stays in sync", () => {
    const themeState = toState<"light" | "dark">("light");
    const { host } = render(
      animatedThemeToggler({ theme: themeState }) as DomphyElement,
    );
    flushSync();
    const button = host.querySelector("button") as HTMLButtonElement;
    button.click();
    expect(themeState.get()).toBe("dark");
  });

  it("removes cleanly without throwing", () => {
    const { node } = render(animatedThemeToggler() as DomphyElement);
    flushSync();
    expect(() => node.remove()).not.toThrow();
  });
});
