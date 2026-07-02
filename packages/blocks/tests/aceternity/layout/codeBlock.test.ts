// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { codeBlock } from "../../../src/aceternity/layout/codeBlock.ts";

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
  document.head.querySelectorAll("style").forEach((styleElement) => styleElement.remove());
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("codeBlock", () => {
  it("renders a working demo tree with zero args: two tabs, a copy button, and a line-numbered body", () => {
    const { host } = render(codeBlock() as DomphyElement);
    flushSync();

    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.getAttribute("data-tone")).toBe("shift-17");
    expect(wrapper.textContent).toContain("greet.ts");
    expect(wrapper.textContent).toContain("index.ts");

    const pre = wrapper.querySelector("pre");
    expect(pre).toBeTruthy();
    const lineRows = pre!.querySelectorAll(":scope > code > span");
    expect(lineRows.length).toBe(5); // active tab (greet.ts) has 5 source lines
  });

  it("switches the visible code when a non-active tab is clicked", () => {
    const { host } = render(codeBlock() as DomphyElement);
    flushSync();

    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper.querySelector("pre")!.textContent).toContain("greet");

    const buttons = wrapper.querySelectorAll("button");
    const indexTabButton = Array.from(buttons).find((button) => button.textContent?.includes("index.ts"))!;
    indexTabButton.click();
    flushSync();

    expect(wrapper.querySelector("pre")!.textContent).toContain('greet("Domphy")');
  });

  it("copies the active tab's code and shows/reverts the checkmark feedback", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

    const { host } = render(codeBlock({ code: "const x = 1;", filename: "a.ts" }) as DomphyElement);
    flushSync();

    const wrapper = host.firstElementChild as HTMLElement;
    const copyButton = wrapper.querySelector('button[aria-label="Copy code"]') as HTMLButtonElement;
    const icons = copyButton.querySelectorAll(":scope > span");
    expect(displayOf(icons[0])).toBe("flex"); // copy glyph visible
    expect(displayOf(icons[1])).toBe("none"); // check glyph hidden

    copyButton.click();
    await Promise.resolve();
    await Promise.resolve();
    flushSync();

    expect(writeText).toHaveBeenCalledWith("const x = 1;");
    expect(displayOf(icons[0])).toBe("none");
    expect(displayOf(icons[1])).toBe("flex");

    vi.advanceTimersByTime(2100);
    flushSync();
    expect(displayOf(icons[0])).toBe("flex");
    expect(displayOf(icons[1])).toBe("none");
  });

  it("removes cleanly without throwing", () => {
    const { node } = render(codeBlock() as DomphyElement);
    flushSync();
    expect(() => node.remove()).not.toThrow();
  });
});
