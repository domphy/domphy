// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { spinningText } from "../../../src/magicui/text/spinningText.ts";

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

describe("spinningText", () => {
  it("renders a working demo with zero args: an accessible wrapper around a spinning character ring", () => {
    const { host } = render(spinningText() as DomphyElement);
    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.getAttribute("role")).toBe("img");
    expect(wrapper.getAttribute("aria-label")).toBe("learn more");

    const ring = wrapper.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(ring).toBeTruthy();
    // The default "learn more • " unit is repeated until the ring reads full.
    expect(ring.querySelectorAll(":scope > span").length).toBeGreaterThan(10);
  });

  it("spins in reverse and honors a custom radius/duration without throwing", () => {
    expect(() =>
      render(
        spinningText({
          children: "grow",
          reverse: true,
          duration: 6,
          radius: 8,
        }) as DomphyElement,
      ),
    ).not.toThrow();
  });

  it("places every character with its own precomputed rotate+translate transform", () => {
    const { host, node } = render(
      spinningText({ children: "hi", separator: "-" }) as DomphyElement,
    );
    const characters = host.querySelectorAll('[aria-hidden="true"] > span');
    expect(characters.length).toBeGreaterThan(0);
    // Declarative `style:` objects compile to class-based CSS (not inline
    // `style="..."` attributes), so assert against the generated stylesheet.
    const css = node.generateCSS();
    const rotateMatches =
      css.match(/rotate\([^)]+deg\) translate\(0, calc\(/g) ?? [];
    // At least one match per character (the generated stylesheet may also
    // emit vendor-prefixed duplicates of the same `transform` declaration).
    expect(rotateMatches.length).toBeGreaterThanOrEqual(characters.length);
    // Distinct characters land at distinct angles around the circle.
    expect(css).toContain(`rotate(${360 / characters.length}deg)`);
  });
});
