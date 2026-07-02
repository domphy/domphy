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
    expect(container.tagName).toBe("SPAN");
    const characterSpans = container.querySelectorAll(":scope > span");
    expect(characterSpans).toHaveLength(Array.from("Hover to Decode").length);
    // Space characters render as U+00A0 (non-breaking space) so their spans
    // don't collapse away, matching `spinningText`'s same idiom elsewhere in
    // this package — normalize before comparing.
    expect(container.textContent?.replace(/ /g, " ")).toBe("Hover to Decode");
  });

  it("scrambles then resolves back to the true text on hover", () => {
    vi.useFakeTimers();
    const { host } = render(hyperText({ children: "Hi", duration: 200, hoverTrigger: true }) as DomphyElement);
    flushSync();

    const container = host.firstElementChild as HTMLElement;
    container.dispatchEvent(new Event("mouseenter"));
    vi.advanceTimersByTime(200);
    flushSync();

    expect(container.textContent).toBe("Hi");
  });

  it("renders with a custom tag without throwing", () => {
    expect(() => render(hyperText({ children: "Div Tag", tag: "div" }) as DomphyElement)).not.toThrow();
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
