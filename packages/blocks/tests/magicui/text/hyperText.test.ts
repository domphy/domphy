// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { hyperText } from "../../../src/magicui/text/hyperText.ts";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("hyperText", () => {
  it("renders a working demo with zero args: one span per character, spaces preserved", () => {
    const { host } = render(hyperText() as DomphyElement);
    flushSync();

    const container = host.firstElementChild as HTMLElement;
    // Default container tag is "div", matching upstream's `as: Component = "div"`.
    expect(container.tagName).toBe("DIV");
    const characterSpans = container.querySelectorAll(":scope > span");
    expect(characterSpans).toHaveLength(Array.from("Hover to Decode").length);
    // Space cells render as a literal " " character (fixed-width via CSS,
    // not a non-breaking space), so no normalization is needed here. Upstream
    // renders every letter via `letter.toUpperCase()`, so the initial glyphs
    // (before any scramble runs) read uppercase too.
    expect(container.textContent).toBe("HOVER TO DECODE");
  });

  it("scrambles then resolves back to the true text on hover", () => {
    vi.useFakeTimers();
    const { host } = render(
      hyperText({
        children: "Hi",
        duration: 200,
        hoverTrigger: true,
      }) as DomphyElement,
    );
    flushSync();

    const container = host.firstElementChild as HTMLElement;
    container.dispatchEvent(new Event("mouseenter"));
    vi.advanceTimersByTime(200);
    flushSync();

    expect(container.textContent).toBe("HI");
  });

  it("renders with a custom tag without throwing", () => {
    expect(() =>
      render(hyperText({ children: "Div Tag", tag: "div" }) as DomphyElement),
    ).not.toThrow();
  });

  it("removes cleanly without throwing", () => {
    vi.useFakeTimers();
    const { host, node } = render(hyperText() as DomphyElement);
    flushSync();
    const container = host.firstElementChild as HTMLElement;
    container.dispatchEvent(new Event("mouseenter"));
    expect(() => node.remove()).not.toThrow();
  });
});
