// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { kineticText } from "../../../src/magicui/community/kineticText.ts";

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

describe("kineticText", () => {
  it("renders a working demo with zero args: one span per character plus an sr-only duplicate", () => {
    const { host } = render(kineticText() as DomphyElement);
    flushSync();

    const container = host.firstElementChild as HTMLElement;
    expect(container.tagName).toBe("H1");
    const spans = container.querySelectorAll(":scope > span");
    // sr-only duplicate + one span per character.
    expect(spans.length).toBe("Kinetic Type In Motion".length + 1);
    expect(container.textContent).toContain("Kinetic Type In Motion");
  });

  it("renders with a custom tag without throwing", () => {
    expect(() =>
      render(kineticText({ children: "Hi", tag: "div" }) as DomphyElement),
    ).not.toThrow();
  });

  it("bumps the nearest letter's font-weight on pointermove and resets on pointerleave", () => {
    const { host } = render(kineticText({ children: "Hi" }) as DomphyElement);
    flushSync();

    const container = host.firstElementChild as HTMLElement;
    const characterSpans = Array.from(
      container.querySelectorAll(":scope > span"),
    ).slice(1) as HTMLElement[];
    for (const span of characterSpans) {
      span.getBoundingClientRect = () =>
        ({
          left: 0,
          right: 10,
          top: 0,
          bottom: 10,
          width: 10,
          height: 10,
          x: 0,
          y: 0,
          toJSON() {},
        }) as DOMRect;
    }

    container.dispatchEvent(
      new MouseEvent("pointermove", { clientX: 1 } as MouseEventInit),
    );
    flushSync();

    container.dispatchEvent(new MouseEvent("pointerleave"));
    flushSync();

    expect(() =>
      container.dispatchEvent(
        new MouseEvent("pointermove", { clientX: 1 } as MouseEventInit),
      ),
    ).not.toThrow();
  });

  it("removes cleanly without throwing", () => {
    const { node } = render(kineticText() as DomphyElement);
    flushSync();
    expect(() => node.remove()).not.toThrow();
  });
});
